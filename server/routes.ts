import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateRedemptionSchema, insertRedemptionSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
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
  
  // Create a new redemption
  app.post("/api/redemptions", async (req, res) => {
    try {
      // Extract request data
      const { tokenId, burnAmount, shippingInfo } = req.body;
      
      // Create the redemption data
      const orderId = `ORD-${nanoid(8)}`;
      
      // In a real app, we would get accountId from authenticated session
      // For this demo, we'll use a mock account ID if not provided
      const accountId = req.body.accountId || "0.0.1234567";
      
      // Validate with schema
      const validatedData = insertRedemptionSchema.parse({
        accountId,
        tokenId,
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
