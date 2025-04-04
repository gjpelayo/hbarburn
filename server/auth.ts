import passport from "passport";
import { Express } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export function setupAuth(app: Express) {
  // Note: Session and passport configuration moved to index.ts
  // The auth routes setup remains here

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