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
  type User,
  type WalletAuthCredentials
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";
import session from "express-session";
import { randomUUID } from "crypto";

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
  if (req.session.isLoggedIn && req.session.user && req.session.user.isAdmin) {
    return next();
  }
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
      
      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
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
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
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
      const token = await storage.createToken(validatedData);
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
  app.get("/api/admin/token-configurations/physical-item/:id", async (req, res) => {
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
  app.get("/api/admin/token-configurations/token/:tokenId", async (req, res) => {
    try {
      const { tokenId } = req.params;
      const configurations = await storage.getTokenConfigurationsByToken(tokenId);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching token configurations:", error);
      res.status(500).json({ message: "Failed to fetch token configurations" });
    }
  });
  
  // Create a new token configuration
  app.post("/api/admin/token-configurations", isAdmin, async (req, res) => {
    try {
      const validatedData = insertTokenConfigurationSchema.parse(req.body);
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
      const updated = await storage.updateTokenConfiguration(id, validatedData);
      
      if (!updated) {
        return res.status(404).json({ message: "Token configuration not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating token configuration:", error);
      
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validationError.details 
        });
      }
      
      res.status(500).json({ message: "Failed to update token configuration" });
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
      // If query parameter accountId is passed, filter by it
      const accountId = req.query.accountId as string;
      
      if (accountId) {
        // Validate account ID format
        if (!/^0\.0\.\d+$/.test(accountId)) {
          return res.status(400).json({ message: "Invalid account ID format" });
        }
        
        const tokens = await storage.getTokensByAccountId(accountId);
        return res.json(tokens);
      }
      
      // If no accountId, return all tokens (for demo purposes)
      const defaultAccountId = "0.0.1234567";
      const tokens = await storage.getTokensByAccountId(defaultAccountId);
      res.json(tokens);
    } catch (error) {
      console.error("Error fetching tokens:", error);
      res.status(500).json({ message: "Failed to fetch tokens" });
    }
  });
  
  // Get tokens by account ID (keep for backward compatibility)
  app.get("/api/tokens/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      
      // Validate account ID format
      if (!accountId || !/^0\.0\.\d+$/.test(accountId)) {
        return res.status(400).json({ message: "Invalid account ID format" });
      }
      
      const tokens = await storage.getTokensByAccountId(accountId);
      res.json(tokens);
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
      
      // Create the redemption data
      const orderId = `ORD-${nanoid(8)}`;
      
      // In a real app, we would get accountId from authenticated session
      // For this demo, we'll use a mock account ID if not provided
      const accountId = req.body.accountId || "0.0.1234567";
      
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
      
      // Validate with schema
      const validatedData = updateRedemptionSchema.parse(req.body);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
