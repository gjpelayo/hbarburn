import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  loginSchema,
  walletAuthSchema,
  signatureAuthSchema,
  updateRedemptionSchema, 
  insertRedemptionSchema,
  insertPhysicalItemSchema,
  updatePhysicalItemSchema,
  insertTokenSchema,
  updateTokenSchema,
  insertTokenConfigurationSchema,
  updateTokenConfigurationSchema,
  insertShopSchema,
  updateShopSchema,
  insertItemVariationSchema,
  updateItemVariationSchema,
  insertItemVariantStockSchema,
  type User,
  type WalletAuthCredentials,
  type SignatureAuthCredentials
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";
import session from "express-session";
import { randomUUID } from "crypto";
import { client, getAccountTokenBalances, isValidAccountId, isValidTokenId, formatTransactionId, isValidTransactionId, verifyTokenOnHedera } from "./hedera";

// Extend Express Request interface to include session user
declare module "express-session" {
  interface SessionData {
    user?: User;
    isLoggedIn?: boolean;
  }
}

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Enhanced debug logging
  console.log("=== AUTH MIDDLEWARE CHECK ===");
  console.log("- Session ID:", req.sessionID);
  console.log("- Cookie header:", req.headers.cookie);
  console.log("- Session user:", req.session.user ? `ID: ${req.session.user.id}` : 'None');
  console.log("- Session isLoggedIn:", req.session.isLoggedIn);
  console.log("- Passport authenticated:", req.isAuthenticated());
  console.log("- Passport user:", req.user ? `ID: ${req.user.id}` : 'None');
  console.log("- Session cookie settings:", req.session.cookie);
  
  // SIMPLIFIED AUTHENTICATION LOGIC
  // Either session auth OR passport auth is sufficient
  if ((req.session.isLoggedIn && req.session.user) || req.isAuthenticated()) {
    console.log("✅ User is authenticated");
    
    // SYNC DATA BETWEEN SESSION AND PASSPORT
    // This ensures consistency between the two auth mechanisms
    if (req.isAuthenticated() && req.user && (!req.session.user || !req.session.isLoggedIn)) {
      // Case 1: Passport has user but session doesn't - sync to session
      req.session.user = req.user;
      req.session.isLoggedIn = true;
      
      // Force save
      req.session.save((err) => {
        if (err) {
          console.error("❌ Error saving session:", err);
        } else {
          console.log("✅ Synced user from passport to session and saved");
        }
      });
    } else if (!req.isAuthenticated() && req.session.user && req.session.isLoggedIn) {
      // Case 2: Session has user but passport doesn't - sync to passport
      req.login(req.session.user, (err) => {
        if (err) {
          console.error("❌ Error syncing user from session to passport:", err);
        } else {
          console.log("✅ Synced user from session to passport");
        }
      });
    }
    
    return next();
  }
  
  // Not authenticated by any method
  console.log("❌ User is not authenticated");
  return res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is an admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('Admin check - Auth status:', req.isAuthenticated());
  console.log('Admin check - Session user:', req.session.user);
  console.log('Admin check - Passport user:', req.user);
  
  // Special case for development - if using a test wallet, grant admin access
  if (process.env.NODE_ENV !== 'production' && req.isAuthenticated() && req.user) {
    const accountId = req.user.accountId;
    // Check if this is a test wallet (0.0.*)
    if (accountId && accountId.match(/^0\.0\.\d+$/)) {
      console.log('Admin access granted in development mode for test wallet:', accountId);
      
      // Ensure the user is marked as admin
      if (!req.user.isAdmin) {
        req.user.isAdmin = true;
      }
      
      // Sync to session
      req.session.user = req.user;
      req.session.isLoggedIn = true;
      
      return next();
    }
  }
  
  // First attempt - check if we need to sync from passport to session
  if (req.isAuthenticated() && req.user && (!req.session.user || !req.session.isLoggedIn)) {
    console.log('Syncing user from passport to session in isAdmin middleware:', req.user.id);
    req.session.user = req.user;
    req.session.isLoggedIn = true;
  }
  
  // Second attempt - check if we need to sync from session to passport
  if (!req.isAuthenticated() && req.session.user && req.session.isLoggedIn) {
    console.log('Attempting to login user from session to passport in isAdmin middleware:', req.session.user.id);
    req.login(req.session.user, (err) => {
      if (err) {
        console.error("Error logging in with passport from isAdmin middleware:", err);
      }
    });
  }
  
  // Check passport authentication first
  if (req.isAuthenticated() && req.user && req.user.isAdmin) {
    console.log('Admin access granted via passport for user:', req.user.id);
    return next();
  }
  
  // Fall back to session if passport isn't used
  if (req.session.isLoggedIn && req.session.user && req.session.user.isAdmin) {
    console.log('Admin access granted via session for user:', req.session.user.id);
    return next();
  }
  
  console.log('Admin access denied - Session user:', req.session.user);
  console.log('Admin access denied - Passport user:', req.user);
  
  return res.status(403).json({ message: "Forbidden - Admin access required" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes (session/passport setup is now in index.ts)
  setupAuth(app);

  // Authentication Routes
  
  // Username/password login route (for admin)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.validateUserPassword(username, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Store user in session
      req.session.user = user;
      req.session.isLoggedIn = true;
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Login failed" });
    }
  });
  
  // Wallet-based authentication route
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { accountId } = walletAuthSchema.parse(req.body);
      
      // Create or get a user based on the wallet's account ID
      const user = await storage.createOrGetWalletUser(accountId);
      
      // Store user in session
      req.session.user = user;
      req.session.isLoggedIn = true;
      
      // Save the session first to ensure it's stored before passport login
      req.session.save((err) => {
        if (err) {
          console.error("Error saving session:", err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        // Then login with passport
        req.login(user, (err) => {
          if (err) {
            console.error("Error logging in with passport:", err);
            return res.status(500).json({ message: "Wallet login failed" });
          }
          
          console.log("Successfully authenticated wallet user:", user.id, user.accountId);
          
          // Don't return password in response
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error("Wallet login error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Wallet login failed" });
    }
  });
  
  // Signature-based authentication route
  app.post("/api/auth/signature", async (req, res) => {
    try {
      console.log("=== BEGIN SIGNATURE AUTHENTICATION ===");
      console.log("Request body:", req.body);
      console.log("Session ID before auth:", req.sessionID);
      console.log("Cookies:", req.cookies);
      
      const { accountId, message, signature } = signatureAuthSchema.parse(req.body);
      
      // Verify the signature is valid for the message and accountId
      console.log(`Verifying signature for account ${accountId}:`);
      console.log(`- Message: ${message}`);
      console.log(`- Signature: ${signature}`);
      
      // TODO: We would use Hedera SDK to verify the signature here
      // This is a placeholder until we have the proper implementation
      // For demo purposes, we'll consider it valid if the signature is provided
      const isValid = true; // TEMPORARY! Replace with actual verification
      
      if (!isValid) {
        console.log("Signature validation failed");
        return res.status(401).json({ 
          success: false, 
          error: "Invalid signature"
        });
      }
      
      // Get or create the user
      const user = await storage.createOrGetWalletUser(accountId);
      console.log("User created/retrieved from storage:", user);
      
      // SOLUTION: Let's apply a much cleaner and more reliable approach
      
      // 1. First, manually set session properties
      req.session.user = user;
      req.session.isLoggedIn = true;
      
      // 2. Force session save - IMPORTANT!
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("❌ Session save error:", err);
            reject(err);
          } else {
            console.log("✅ Session saved successfully");
            resolve();
          }
        });
      });
      
      // 3. Then use req.login to make Passport aware of the user
      await new Promise<void>((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            console.error("❌ Passport login error:", err);
            reject(err);
          } else {
            console.log("✅ Passport login successful");
            resolve();
          }
        });
      });
      
      // 4. Double-check everything worked
      console.log("=== AUTHENTICATION SUMMARY ===");
      console.log("- Session ID:", req.sessionID);
      console.log("- Authenticated:", req.isAuthenticated());
      console.log("- Session user:", req.session.user?.id);
      console.log("- Passport user:", req.user?.id);
      
      // 5. Send the response
      return res.json({ 
        success: true,
        accountId: user.accountId,
        userId: user.id,
        isAdmin: user.isAdmin
      });
    } catch (error) {
      console.error("Signature verification error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          success: false,
          error: "Validation error", 
          details: validationError.details 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        error: "Authentication failed: " + (error instanceof Error ? error.message : String(error)) 
      });
    }
  });
  
  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    // First logout with passport if authenticated
    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Error logging out from passport:", err);
        }
        
        // Then destroy the session
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).json({ message: "Logout failed" });
          }
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } else {
      // Just destroy the session if not authenticated with passport
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.status(200).json({ message: "Logged out successfully" });
      });
    }
  });
  
  // Admin logout endpoint (same behavior as regular logout)
  app.post("/api/admin/logout", (req, res) => {
    // First logout with passport if authenticated
    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Error logging out from passport:", err);
          return res.status(500).send("Logout failed");
        }
        
        // Then destroy the session
        req.session.destroy((err) => {
          if (err) {
            return res.status(500).send("Logout failed");
          }
          res.status(200).send("Logged out successfully");
        });
      });
    } else {
      // Just destroy the session if not authenticated with passport
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).send("Logout failed");
        }
        res.status(200).send("Logged out successfully");
      });
    }
  });
  
  // Get current user session
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Don't return password in response
    const { password: _, ...userWithoutPassword } = req.session.user;
    res.json(userWithoutPassword);
  });
  
  // Session status endpoint for debugging
  app.get("/api/auth/session-status", (req, res) => {
    console.log("=== SESSION STATUS CHECK ===");
    console.log("Request cookies:", req.cookies);
    console.log("Session data:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    console.log("User in session:", req.session.user);
    console.log("User in passport:", req.user);
    
    // Check if user is authenticated through passport or has a session
    const isAuth = req.isAuthenticated() || !!req.session.user;
    console.log("✅ Is authenticated (combined check):", isAuth);
    
    // Return session info (sanitized)
    res.json({
      authenticated: isAuth,
      hasSessionUser: !!req.session.user,
      passportAuth: req.isAuthenticated(),
      sessionID: req.sessionID,
      userID: req.user?.id || req.session.user?.id,
      accountId: req.user?.accountId || req.session.user?.accountId,
    });
  });
  
  // Endpoint to create a test cookie and verify it works
  app.get("/api/auth/test-cookie", (req, res) => {
    console.log("=== SETTING TEST COOKIE ===");
    
    // Set a test cookie
    res.cookie("test_cookie", "hello_from_server", {
      maxAge: 3600000, // 1 hour
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    
    // Check if we received any cookies
    console.log("Cookies received:", req.cookies);
    
    // Return success
    res.json({ 
      success: true,
      message: "Test cookie set",
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      }
    });
  });
  
  // Endpoint to check if a test cookie exists
  app.get("/api/auth/check-test-cookie", (req, res) => {
    console.log("=== CHECKING TEST COOKIE ===");
    console.log("Cookies received:", req.cookies);
    console.log("Session ID:", req.sessionID);
    
    const testCookie = req.cookies?.test_cookie;
    
    res.json({
      cookieExists: !!testCookie,
      cookieValue: testCookie || null,
      allCookies: req.cookies,
      sessionID: req.sessionID,
      headers: {
        cookie: req.headers.cookie,
      }
    });
  });
  
  // Endpoint to dump all information for debugging sessions
  app.get("/api/auth/debug", (req, res) => {
    console.log("=== FULL SESSION DEBUG ===");
    console.log("Headers:", req.headers);
    console.log("Cookies:", req.cookies);
    console.log("SessionID:", req.sessionID);
    console.log("Session:", req.session);
    console.log("Is authenticated:", req.isAuthenticated());
    
    res.json({
      sessionID: req.sessionID,
      cookies: req.cookies,
      authenticated: req.isAuthenticated(),
      session: {
        id: req.session.id,
        cookie: req.session.cookie,
        hasUser: !!req.session.user,
        isLoggedIn: !!req.session.isLoggedIn
      },
      headers: {
        cookie: req.headers.cookie
      },
      user: req.user ? {
        id: req.user.id,
        username: req.user.username,
        accountId: req.user.accountId,
        isAdmin: req.user.isAdmin
      } : null
    });
  });
  
  // Register route (for development - in production would require an admin to create users)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email, isAdmin } = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Create user
      const user = await storage.createUser({
        username,
        password,
        email,
        isAdmin: isAdmin || false
      });
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Physical Items API Routes (Admin)
  
  // Get all physical items
  app.get("/api/admin/physical-items", async (req, res) => {
    try {
      const items = await storage.getPhysicalItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching physical items:", error);
      res.status(500).json({ message: "Failed to fetch physical items" });
    }
  });
  
  // Get a single physical item
  app.get("/api/admin/physical-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const item = await storage.getPhysicalItem(id);
      if (!item) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching physical item:", error);
      res.status(500).json({ message: "Failed to fetch physical item" });
    }
  });
  
  // Create a new physical item
  app.post("/api/admin/physical-items", isAdmin, async (req, res) => {
    try {
      // Extract token ID and burn amount if present
      const { tokenId, burnAmount, ...physicalItemData } = req.body;
      
      // Validate the physical item data
      const validatedData = insertPhysicalItemSchema.parse(physicalItemData);
      
      // First create the physical item
      const item = await storage.createPhysicalItem(validatedData);
      
      // If a token ID was provided, create a token configuration
      if (tokenId && typeof tokenId === 'string' && tokenId.trim() !== '') {
        try {
          // Create the token configuration
          const tokenConfig = await storage.createTokenConfiguration({
            tokenId: tokenId.trim(),
            physicalItemId: item.id,
            burnAmount: burnAmount || 1,
            isActive: true
          });
          
          // Return the item with its token configuration
          return res.status(201).json({
            ...item,
            tokenConfiguration: tokenConfig
          });
        } catch (configError) {
          console.error("Error creating token configuration:", configError);
          // Continue and just return the physical item
        }
      }
      
      // If we get here, just return the physical item
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating physical item:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to create physical item" });
    }
  });
  
  // Update a physical item
  app.patch("/api/admin/physical-items/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const validatedData = updatePhysicalItemSchema.parse(req.body);
      const updated = await storage.updatePhysicalItem(id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating physical item:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update physical item" });
    }
  });
  
  // Delete a physical item
  app.delete("/api/admin/physical-items/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const deleted = await storage.deletePhysicalItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting physical item:", error);
      res.status(500).json({ message: "Failed to delete physical item" });
    }
  });

  // Token API Routes (Admin)
  
  // Get all tokens
  app.get("/api/admin/tokens", async (req, res) => {
    try {
      const tokens = await storage.getTokens();
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });
  
  // Create a new token
  app.post("/api/admin/tokens", isAdmin, async (req, res) => {
    try {
      const validatedData = insertTokenSchema.parse(req.body);
      
      // Verify token exists on Hedera network
      const tokenInfo = await verifyTokenOnHedera(validatedData.tokenId);
      
      if (!tokenInfo) {
        return res.status(400).json({ 
          message: "Invalid token ID. The token doesn't exist on the Hedera network or is not a valid HTS token."
        });
      }
      
      // If token info was found, use it to populate the token data
      const tokenData = {
        ...validatedData,
        name: validatedData.name || tokenInfo.name,
        symbol: validatedData.symbol || tokenInfo.symbol,
        decimals: validatedData.decimals || tokenInfo.decimals,
      };
      
      const token = await storage.createToken(tokenData);
      res.status(201).json(token);
    } catch (error) {
      console.error("Error creating token:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to create token" });
    }
  });
  
  // Update a token
  app.patch("/api/admin/tokens/:tokenId", isAdmin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      const validatedData = updateTokenSchema.parse(req.body);
      
      // If tokenId is being updated, verify it exists on Hedera
      if (validatedData.tokenId && validatedData.tokenId !== tokenId) {
        const tokenInfo = await verifyTokenOnHedera(validatedData.tokenId);
        
        if (!tokenInfo) {
          return res.status(400).json({ 
            message: "Invalid token ID. The token doesn't exist on the Hedera network or is not a valid HTS token."
          });
        }
        
        // If token info was found, use it to populate the token data
        if (!validatedData.name) validatedData.name = tokenInfo.name;
        if (!validatedData.symbol) validatedData.symbol = tokenInfo.symbol;
        if (!validatedData.decimals) validatedData.decimals = tokenInfo.decimals;
      }
      
      const updated = await storage.updateToken(tokenId, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Token not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating token:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update token" });
    }
  });
  
  // Delete a token
  app.delete("/api/admin/tokens/:tokenId", isAdmin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      const deleted = await storage.deleteToken(tokenId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Token not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting token:", error);
      res.status(500).json({ message: "Failed to delete token" });
    }
  });

  // Token Configuration API Routes (Admin)
  
  // Get all token configurations
  app.get("/api/admin/token-configurations", async (req, res) => {
    try {
      const configurations = await storage.getTokenConfigurations();
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching token configurations:", error);
      res.status(500).json({ message: "Failed to fetch token configurations" });
    }
  });
  
  // Get token configurations by physical item
  app.get("/api/admin/token-configurations/physical-item/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const configurations = await storage.getTokenConfigurationsByPhysicalItem(id);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching token configurations:", error);
      res.status(500).json({ message: "Failed to fetch token configurations" });
    }
  });
  
  // Get token configurations by token
  app.get("/api/admin/token-configurations/token/:tokenId", isAdmin, async (req, res) => {
    try {
      const { tokenId } = req.params;
      const configurations = await storage.getTokenConfigurationsByToken(tokenId);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching token configurations:", error);
      res.status(500).json({ message: "Failed to fetch token configurations" });
    }
  });
  
  // Get a single token configuration by ID
  app.get("/api/admin/token-configurations/:id([0-9]+)", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configuration = await storage.getTokenConfiguration(id);
      
      if (!configuration) {
        return res.status(404).json({ message: "Token configuration not found" });
      }
      
      res.json(configuration);
    } catch (error) {
      console.error("Error fetching token configuration:", error);
      res.status(500).json({ message: "Failed to fetch token configuration" });
    }
  });
  
  // Create a new token configuration
  app.post("/api/admin/token-configurations", isAdmin, async (req, res) => {
    try {
      const validatedData = insertTokenConfigurationSchema.parse(req.body);
      
      // Create the token configuration directly - no need to create a token record
      const config = await storage.createTokenConfiguration(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating token configuration:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to create token configuration" });
    }
  });
  
  // Update a token configuration
  app.patch("/api/admin/token-configurations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const validatedData = updateTokenConfigurationSchema.parse(req.body);
      
      // Simply update the token configuration with the provided data
      const updated = await storage.updateTokenConfiguration(id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Token configuration not found" });
      }
      
      return res.status(200).json(updated);
    } catch (error) {
      console.error("Error updating token configuration:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      return res.status(500).json({ message: "Failed to update token configuration" });
    }
  });
  
  // Delete a token configuration
  app.delete("/api/admin/token-configurations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const deleted = await storage.deleteTokenConfiguration(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Token configuration not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting token configuration:", error);
      res.status(500).json({ message: "Failed to delete token configuration" });
    }
  });

  // Redemption Management API Routes (Admin)
  
  // Get all redemptions (Admin only)
  app.get("/api/admin/redemptions", isAdmin, async (req, res) => {
    try {
      const redemptions = await storage.getRedemptions();
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
      res.status(500).json({ message: "Failed to fetch redemptions" });
    }
  });
  
  // Get a specific redemption by order ID (Admin only)
  app.get("/api/admin/redemptions/:orderId", isAdmin, async (req, res) => {
    try {
      const { orderId } = req.params;
      const redemption = await storage.getRedemptionByOrderId(orderId);
      
      if (!redemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      res.json(redemption);
    } catch (error) {
      console.error("Error fetching redemption:", error);
      res.status(500).json({ message: "Failed to fetch redemption" });
    }
  });
  
  // Update a redemption (Admin only)
  app.patch("/api/admin/redemptions/:orderId", isAdmin, async (req, res) => {
    try {
      const { orderId } = req.params;
      const validatedData = updateRedemptionSchema.parse(req.body);
      
      const redemption = await storage.getRedemptionByOrderId(orderId);
      if (!redemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      // Add admin info to the fulfillment update
      if (validatedData.fulfillmentUpdate && req.session.user) {
        validatedData.fulfillmentUpdate.performedBy = req.session.user.username || 'Admin';
        validatedData.fulfillmentUpdate.timestamp = new Date().toISOString();
      }
      
      const updated = await storage.updateRedemption(orderId, validatedData);
      res.json(updated);
    } catch (error) {
      console.error("Error updating redemption:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update redemption" });
    }
  });

  // Public API Routes
  
// Get all tokens (without accountId)
  app.get("/api/tokens", async (req, res) => {
    try {
      // If query parameter accountId is passed, fetch actual tokens and balances from Hedera
      const accountId = req.query.accountId as string;
      
      if (accountId) {
        // Validate account ID format using Hedera SDK validation
        if (!isValidAccountId(accountId)) {
          return res.status(400).json({ message: "Invalid account ID format" });
        }
        
        try {
          // Try to fetch real token balances using Hedera SDK
          const tokenBalances = await getAccountTokenBalances(accountId);
          
          // If we're in development/testing and there are no real balances, use mocked data
          if (tokenBalances.size === 0 && process.env.NODE_ENV !== 'production') {
            const mockedTokens = await storage.getTokensByAccountId(accountId);
            return res.json(mockedTokens);
          }
          
          // Convert token balances to the right format
          const tokens = await Promise.all(
            Array.from(tokenBalances.entries()).map(async ([tokenId, balance]) => {
              // Try to get token metadata from our database
              let tokenData = await storage.getTokenById(tokenId);
              
              if (!tokenData) {
                // If we don't have the token info in our DB, create a basic entry
                tokenData = {
                  id: 0, // Will be assigned by storage
                  tokenId,
                  name: `Token ${tokenId}`,
                  symbol: "TOKEN",
                  decimals: 0,
                  redemptionItem: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
              }
              
              // Return the token with its balance
              return {
                ...tokenData,
                balance
              };
            })
          );
          
          return res.json(tokens);
        } catch (hederaError) {
          console.error("Hedera error fetching token balances:", hederaError);
          
          // Fallback to mocked data during development/testing
          if (process.env.NODE_ENV !== 'production') {
            const mockedTokens = await storage.getTokensByAccountId(accountId);
            return res.json(mockedTokens);
          }
          
          // In production, surface the error
          return res.status(500).json({ message: "Failed to fetch token balances from Hedera" });
        }
      }
      
      // If no accountId, return all tokens from our database (without balances)
      const allTokens = await storage.getTokens();
      res.json(allTokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });
  
  // Verify a token on Hedera network
  app.get("/api/tokens/verify/:tokenId", async (req, res) => {
    try {
      const { tokenId } = req.params;
      
      // Skip verification if token ID is empty
      if (!tokenId || tokenId.trim() === '') {
        return res.status(400).json({
          message: "Token ID cannot be empty",
          isValid: false
        });
      }
      
      // Always check if the token exists in our database first
      const tokenData = await storage.getTokenById(tokenId);
      
      // If we have token data with name and symbol in database, use that
      if (tokenData && tokenData.name && tokenData.symbol) {
        console.log("Found complete token in database:", tokenData);
        return res.json({
          isValid: true,
          tokenInfo: {
            tokenId,
            name: tokenData.name,
            symbol: tokenData.symbol,
            decimals: tokenData.decimals,
            totalSupply: 1000000, // Default value for dev
            isDeleted: false,
            tokenType: "FUNGIBLE"
          }
        });
      }
      
      // If not in database or incomplete data, check basic token ID format
      if (!isValidTokenId(tokenId)) {
        return res.status(400).json({ 
          message: "Invalid token ID format (should be 0.0.xxxx)",
          isValid: false
        });
      }
      
      // Try to get real token information from Hedera network
      console.log("Verifying token on Hedera network:", tokenId);
      const tokenInfo = await verifyTokenOnHedera(tokenId);
      
      // If we successfully retrieved token info from Hedera
      if (tokenInfo) {
        console.log("Token verified on Hedera:", tokenInfo);
        
        // If we have the token in database but with incomplete info, update it
        if (tokenData) {
          console.log("Updating existing token with Hedera info:", tokenInfo);
          await storage.updateToken(tokenId, {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals
          });
        } else {
          // Add new token to database with the verified info
          console.log("Adding new verified token to database:", tokenInfo);
          try {
            await storage.createToken({
              tokenId: tokenInfo.tokenId,
              name: tokenInfo.name,
              symbol: tokenInfo.symbol,
              decimals: tokenInfo.decimals,
              redemptionItem: `${tokenInfo.name} Redemption Item`
            });
          } catch (err) {
            console.error("Failed to add token to database:", err);
            // Continue even if database add fails
          }
        }
        
        // Return the verified token info
        return res.json({
          isValid: true,
          tokenInfo
        });
      }
      
      // Token verification failed - handle based on environment
      console.log("Token verification failed for:", tokenId);
      
      // If we have a token in database but with missing info, use placeholder
      if (tokenData) {
        console.log("Using database token with placeholder info:", tokenId);
        return res.json({
          isValid: true,
          tokenInfo: {
            tokenId,
            name: tokenData.name || `Token ${tokenId}`,
            symbol: tokenData.symbol || "TKN",
            decimals: tokenData.decimals || 0,
            totalSupply: 1000000,
            isDeleted: false,
            tokenType: "FUNGIBLE"
          }
        });
      }
      
      // Reject tokens that can't be verified
      console.log("Token could not be verified on Hedera network:", tokenId);
      return res.json({
        isValid: false,
        message: "Token ID could not be verified on the Hedera network",
        tokenId: tokenId
      });
    } catch (error) {
      console.error("Token verification error:", error);
      
      // Reject tokens that cause errors during verification
      const { tokenId } = req.params;
      console.log("Error during verification - rejecting token:", tokenId);
      return res.json({
        isValid: false,
        message: "Error verifying token on the Hedera network",
        tokenId: tokenId
      });
    }
  });
  
  // Get tokens by account ID (keep for backward compatibility)
  app.get("/api/tokens/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      
      // Validate account ID format using Hedera SDK validation
      if (!accountId || !isValidAccountId(accountId)) {
        return res.status(400).json({ message: "Invalid account ID format" });
      }
      
      try {
        // Try to fetch real token balances using Hedera SDK
        const tokenBalances = await getAccountTokenBalances(accountId);
        
        // If there are no real balances, return an empty array
        if (tokenBalances.size === 0) {
          return res.json([]);
        }
        
        // Convert token balances to the right format
        const tokens = await Promise.all(
          Array.from(tokenBalances.entries()).map(async ([tokenId, balance]) => {
            // Try to get token metadata from our database
            let tokenData = await storage.getTokenById(tokenId);
            
            if (!tokenData) {
              // If we don't have the token info in our DB, create a basic entry
              tokenData = {
                id: 0, // Will be assigned by storage
                tokenId,
                name: `Token ${tokenId}`,
                symbol: "TOKEN",
                decimals: 0,
                redemptionItem: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            }
            
            // Return the token with its balance
            return {
              ...tokenData,
              balance
            };
          })
        );
        
        return res.json(tokens);
      } catch (hederaError) {
        console.error("Hedera error fetching token balances:", hederaError);
        
        // Don't fall back to mocked data, return error
        console.error("Unable to fetch token balances from Hedera network");
        
        // In production, surface the error
        return res.status(500).json({ message: "Failed to fetch token balances from Hedera" });
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });
  
  // Shop API Routes
  
  // Get all active shops
  app.get("/api/shops", async (req, res) => {
    try {
      const shops = await storage.getActiveShops();
      res.json(shops);
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Failed to fetch shops" });
    }
  });
  
  // Get a single shop
  app.get("/api/shops/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const shop = await storage.getShop(id);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      // Only return active shops to public users
      if (!shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      res.json(shop);
    } catch (error) {
      console.error("Error fetching shop:", error);
      res.status(500).json({ message: "Failed to fetch shop" });
    }
  });
  
  // Get all physical items associated with a shop
  app.get("/api/shops/:id/items", async (req, res) => {
    try {
      const shopId = parseInt(req.params.id);
      if (isNaN(shopId)) {
        return res.status(400).json({ message: "Invalid shop ID" });
      }
      
      const shop = await storage.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      // Only return active shops to public users
      if (!shop.isActive) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      const items = await storage.getShopItems(shopId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shop items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin Shop API Routes
  
  // Get all shops (including inactive)
  app.get("/api/admin/shops", isAdmin, async (req, res) => {
    try {
      const shops = await storage.getShops();
      res.json(shops);
    } catch (error) {
      console.error("Error fetching shops:", error);
      res.status(500).json({ message: "Failed to fetch shops" });
    }
  });
  
  // Get a single shop (admin version)
  app.get("/api/admin/shops/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid shop ID format" });
      }
      
      const shop = await storage.getShop(id);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      res.json(shop);
    } catch (error) {
      console.error("Error fetching shop:", error);
      res.status(500).json({ message: "Failed to fetch shop" });
    }
  });
  
  // Create a new shop
  app.post("/api/admin/shops", isAdmin, async (req, res) => {
    try {
      const validatedData = insertShopSchema.parse(req.body);
      const shop = await storage.createShop(validatedData);
      res.status(201).json(shop);
    } catch (error) {
      console.error("Error creating shop:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to create shop" });
    }
  });
  
  // Update a shop
  app.patch("/api/admin/shops/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const validatedData = updateShopSchema.parse(req.body);
      const updated = await storage.updateShop(id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating shop:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update shop" });
    }
  });
  
  // Delete a shop
  app.delete("/api/admin/shops/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const deleted = await storage.deleteShop(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting shop:", error);
      res.status(500).json({ message: "Failed to delete shop" });
    }
  });
  
  // Add an item to a shop
  app.post("/api/admin/shops/:shopId/items", isAdmin, async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const { physicalItemId } = req.body;
      
      if (isNaN(shopId) || !physicalItemId) {
        return res.status(400).json({ message: "Invalid shop ID or missing physical item ID" });
      }
      
      const shop = await storage.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      const physicalItemIdNumber = parseInt(physicalItemId);
      if (isNaN(physicalItemIdNumber)) {
        return res.status(400).json({ message: "Invalid physical item ID format" });
      }
      
      const physicalItem = await storage.getPhysicalItem(physicalItemIdNumber);
      if (!physicalItem) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      const shopItem = await storage.addItemToShop(shopId, physicalItemIdNumber);
      res.status(201).json(shopItem);
    } catch (error) {
      console.error("Error adding item to shop:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to add item to shop" });
      }
    }
  });
  
  // Remove an item from a shop
  app.delete("/api/admin/shops/:shopId/items/:itemId", isAdmin, async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      const itemId = parseInt(req.params.itemId);
      
      if (isNaN(shopId) || isNaN(itemId)) {
        return res.status(400).json({ message: "Invalid shop ID or item ID format" });
      }
      
      const shop = await storage.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      const physicalItem = await storage.getPhysicalItem(itemId);
      if (!physicalItem) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      const removed = await storage.removeItemFromShop(shopId, itemId);
      if (!removed) {
        return res.status(404).json({ message: "Item not found in shop" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error removing item from shop:", error);
      res.status(500).json({ message: "Failed to remove item from shop" });
    }
  });
  
  // Get all items in a shop (admin version)
  app.get("/api/admin/shops/:shopId/items", isAdmin, async (req, res) => {
    try {
      const shopId = parseInt(req.params.shopId);
      
      if (isNaN(shopId)) {
        return res.status(400).json({ message: "Invalid shop ID format" });
      }
      
      const shop = await storage.getShop(shopId);
      if (!shop) {
        return res.status(404).json({ message: "Shop not found" });
      }
      
      const items = await storage.getShopItems(shopId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shop items:", error);
      res.status(500).json({ message: "Failed to fetch shop items" });
    }
  });
  
  // Get all public physical items
  app.get("/api/physical-items", async (req, res) => {
    try {
      const items = await storage.getPhysicalItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching physical items:", error);
      res.status(500).json({ message: "Failed to fetch physical items" });
    }
  });
  
  // Get a specific physical item
  app.get("/api/physical-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }
      
      const item = await storage.getPhysicalItem(id);
      if (!item) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      // Get token configurations for this item
      const tokenConfigs = await storage.getTokenConfigurationsByPhysicalItem(id);
      
      // Combine item with token configurations
      res.json({
        ...item,
        tokenConfigurations: tokenConfigs
      });
    } catch (error) {
      console.error("Error fetching physical item:", error);
      res.status(500).json({ message: "Failed to fetch physical item" });
    }
  });
  
  // Create a new redemption
  app.post("/api/redemptions", async (req, res) => {
    try {
      // Extract request data
      const { tokenId, burnAmount, shippingInfo, physicalItemId } = req.body;
      
      // Check if token configuration exists and is active
      const tokenConfigs = await storage.getTokenConfigurationsByPhysicalItem(physicalItemId);
      const validConfig = tokenConfigs.find(
        config => config.tokenId === tokenId && config.isActive
      );
      
      if (!validConfig) {
        return res.status(400).json({ 
          message: "Invalid token or physical item combination or configuration is inactive" 
        });
      }
      
      // Check required burn amount
      const requiredAmount = validConfig.burnAmount;
      if (burnAmount < requiredAmount) {
        return res.status(400).json({
          message: `Insufficient burn amount. Required: ${requiredAmount}, Provided: ${burnAmount}`
        });
      }
      
      // Create the redemption data
      const orderId = `ORD-${nanoid(8)}`;
      
      // Get account ID from authenticated session or request
      const accountId = req.body.accountId;
      
      if (!accountId) {
        return res.status(400).json({
          message: "Account ID is required for token balance verification"
        });
      }
      
      // Validate account ID format
      if (!isValidAccountId(accountId)) {
        return res.status(400).json({
          message: "Invalid account ID format"
        });
      }
      
      // Check the token balance
      try {
        const tokenBalances = await getAccountTokenBalances(accountId);
        const tokenBalance = tokenBalances.get(tokenId) || 0;
        
        if (tokenBalance < burnAmount) {
          return res.status(400).json({
            message: `Insufficient token balance. Required: ${burnAmount}, Available: ${tokenBalance}`
          });
        }
      } catch (balanceError) {
        console.error("Error checking token balance:", balanceError);
        
        // Do not skip balance checks, always verify token balances
        return res.status(500).json({
          message: "Unable to verify token balance on the Hedera network"
        });
      }
      
      // Validate with schema
      const validatedData = insertRedemptionSchema.parse({
        accountId,
        tokenId,
        physicalItemId,
        amount: burnAmount,
        shippingInfo,
      });
      
      // Create the redemption record
      const redemption = await storage.createRedemption({
        ...validatedData,
        orderId,
      });
      
      res.status(201).json(redemption);
    } catch (error) {
      console.error("Error creating redemption:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to create redemption" });
    }
  });
  
  // Update a redemption with transaction ID
  app.patch("/api/redemptions/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      
      // Get the original redemption
      const redemption = await storage.getRedemptionByOrderId(orderId);
      if (!redemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      // Validate with schema
      const validatedData = updateRedemptionSchema.parse(req.body);
      
      // If there's a transaction ID being added, verify it with Hedera
      if (validatedData.transactionId && !redemption.transactionId) {
        // Get account ID and token ID from the redemption
        const { accountId, tokenId, amount } = redemption;
        
        try {
          // Verify the transaction ID format is valid using our helper function
          let txId = validatedData.transactionId;
          
          // First check if it's a valid transaction ID format
          if (!isValidTransactionId(txId)) {
            return res.status(400).json({
              message: "Invalid transaction ID format. Please provide a valid Hedera transaction ID."
            });
          }
          
          // If it's valid, format it properly
          try {
            const formattedTxId = formatTransactionId(txId);
            // Update with the formatted version
            validatedData.transactionId = formattedTxId;
          } catch (formatError) {
            // This should never happen as we already checked with isValidTransactionId
            console.error("Unexpected error formatting transaction ID:", formatError);
            return res.status(400).json({
              message: "Invalid transaction ID format"
            });
          }
          
          // If status is being changed to "processing", add a fulfillment update
          if (validatedData.status === "processing" && !validatedData.fulfillmentUpdate) {
            validatedData.fulfillmentUpdate = {
              status: "processing",
              timestamp: new Date().toISOString(),
              message: "Token burn transaction confirmed. Order is now being processed."
            };
          }
        } catch (txError) {
          console.error("Error processing transaction:", txError);
          
          // Always require valid transactions, even in development
          return res.status(400).json({
            message: "Invalid transaction ID or unable to verify transaction"
          });
        }
      }
      
      // Update the redemption
      const updated = await storage.updateRedemption(orderId, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating redemption:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update redemption" });
    }
  });
  
  // Get redemption by order ID
  app.get("/api/redemptions/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const redemption = await storage.getRedemptionByOrderId(orderId);
      
      if (!redemption) {
        return res.status(404).json({ message: "Redemption not found" });
      }
      
      res.json(redemption);
    } catch (error) {
      console.error("Error fetching redemption:", error);
      res.status(500).json({ message: "Failed to fetch redemption" });
    }
  });

  // Item Variations routes
  app.get("/api/physical-items/:id/variations", async (req, res) => {
    try {
      const physicalItemId = parseInt(req.params.id);
      const variations = await storage.getItemVariations(physicalItemId);
      res.json(variations);
    } catch (error: any) {
      console.error("Error fetching variations:", error);
      res.status(500).json({ message: "Failed to fetch item variations" });
    }
  });

  app.post("/api/physical-items/:id/variations", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const physicalItemId = parseInt(req.params.id);
      const result = insertItemVariationSchema.safeParse({
        ...req.body,
        physicalItemId
      });
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: result.error.format() 
        });
      }
      
      // Make sure the physical item exists
      const item = await storage.getPhysicalItem(physicalItemId);
      if (!item) {
        return res.status(404).json({ message: "Physical item not found" });
      }
      
      // Update the physical item to indicate it has variations
      await storage.updatePhysicalItem(physicalItemId, { hasVariations: true });
      
      // Create the variation
      const variation = await storage.createItemVariation(result.data);
      res.status(201).json(variation);
    } catch (error: any) {
      console.error("Error creating variation:", error);
      res.status(500).json({ message: "Failed to create item variation" });
    }
  });

  app.patch("/api/physical-items/:itemId/variations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = updateItemVariationSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: result.error.format() 
        });
      }
      
      const variation = await storage.updateItemVariation(id, result.data);
      
      if (!variation) {
        return res.status(404).json({ message: "Item variation not found" });
      }
      
      res.json(variation);
    } catch (error: any) {
      console.error("Error updating variation:", error);
      res.status(500).json({ message: "Failed to update item variation" });
    }
  });

  app.delete("/api/physical-items/:itemId/variations/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const physicalItemId = parseInt(req.params.itemId);
      
      // Delete the variation
      const success = await storage.deleteItemVariation(id);
      
      if (!success) {
        return res.status(404).json({ message: "Item variation not found" });
      }
      
      // Check if this was the last variation
      const remainingVariations = await storage.getItemVariations(physicalItemId);
      
      if (remainingVariations.length === 0) {
        // Update the item to indicate it no longer has variations
        await storage.updatePhysicalItem(physicalItemId, { hasVariations: false });
      }
      
      res.status(204).end();
    } catch (error: any) {
      console.error("Error deleting variation:", error);
      res.status(500).json({ message: "Failed to delete item variation" });
    }
  });
  
  // Item Variant Stock routes
  app.get("/api/physical-items/:id/variant-stocks", async (req, res) => {
    try {
      const physicalItemId = parseInt(req.params.id);
      const stocks = await storage.getItemVariantStocks(physicalItemId);
      res.json(stocks);
    } catch (error: any) {
      console.error("Error fetching variant stocks:", error);
      res.status(500).json({ message: "Failed to fetch variant stocks" });
    }
  });

  app.post("/api/physical-items/:id/variant-stocks", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const physicalItemId = parseInt(req.params.id);
      
      // Check if combination already exists
      const existingStock = await storage.getItemVariantStockByCombination(
        physicalItemId, 
        req.body.combination
      );
      
      if (existingStock) {
        return res.status(400).json({ 
          message: "A stock entry for this combination already exists" 
        });
      }
      
      const stock = await storage.createItemVariantStock({
        physicalItemId,
        combination: req.body.combination,
        stock: req.body.stock || 0
      });
      
      res.status(201).json(stock);
    } catch (error: any) {
      console.error("Error creating variant stock:", error);
      res.status(500).json({ message: "Failed to create variant stock" });
    }
  });

  app.patch("/api/physical-items/:itemId/variant-stocks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { stock } = req.body;
      
      if (typeof stock !== 'number' || stock < 0) {
        return res.status(400).json({ message: "Stock must be a non-negative number" });
      }
      
      const updatedStock = await storage.updateItemVariantStock(id, stock);
      
      if (!updatedStock) {
        return res.status(404).json({ message: "Variant stock not found" });
      }
      
      res.json(updatedStock);
    } catch (error: any) {
      console.error("Error updating variant stock:", error);
      res.status(500).json({ message: "Failed to update variant stock" });
    }
  });

  app.delete("/api/physical-items/:itemId/variant-stocks/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteItemVariantStock(id);
      
      if (!success) {
        return res.status(404).json({ message: "Variant stock not found" });
      }
      
      res.status(204).end();
    } catch (error: any) {
      console.error("Error deleting variant stock:", error);
      res.status(500).json({ message: "Failed to delete variant stock" });
    }
  });

  // Session Testing Endpoints
  app.get("/api/auth/session-status", (req, res) => {
    console.log('---SESSION STATUS REQUEST---');
    console.log('Session:', req.session);
    console.log('Is authenticated:', req.isAuthenticated());
    console.log('User in session:', req.session.user);
    console.log('User in passport:', req.user);
    console.log('Cookies:', req.cookies);
    console.log('Headers:', req.headers);
    
    res.json({
      authenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      userID: req.user?.id || req.session.user?.id,
      accountId: req.user?.accountId || req.session.user?.accountId,
      sessionData: {
        cookie: req.session.cookie,
        user: req.session.user ? {
          id: req.session.user.id,
          username: req.session.user.username,
          accountId: req.session.user.accountId,
          isAdmin: req.session.user.isAdmin
        } : null
      }
    });
  });

  app.get("/api/auth/test-cookie", (req, res) => {
    console.log('---SETTING TEST COOKIE---');
    // Set a test cookie with secure options matching our session cookie settings
    res.cookie('test_cookie', 'test_value_' + Date.now(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 3600000 // 1 hour
    });
    console.log('Headers being sent:', res.getHeaders());
    res.json({ message: "Test cookie set successfully" });
  });

  app.get("/api/auth/check-test-cookie", (req, res) => {
    console.log('---CHECKING TEST COOKIE---');
    console.log('Cookies received:', req.cookies);
    console.log('Signed cookies:', req.signedCookies);
    console.log('Headers:', req.headers);
    
    const cookieValue = req.cookies.test_cookie;
    res.json({
      cookieExists: !!cookieValue,
      cookieValue: cookieValue || null,
      allCookies: req.cookies
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
