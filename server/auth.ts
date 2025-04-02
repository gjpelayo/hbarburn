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
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
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
    
    // Check both session and passport user
    if (!req.isAuthenticated()) {
      if (req.session.user && req.session.user.isAdmin) {
        // If we have a user in session but not authenticated via passport
        // let's still consider them authenticated
        return res.json(req.session.user);
      }
      return res.sendStatus(401);
    }
    
    if (!req.user.isAdmin) {
      return res.sendStatus(403); // Forbidden - not an admin
    }
    
    res.json(req.user);
  });
}