// Token Types
export interface Token {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  balance: number;
  redemptionItem: string;
}

// Wallet Types
export interface WalletConnectionResult {
  success: boolean;
  accountId?: string;
  error?: string;
}

// Shipping Information
export interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
}

// Transaction Types
export type BurnTransactionStatus = 
  | "idle" 
  | "preparing" 
  | "signing" 
  | "broadcasting" 
  | "confirming" 
  | "completing" 
  | "completed" 
  | "failed";

// Redemption Types
export interface Redemption {
  id: string;
  userId: string;
  tokenId: string;
  amount: number;
  transactionId: string | null;
  shippingInfo: ShippingInfo;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
}

export interface CreateRedemptionRequest {
  tokenId: string;
  burnAmount: number;
  shippingInfo: ShippingInfo;
}

export interface UpdateRedemptionRequest {
  transactionId: string;
  status: "pending" | "processing" | "completed" | "failed";
}
