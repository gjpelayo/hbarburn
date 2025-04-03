// User types
export interface User {
  id: number;
  username: string;
  email: string | null;
  accountId: string | null;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

// Shop types
export interface Shop {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Physical item types
export interface PhysicalItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  stock: number;
  createdAt: string;
  updatedAt: string;
  tokenConfigurations?: TokenConfiguration[];
}

// Token types
export interface Token {
  id: number;
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  redemptionItem: string | null;
  createdAt: string;
  updatedAt: string;
}

// Token configuration types
export interface TokenConfiguration {
  id: number;
  tokenId: string;
  physicalItemId: number;
  burnAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Shop item association types
export interface ShopItem {
  id: number;
  shopId: number;
  physicalItemId: number;
  createdAt: string;
  updatedAt: string;
}

// Shipping information types
export interface ShippingInfo {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  phone?: string;
}

// Order status types
export type OrderStatus = 
  | "pending" 
  | "confirmed" 
  | "processing" 
  | "shipped" 
  | "delivered" 
  | "completed" 
  | "cancelled" 
  | "refunded";

// Fulfillment update types
export interface FulfillmentUpdate {
  status: OrderStatus;
  timestamp: string;
  message?: string;
  performedBy?: string;
}

// Redemption types
export interface Redemption {
  id: number;
  orderId: string;
  accountId: string;
  tokenId: string;
  physicalItemId: number;
  amount: number;
  shippingInfo: ShippingInfo;
  status: OrderStatus;
  fulfillmentUpdates: FulfillmentUpdate[];
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  transactionId: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}