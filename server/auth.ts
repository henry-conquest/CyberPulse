import { Strategy as OIDCStrategy, VerifyCallback } from "passport-openidconnect";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const getOIDCConfig = memoize(() => ({
  issuer: `https://login.microsoftonline.com/${process.env.TENANT_ID}/v2.0`,
  authorizationURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize`,
  tokenURL: `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
  userInfoURL: `https://graph.microsoft.com/oidc/userinfo`,
  clientID: process.env.CLIENT_ID!,
  clientSecret: process.env.CLIENT_SECRET!,
  callbackURL: process.env.LOCAL_REDIRECT_URI!,
  scope: ["openid", "profile", "email", "offline_access"],
}), { maxAge: 3600 * 1000 });

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only secure in prod
      maxAge: sessionTtl,
    },
  });
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.given_name,
    lastName: claims.family_name,
    profileImageUrl: claims.picture || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = getOIDCConfig();

  const strategy = new OIDCStrategy(config, async (
    issuer: any,
    sub: any,
    profile: any,
    accessToken: any,
    refreshToken: any,
    params: any,
    done: VerifyCallback
  ) => {
    const user = {
      id: sub,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 3599,
      claims: {
        sub,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
      },
    };

    await upsertUser({
      sub,
      email: profile.emails?.[0]?.value,
      given_name: profile.name?.givenName,
      family_name: profile.name?.familyName,
      picture: null,
    });

    done(null, user);
  });

  passport.use("azure", strategy);


  passport.serializeUser((user: Express.User, done) => {
  console.log("Serializing user:", user);
  done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
  });


  app.get("/api/login", passport.authenticate("azure"));

  app.get("/auth/callback", passport.authenticate("azure", {
    successRedirect: "/",
    failureRedirect: "/api/login"
  }));

  app.post("/auth/callback", passport.authenticate("azure", {
    successRedirect: "/",
    failureRedirect: "/api/login"
  }));


  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    console.log('is auth: ', req.isAuthenticated())
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) return next();

  if (!user.refresh_token) {
    return res.redirect("/api/login");
  }

  try {
    const config = getOIDCConfig();

    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: config.clientID,
      client_secret: config.clientSecret,
      refresh_token: user.refresh_token,
    });

    const response = await fetch(config.tokenURL, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!response.ok) throw new Error("Token refresh failed");

    const token = await response.json();

    user.access_token = token.access_token;
    user.refresh_token = token.refresh_token || user.refresh_token;
    user.expires_at = Math.floor(Date.now() / 1000) + token.expires_in;

    return next();
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.redirect("/api/login");
  }
};

export const isAuthorized = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.role || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      next();
    } catch (err) {
      console.error("Authorization error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  };
};
