import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  loginSchema,
  walletAuthSchema,
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
  type WalletAuthCredentials
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";
import session from "express-session";
import { randomUUID } from "crypto";
import { client, getAccountTokenBalances, isValidAccountId, isValidTokenId, formatTransactionId, verifyTokenOnHedera } from "./hedera";

// Extend Express Request interface to include session user
declare module "express-session" {
  interface SessionData {
    user?: User;
    isLoggedIn?: boolean;
  }
}

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.session.isLoggedIn && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
}

// Middleware to check if user is an admin
function isAdmin(req: Request, res: Response, next: NextFunction) {
  console.log('Admin check - Auth status:', req.isAuthenticated());
  console.log('Admin check - Session user:', req.session.user);
  console.log('Admin check - Passport user:', req.user);
  
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
  // Set up Passport authentication and session handling
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
      const validatedData = insertPhysicalItemSchema.parse(req.body);
      const item = await storage.createPhysicalItem(validatedData);
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
      
      // Check if token exists in our database first
      let token = await storage.getTokenById(validatedData.tokenId);
      let tokenInfo = null;
      
      // If we're in development mode or if we have valid Hedera credentials, verify the token
      if (!token || process.env.NODE_ENV === 'production') {
        try {
          // Verify token exists on Hedera network
          tokenInfo = await verifyTokenOnHedera(validatedData.tokenId);
          
          if (!tokenInfo && process.env.NODE_ENV === 'production') {
            return res.status(400).json({ 
              message: "Invalid token ID. The token doesn't exist on the Hedera network or is not a valid HTS token."
            });
          }
        } catch (hederaError) {
          console.error("Error verifying token on Hedera:", hederaError);
          
          // In production, surface the error
          if (process.env.NODE_ENV === 'production') {
            return res.status(400).json({ message: "Error verifying token on Hedera network" });
          }
          
          // In development, log the error but proceed
          console.log("Token not found on network but accepting in development mode:", validatedData.tokenId);
          
          // Create a placeholder token info for development
          tokenInfo = {
            tokenId: validatedData.tokenId,
            name: `Token ${validatedData.tokenId}`,
            symbol: "TKN",
            decimals: 0,
            totalSupply: 1000000,
            isDeleted: false,
            tokenType: "FUNGIBLE"
          };
        }
      }
      
      // If token doesn't exist in our database but we have token info, create it
      if (!token && tokenInfo) {
        try {
          token = await storage.createToken({
            tokenId: tokenInfo.tokenId,
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: tokenInfo.decimals,
            redemptionItem: "Created for token configuration"
          });
          console.log("Created new token in database:", token);
        } catch (tokenCreateError) {
          console.error("Error creating token record:", tokenCreateError);
          // Continue with configuration creation even if token creation fails
        }
      }
      
      // Now create the token configuration
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
      
      // If tokenId is being updated, verify the token exists or create it
      if (validatedData.tokenId) {
        // Check if token exists in our database first
        let token = await storage.getTokenById(validatedData.tokenId);
        let tokenInfo = null;
        
        // If token doesn't exist in our database and we have the token ID
        if (!token) {
          try {
            // Try to verify token on Hedera network
            tokenInfo = await verifyTokenOnHedera(validatedData.tokenId);
            
            // If we're in production and token doesn't exist, reject update
            if (!tokenInfo && process.env.NODE_ENV === 'production') {
              return res.status(400).json({ 
                message: "Invalid token ID. The token doesn't exist on the Hedera network or is not a valid HTS token."
              });
            }
            
            // If we don't have token info but are in development, create placeholder info
            if (!tokenInfo) {
              console.log("Token not found on network but accepting in development mode:", validatedData.tokenId);
              tokenInfo = {
                tokenId: validatedData.tokenId,
                name: `Token ${validatedData.tokenId}`,
                symbol: "TKN",
                decimals: 0,
                totalSupply: 1000000,
                isDeleted: false,
                tokenType: "FUNGIBLE"
              };
            }
            
            // Create the token in our database
            try {
              token = await storage.createToken({
                tokenId: tokenInfo.tokenId,
                name: tokenInfo.name,
                symbol: tokenInfo.symbol,
                decimals: tokenInfo.decimals,
                redemptionItem: "Created for token configuration"
              });
              console.log("Created new token in database:", token);
            } catch (tokenCreateError) {
              console.error("Error creating token record:", tokenCreateError);
              // Continue with configuration update even if token creation fails
            }
          } catch (hederaError) {
            console.error("Error verifying token on Hedera:", hederaError);
            
            // In production, surface the error
            if (process.env.NODE_ENV === 'production') {
              return res.status(400).json({ message: "Error verifying token on Hedera network" });
            }
            
            // In development, log the error but proceed
            console.log("Token not found but accepting in development mode:", validatedData.tokenId);
          }
        }
      }
      
      // Now update the token configuration
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
      if (tokenData) {
        console.log("Found token in database:", tokenData);
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
      
      // If not in database, check basic token ID format
      if (!isValidTokenId(tokenId)) {
        return res.status(400).json({ 
          message: "Invalid token ID format (should be 0.0.xxxx)",
          isValid: false
        });
      }
      
      // Verify token on Hedera network if client is properly initialized
      const hasOperator = client && client.operatorAccountId && client.operatorPublicKey;
      if (!hasOperator) {
        console.log("No operator credentials for Hedera client - accepting valid format token ID");
        // For development without operator credentials, just accept the token ID
        return res.json({
          isValid: true,
          tokenInfo: {
            tokenId,
            name: `Token ${tokenId}`,
            symbol: "TKN",
            decimals: 0,
            totalSupply: 1000000,
            isDeleted: false,
            tokenType: "FUNGIBLE"
          }
        });
      }
      
      // If operator is configured, try to verify on network
      const tokenInfo = await verifyTokenOnHedera(tokenId);
      
      if (!tokenInfo) {
        // In development mode, accept the token ID format since the operator might not have visibility
        if (process.env.NODE_ENV !== 'production') {
          console.log("Token not found on network but accepting in development mode:", tokenId);
          return res.json({
            isValid: true,
            tokenInfo: {
              tokenId,
              name: `Token ${tokenId}`,
              symbol: "TKN",
              decimals: 0,
              totalSupply: 1000000,
              isDeleted: false,
              tokenType: "FUNGIBLE"
            }
          });
        }
        
        return res.status(404).json({ 
          message: "Token not found on Hedera network",
          isValid: false
        });
      }
      
      // If we get here, token was found on Hedera network
      return res.json({
        isValid: true,
        tokenInfo
      });
    } catch (error) {
      console.error("Token verification error:", error);
      
      // For development, don't fail verification
      if (process.env.NODE_ENV !== 'production') {
        const { tokenId } = req.params;
        console.log("Error during verification but accepting in development mode:", tokenId);
        return res.json({
          isValid: true,
          tokenInfo: {
            tokenId,
            name: `Token ${tokenId}`,
            symbol: "TKN",
            decimals: 0,
            totalSupply: 1000000,
            isDeleted: false,
            tokenType: "FUNGIBLE"
          }
        });
      }
      
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Error verifying token",
        isValid: false
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
        
        // If we can't verify balance in development, continue with the redemption
        if (process.env.NODE_ENV !== 'production') {
          console.warn("Skipping balance check in development mode");
        } else {
          return res.status(500).json({
            message: "Unable to verify token balance"
          });
        }
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
          // In a production environment, we would verify the transaction with the Hedera API
          // For now, we simply validate that it's a properly formatted transaction ID
          let txId = validatedData.transactionId;
          
          // Use the formatTransactionId function to check if it's valid
          try {
            const formattedTxId = formatTransactionId(txId);
            // If the transaction ID is valid, update it with the formatted version
            validatedData.transactionId = formattedTxId;
          } catch (formatError) {
            // Only enforce in production
            if (process.env.NODE_ENV === 'production') {
              return res.status(400).json({
                message: "Invalid transaction ID format"
              });
            }
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
          
          // In development, we allow unverified transactions
          if (process.env.NODE_ENV !== 'production') {
            console.warn("Skipping transaction verification in development mode");
          } else {
            return res.status(400).json({
              message: "Invalid transaction ID or unable to verify transaction"
            });
          }
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

  const httpServer = createServer(app);
  return httpServer;
}
