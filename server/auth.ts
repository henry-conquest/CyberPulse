import { Strategy as OIDCStrategy, VerifyCallback } from 'passport-openidconnect';
import type { Express, RequestHandler } from 'express';
import memoize from 'memoizee';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import passport from 'passport';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

const getOIDCConfig = memoize(
  () => ({
    issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
    authorizationURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize`,
    tokenURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    userInfoURL: `https://graph.microsoft.com/oidc/userinfo`,
    clientID: process.env.CLIENT_ID!,
    clientSecret: process.env.CLIENT_SECRET!,
    callbackURL: process.env.REPLIT_REDIRECT_URI!,
    scope: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
  }),
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: 'sessions',
    }),
  });
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims.id,
    email: claims.email,
    firstName: claims.given_name,
    lastName: claims.family_name,
    profileImageUrl: claims.picture || null,
  });
}

export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    'azure',
    new OAuth2Strategy(
      {
        authorizationURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize`,
        tokenURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
        clientID: process.env.CLIENT_ID!,
        clientSecret: process.env.CLIENT_SECRET!,
        callbackURL: process.env.REPLIT_REDIRECT_URI!,
        scope: ['openid', 'profile', 'email', 'offline_access', 'User.Read'].join(' '),
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!graphRes.ok) {
            console.error('❌ Failed to fetch Microsoft Graph profile:', await graphRes.text());
            return done(new Error('Failed to fetch Microsoft Graph profile'));
          }

          const userInfo = await graphRes.json();
          console.log('📦 Microsoft Graph profile:', userInfo);

          const user = {
            id: userInfo.id,
            email: userInfo.mail || userInfo.userPrincipalName,
            name: userInfo.displayName,
            firstName: userInfo.givenName,
            lastName: userInfo.surname,
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: Math.floor(Date.now() / 1000) + (params.expires_in ?? 3599),
          };

          await storage.upsertUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImageUrl: null,
          });

          done(null, user);
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  app.get('/api/login', passport.authenticate('azure'));

  app.get(
    '/auth/callback',
    passport.authenticate('azure', {
      successRedirect: '/',
      failureRedirect: '/api/login',
    })
  );

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    console.log('is auth: ', req.isAuthenticated());
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) return next();

  if (!user.refresh_token) {
    return res.redirect('/api/login');
  }

  try {
    const config = getOIDCConfig();

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientID,
      client_secret: config.clientSecret,
      refresh_token: user.refresh_token,
    });

    const response = await fetch(config.tokenURL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const token = await response.json();

    user.access_token = token.access_token;
    user.refresh_token = token.refresh_token || user.refresh_token;
    user.expires_at = Math.floor(Date.now() / 1000) + token.expires_in;

    return next();
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.redirect('/api/login');
  }
};

export const isAuthorized = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.role || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch (err) {
      console.error('Authorization error:', err);
      res.status(500).json({ message: 'Internal error' });
    }
  };
};
