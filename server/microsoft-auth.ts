import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import session from "express-session";
import { Strategy } from "passport-local";
import * as client from "openid-client";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { 
  generateState, 
  storeState, 
  validateState, 
  getAuthorizationUrl, 
  exchangeCodeForToken, 
  getTenantInfo, 
  storeOAuthConnection 
} from "./microsoft-oauth";
import { UserRoles } from "@shared/schema";

// Setup session store
export function setupSession(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'conquest-session-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  }));
}

// Setup passport
export function setupPassport(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

// Authentication routes
export function setupAuthRoutes(app: Express) {
  // Staff login (admin access)
  app.get('/api/staff-login', (req, res) => {
    try {
      // Generate a state parameter for security
      const state = generateState();
      
      // Store state in session
      const userId = req.user ? (req.user as any).id : 'anonymous';
      storeState(state, userId, process.env.MS_GRAPH_CLIENT_ID, process.env.MS_GRAPH_CLIENT_SECRET, process.env.MS_GRAPH_REDIRECT_URI);
      
      // Set login type in session
      req.session.loginType = 'staff';
      
      // Redirect to Microsoft login
      const authUrl = getAuthorizationUrl(state);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating staff login:', error);
      res.status(500).send('Failed to initiate login. Please try again later.');
    }
  });

  // Customer login (readonly access to their tenant only)
  app.get('/api/customer-login', (req, res) => {
    try {
      // Generate a state parameter for security
      const state = generateState();
      
      // Store state in session
      const userId = req.user ? (req.user as any).id : 'anonymous';
      storeState(state, userId, process.env.MS_GRAPH_CLIENT_ID, process.env.MS_GRAPH_CLIENT_SECRET, process.env.MS_GRAPH_REDIRECT_URI);
      
      // Set login type in session
      req.session.loginType = 'customer';
      
      // Redirect to Microsoft login
      const authUrl = getAuthorizationUrl(state);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error initiating customer login:', error);
      res.status(500).send('Failed to initiate login. Please try again later.');
    }
  });

  // OAuth callback handler
  app.get('/api/callback', async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      // Handle OAuth errors
      if (error) {
        return res.redirect(`/login?error=${encodeURIComponent(error as string)}`);
      }
      
      if (!code || !state) {
        return res.redirect('/login?error=missing_parameters');
      }
      
      // Validate state
      const stateData = validateState(state as string);
      if (!stateData) {
        return res.redirect('/login?error=invalid_state');
      }
      
      // Exchange code for tokens
      const tokens = await exchangeCodeForToken(code as string);
      
      // Get Microsoft tenant info
      const tenantInfo = await getTenantInfo(tokens.access_token);
      
      // Check login type from session
      const loginType = req.session.loginType || 'customer';
      
      // Get or create user
      let user = await storage.getUserByMicrosoftId(stateData.userId);
      
      if (!user) {
        // Parse ID token to get user info
        const idToken = tokens.id_token;
        let userEmail = '';
        let firstName = '';
        let lastName = '';
        let name = '';
        
        if (idToken) {
          try {
            // Decode the token without verification for extraction
            const tokenParts = idToken.split('.');
            if (tokenParts.length >= 2) {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
              userEmail = payload.email || payload.upn || '';
              firstName = payload.given_name || '';
              lastName = payload.family_name || '';
              name = payload.name || '';
            }
          } catch (error) {
            console.error('Error parsing ID token:', error);
          }
        }
        
        // Create new user with appropriate role
        const role = loginType === 'staff' ? UserRoles.ADMIN : UserRoles.READONLY;
        
        user = await storage.createUser({
          id: stateData.userId,
          email: userEmail,
          firstName: firstName || (name ? name.split(' ')[0] : ''),
          lastName: lastName || (name && name.includes(' ') ? name.split(' ').slice(1).join(' ') : ''),
          role,
          microsoftTenantId: tenantInfo.id
        });
      } else {
        // Update existing user's Microsoft tenant ID if needed
        if (!user.microsoftTenantId || user.microsoftTenantId !== tenantInfo.id) {
          await storage.updateUser(user.id, { microsoftTenantId: tenantInfo.id });
        }
        
        // If staff login, ensure user has admin role
        if (loginType === 'staff' && user.role !== UserRoles.ADMIN) {
          await storage.updateUser(user.id, { role: UserRoles.ADMIN });
        }
      }
      
      // Store OAuth connection
      await storeOAuthConnection(
        user.id,
        tenantInfo.id,
        tenantInfo.displayName,
        tenantInfo.domains[0] || '',
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in
      );
      
      // If customer login, check for tenant mapping or create one
      if (loginType === 'customer') {
        const mapping = await storage.getMicrosoftTenantMapping(tenantInfo.id);
        
        if (!mapping) {
          // Create new tenant
          const tenant = await storage.createTenant({
            name: tenantInfo.displayName
          });
          
          // Create mapping
          await storage.createMicrosoftTenantMapping({
            microsoftTenantId: tenantInfo.id,
            appTenantId: tenant.id,
            tenantName: tenantInfo.displayName,
            domainName: tenantInfo.domains[0] || ''
          });
          
          // Create user-tenant access
          await storage.createUserTenantAccess({
            userId: user.id,
            tenantId: tenant.id,
            role: UserRoles.READONLY
          });
        } else {
          // Check if user has access to this tenant
          const access = await storage.getUserTenantAccess(user.id, mapping.appTenantId);
          
          if (!access) {
            // Create user-tenant access
            await storage.createUserTenantAccess({
              userId: user.id,
              tenantId: mapping.appTenantId,
              role: UserRoles.READONLY
            });
          }
        }
      }
      
      // Login the user
      req.login(user, (err) => {
        if (err) {
          console.error('Error logging in user:', err);
          return res.redirect('/login?error=login_failed');
        }
        
        // Redirect to dashboard
        res.redirect('/dashboard');
      });
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      res.redirect(`/login?error=${encodeURIComponent((error as Error).message || 'Unknown error')}`);
    }
  });

  // Logout
  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Error logging out:', err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.redirect('/login');
      });
    });
  });

  // Get current user
  app.get('/api/auth/user', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Return user without sensitive information
      const userInfo = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImageUrl: user.profileImageUrl
      };
      
      return res.json(userInfo);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: 'Failed to fetch user' });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: 'Unauthorized' });
};

// Middleware to check if user has admin role
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const user = req.user as any;
  if (user.role !== UserRoles.ADMIN) {
    return res.status(403).json({ message: 'Forbidden - Admin access required' });
  }
  
  return next();
};

// Middleware to check if user has access to tenant
export const hasTenantAccess = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const tenantId = req.params.tenantId || req.query.tenantId;
  if (!tenantId) {
    return res.status(400).json({ message: 'Tenant ID is required' });
  }
  
  const user = req.user as any;
  
  // Admin users have access to all tenants
  if (user.role === UserRoles.ADMIN) {
    return next();
  }
  
  // Check if user has access to the specified tenant
  storage.getUserTenantAccess(user.id, Number(tenantId))
    .then(access => {
      if (access) {
        return next();
      }
      return res.status(403).json({ message: 'Forbidden - No access to this tenant' });
    })
    .catch(error => {
      console.error('Error checking tenant access:', error);
      return res.status(500).json({ message: 'Failed to check tenant access' });
    });
};