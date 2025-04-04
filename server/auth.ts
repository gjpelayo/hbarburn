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
  app.set("trust proxy", 1);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'hedera-token-redemption-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,        // Force HTTPS-only cookies
      sameSite: 'none',    // Allow cross-origin cookies
      maxAge: 604800000    // 7 days
    },
    store: storage.sessionStore
  };
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

  // This is the key part - serialization/deserialization needs to handle both wallet and regular users
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id, user.accountId || '(no accountId)');
    if (user.accountId) {
      // For wallet users, serialize the accountId as a string with prefix
      done(null, `wallet:${user.accountId}`);
    } else {
      // For regular users, serialize the numeric ID
      done(null, `id:${user.id}`);
    }
  });
  
  passport.deserializeUser(async (serialized: string, done) => {
    try {
      console.log("Deserializing user from:", serialized);
      
      // Extract the type and value from the serialized string
      const [type, value] = serialized.split(':');
      
      let user;
      if (type === 'wallet') {
        // Handle wallet users - deserialize by accountId
        user = await storage.getUserByAccountId(value);
        console.log("Deserializing wallet user:", value, "Result:", user ? "Found" : "Not found");
      } else if (type === 'id') {
        // Handle regular users - deserialize by ID
        const id = parseInt(value, 10);
        user = await storage.getUser(id);
        console.log("Deserializing ID user:", id, "Result:", user ? "Found" : "Not found");
      } else {
        return done(new Error(`Unknown serialization type: ${type}`));
      }
      
      if (!user) {
        return done(new Error('User not found'));
      }
      
      return done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
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
    console.log('=== ADMIN USER CHECK ===');
    console.log('Request cookies:', req.cookies);
    console.log('Session data:', req.session);
    console.log('Session ID:', req.sessionID);
    console.log('Is authenticated:', req.isAuthenticated());
    console.log('User in session:', req.session.user);
    console.log('User in passport:', req.user);
    
    // SIMPLIFIED USER CHECK - First check for wallet-based authentication
    // If the user is authenticated through a wallet (direct session), respect that
    if (req.session.user && req.session.isLoggedIn) {
      console.log('User authenticated via session.');
      
      // Check for accountId (wallet authentication case)
      if (req.session.user.accountId) {
        console.log('Wallet user found with accountId:', req.session.user.accountId);
        
        // Special case for development - if using a test wallet, grant admin access
        if (process.env.NODE_ENV !== 'production') {
          const accountId = req.session.user.accountId;
          // Check if this is a test wallet (0.0.*)
          if (accountId.match && accountId.match(/^0\.0\.\d+$/)) {
            console.log('✅ Admin access granted in development mode for test wallet:', accountId);
            
            // Create admin user response
            const adminUser = {
              accountId,
              isAdmin: true
            };
            
            // Update session
            req.session.user.isAdmin = true;
            
            // Save updated session
            req.session.save((err) => {
              if (err) {
                console.error('Error saving session:', err);
              } else {
                console.log('Session saved with admin privileges');
              }
            });
            
            return res.json(adminUser);
          }
        }
      }
      
      // Check if marked as admin in session
      if (req.session.user.isAdmin) {
        console.log('✅ Admin access granted via session');
        return res.json(req.session.user);
      }
      
      // Not an admin
      console.log('❌ Admin access denied - session user not admin');
      return res.sendStatus(403); // Forbidden - not an admin
    }
    
    // If no session user, check passport authentication
    if (req.isAuthenticated() && req.user) {
      console.log('User authenticated via passport. User ID:', req.user.id);
      
      // User is authenticated via passport, check admin status
      if (req.user.isAdmin) {
        console.log('✅ Admin access granted via passport for user:', req.user.id);
        
        // Sync to session
        req.session.user = req.user;
        req.session.isLoggedIn = true;
        
        return res.json(req.user);
      } else {
        console.log('❌ Admin access denied - passport user not admin:', req.user.id);
        return res.sendStatus(403); // Forbidden - not an admin
      }
    }
    
    // No authenticated user found
    console.log('❌ No authenticated user found');
    return res.sendStatus(401);
  });
}