import { pgTable, text, serial, integer, json, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  tokenId: text("token_id").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimals: integer("decimals").notNull(),
  redemptionItem: text("redemption_item").notNull(),
});

export const insertTokenSchema = createInsertSchema(tokens).pick({
  tokenId: true,
  name: true,
  symbol: true,
  decimals: true,
  redemptionItem: true,
});

export const redemptions = pgTable("redemptions", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id", { length: 20 }).notNull().unique(),
  accountId: text("account_id").notNull(),
  tokenId: text("token_id").notNull(),
  amount: integer("amount").notNull(),
  transactionId: text("transaction_id"),
  shippingInfo: json("shipping_info").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
    amount: true,
    shippingInfo: true,
  })
  .extend({
    shippingInfo: shippingInfoSchema,
  });

export const updateRedemptionSchema = z.object({
  transactionId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;

export type ShippingInfo = z.infer<typeof shippingInfoSchema>;
export type Redemption = typeof redemptions.$inferSelect;
export type InsertRedemption = z.infer<typeof insertRedemptionSchema>;
export type UpdateRedemption = z.infer<typeof updateRedemptionSchema>;
