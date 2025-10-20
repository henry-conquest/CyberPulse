import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import passport from 'passport';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { Express, RequestHandler } from 'express';
import { storage } from './storage';
import { parseJwt } from './helper';

// -------------------
// Session setup
// -------------------
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: sessionTtl },
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: 'sessions',
    }),
  });
}

// -------------------
// Setup auth with dynamic per-tenant login
// -------------------
export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Dynamic login route
  app.get('/api/login', async (req, res, next) => {
    const domain = req.query.domain as string;
    if (!domain) return res.status(400).send('Missing domain');

    const tenantApp = await storage.getMicrosoft365ConnectionByDomain(domain);
    if (!tenantApp) return res.redirect(`/login-rejected?message=Unknown tenant domain`);

    const strategyName = `azure-${domain}`;
    if (!passport._strategies[strategyName]) {
      passport.use(
        strategyName,
        new OAuth2Strategy(
          {
            authorizationURL: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`,
            tokenURL: `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
            clientID: tenantApp.clientId,
            clientSecret: tenantApp.clientSecret,
            callbackURL: process.env.REPLIT_REDIRECT_URI!,
          },
          async (accessToken, refreshToken, params, profile, done) => {
            try {
              // 1️⃣ Fetch Microsoft Graph profile
              const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (!graphRes.ok) throw new Error('Failed to fetch profile');
              const userInfo = await graphRes.json();
              const email = userInfo.mail || userInfo.userPrincipalName;

              // 2️⃣ Check if user exists in DB
              const dbUser = await storage.getUserByEmail(email);
              if (!dbUser) {
                console.warn(`🚫 User ${email} not found in DB`);
                return done(null, false, { message: 'User not allowed to log in' });
              }

              // 3️⃣ Check if user is assigned to enterprise app
              try {
                const assignmentsRes = await fetch(`https://graph.microsoft.com/v1.0/me/appRoleAssignments`, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!assignmentsRes.ok) {
                  console.error('❌ Failed to fetch appRoleAssignments:', await assignmentsRes.text());
                  return done(new Error('Failed to verify app assignment'));
                }

                const assignments = await assignmentsRes.json();
                const assigned = assignments.value.some(
                  (a: any) => a.resourceId === process.env.ENTERPRISE_APP_OBJECT_ID
                );
                if (!assigned) {
                  console.warn(`🚫 User ${email} is not assigned to Enterprise App`);
                  return done(null, false, { message: 'User not assigned to this application' });
                }
              } catch (err) {
                return done(err as Error);
              }

              // 4️⃣ Upsert or update user in DB
              await storage.upsertUser({
                id: userInfo.id,
                email,
                firstName: userInfo.givenName,
                lastName: userInfo.surname,
              });

              // 5️⃣ Return user object
              const user = {
                id: userInfo.id,
                email,
                name: userInfo.displayName,
                tenantId: tenantApp.tenantId,
                access_token: accessToken,
                refresh_token: refreshToken,
                role: dbUser.role,
              };

              return done(null, user);
            } catch (err) {
              return done(err as Error);
            }
          }
        )
      );
    }

    passport.authenticate(strategyName, {
      scope: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
      state: domain,
    })(req, res, next);
  });

  // Callback route
  app.get('/auth/callback', (req, res, next) => {
    const domain = req.query.state as string;
    const strategyName = domain ? `azure-${domain}` : null;
    if (!strategyName || !passport._strategies[strategyName]) {
      return res.redirect('/login-failed');
    }

    passport.authenticate(strategyName, { successRedirect: '/', failureRedirect: '/login-failed' })(req, res, next);
  });

  // Logout
  app.get('/api/logout', (req, res) => req.logout(() => res.redirect('/')));

  // Login failed
  app.get('/login-failed', (req, res) => {
    const message = (req.query.message as string) || 'Your login attempt was rejected.';
    res.redirect(`/login-rejected?message=${encodeURIComponent(message)}`);
  });

  // Passport serialize/deserialize
  passport.serializeUser((user: any, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));
}

// -------------------
// Auth middleware
// -------------------
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.access_token) return res.status(401).json({ message: 'Unauthorized' });
  next();
};

export const isAuthorized =
  (allowedRoles: string[]): RequestHandler =>
  async (req, res, next) => {
    try {
      const userId = (req.user as any)?.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(401).json({ message: 'User not found' });
      if (!allowedRoles.includes(user.role)) return res.status(403).json({ message: 'Access denied' });
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Internal error' });
    }
  };

export const requireTenantAccess: RequestHandler = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId || req.params.id;
    const user = req.user as any;
    if (!tenantId || !user) return res.status(400).json({ message: 'Missing tenant or user' });

    const hasAccess = await storage.checkUserTenantExists(user.id, tenantId);
    if (!hasAccess && user.role !== 'admin')
      return res.status(403).json({ message: 'Forbidden: tenant access denied' });
    next();
  } catch (err) {
    console.error(err);
    res.status(403).json({ message: 'Forbidden' });
  }
};
