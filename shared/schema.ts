import { pgTable, text, serial, integer, json, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with admin flag
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  isAdmin: true,
});

// Physical items table
export const physicalItems = pgTable("physical_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  stock: integer("stock").default(0),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertPhysicalItemSchema = createInsertSchema(physicalItems).pick({
  name: true,
  description: true,
  imageUrl: true,
  stock: true,
});

export const updatePhysicalItemSchema = insertPhysicalItemSchema.partial();

// Tokens table
export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  tokenId: text("token_id").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimals: integer("decimals").notNull(),
  redemptionItem: text("redemption_item"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertTokenSchema = createInsertSchema(tokens).pick({
  tokenId: true,
  name: true,
  symbol: true,
  decimals: true,
  redemptionItem: true,
});

export const updateTokenSchema = insertTokenSchema.partial();

// Token configurations for physical items
export const tokenConfigurations = pgTable("token_configurations", {
  id: serial("id").primaryKey(),
  tokenId: text("token_id").notNull().references(() => tokens.tokenId),
  physicalItemId: integer("physical_item_id").notNull().references(() => physicalItems.id),
  burnAmount: integer("burn_amount").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertTokenConfigurationSchema = createInsertSchema(tokenConfigurations).pick({
  tokenId: true,
  physicalItemId: true,
  burnAmount: true,
  isActive: true,
});

export const updateTokenConfigurationSchema = insertTokenConfigurationSchema.partial();

// Redemptions table with physical item reference
export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 20 }).notNull().unique(),
  accountId: text("account_id").notNull(),
  tokenId: text("token_id").notNull().references(() => tokens.tokenId),
  physicalItemId: integer("physical_item_id").notNull().references(() => physicalItems.id),
  amount: integer("amount").notNull(),
  transactionId: text("transaction_id"),
  shippingInfo: json("shipping_info").notNull(),
  status: text("status").notNull().default("pending"),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// Define the shipping info schema
export const shippingInfoSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  address: z.string().min(5),
  address2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
  country: z.string().min(2),
  phone: z.string().min(5),
});

export const insertRedemptionSchema = createInsertSchema(redemptions)
  .pick({
    accountId: true,
    tokenId: true,
    physicalItemId: true,
    amount: true,
    shippingInfo: true,
  })
  .extend({
    shippingInfo: shippingInfoSchema,
  });

export const updateRedemptionSchema = z.object({
  transactionId: z.string().optional(),
  status: z.enum(["pending", "processing", "shipped", "completed", "cancelled"]),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Shops table
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const insertShopSchema = createInsertSchema(shops).pick({
  name: true,
  description: true,
  imageUrl: true,
  isActive: true,
});

export const updateShopSchema = insertShopSchema.partial();

// Admin authentication schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type UpdateShop = z.infer<typeof updateShopSchema>;

export type PhysicalItem = typeof physicalItems.$inferSelect;
export type InsertPhysicalItem = z.infer<typeof insertPhysicalItemSchema>;
export type UpdatePhysicalItem = z.infer<typeof updatePhysicalItemSchema>;

export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type UpdateToken = z.infer<typeof updateTokenSchema>;

export type TokenConfiguration = typeof tokenConfigurations.$inferSelect;
export type InsertTokenConfiguration = z.infer<typeof insertTokenConfigurationSchema>;
export type UpdateTokenConfiguration = z.infer<typeof updateTokenConfigurationSchema>;

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type UpdateRedemption = z.infer<typeof updateRedemptionSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
