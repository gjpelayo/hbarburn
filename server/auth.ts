import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string | null) {
  if (!stored) return false;
  
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'hedera-token-redemption-secret',
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // only use secure in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // allow cross-site cookies in production
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Admin authentication middleware
  app.post("/api/admin/login", passport.authenticate("local"), (req, res) => {
    if (req.user && req.user.isAdmin) {
      res.status(200).json(req.user);
    } else {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ error: "Error during logout" });
        }
        res.status(403).json({ error: "Access denied. Admin privileges required." });
      });
    }
  });

  app.post("/api/admin/logout", (req, res, next) => {
    // Clear session user data
    if (req.session) {
      req.session.user = undefined;
      req.session.isLoggedIn = false;
    }
    
    // Logout from passport
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/admin/user", (req, res) => {
    // Log the session and authentication status for debugging
    console.log('Session:', req.session);
    console.log('Is authenticated:', req.isAuthenticated());
    console.log('User in session:', req.session.user);
    console.log('User in passport:', req.user);
    
    // First attempt - check if we need to sync from passport to session
    if (req.isAuthenticated() && req.user && (!req.session.user || !req.session.isLoggedIn)) {
      req.session.user = req.user;
      req.session.isLoggedIn = true;
      console.log('Syncing user from passport to session:', req.user.id);
    }
    
    // Second attempt - check if we need to sync from session to passport
    if (!req.isAuthenticated() && req.session.user && req.session.isLoggedIn) {
      console.log('Attempting to login user from session to passport:', req.session.user.id);
      req.login(req.session.user, (err) => {
        if (err) {
          console.error("Error logging in with passport from admin/user endpoint:", err);
        } else {
          console.log('Successfully logged in user from session to passport:', req.session.user?.id);
        }
      });
    }
    
    // Third attempt - check again after potential passport login
    if (req.isAuthenticated() && req.user) {
      // User is authenticated via passport, check admin status
      if (req.user.isAdmin) {
        console.log('Admin access granted via passport for user:', req.user.id);
        return res.json(req.user);
      } else {
        console.log('Admin access denied - user not admin:', req.user.id);
        return res.sendStatus(403); // Forbidden - not an admin
      }
    }
    
    // Fourth attempt - check session if passport still doesn't work
    if (req.session.user && req.session.isLoggedIn) {
      // If user is in session and marked as admin, return them
      if (req.session.user.isAdmin) {
        console.log('Admin access granted via session for user:', req.session.user.id);
        return res.json(req.session.user);
      } else {
        console.log('Admin access denied - session user not admin:', req.session.user.id);
        return res.sendStatus(403); // Forbidden - not an admin
      }
    }
    
    // No authenticated user found
    return res.sendStatus(401);
  });
}