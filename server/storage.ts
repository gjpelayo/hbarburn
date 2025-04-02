import { 
  users, 
  tokens, 
  redemptions, 
  type User, 
  type Token, 
  type InsertUser, 
  type Redemption, 
  type UpdateRedemption,
  type ShippingInfo
} from "@shared/schema";

// Extend the storage interface with methods for our application
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Token methods
  getTokensByAccountId(accountId: string): Promise<Token[]>;
  getTokenById(tokenId: string): Promise<Token | undefined>;
  
  // Redemption methods
  getRedemptions(): Promise<Redemption[]>;
  getRedemptionByOrderId(orderId: string): Promise<Redemption | undefined>;
  createRedemption(data: CreateRedemptionData): Promise<Redemption>;
  updateRedemption(orderId: string, data: UpdateRedemption): Promise<Redemption | undefined>;
}

interface CreateRedemptionData {
  accountId: string;
  tokenId: string;
  amount: number;
  shippingInfo: ShippingInfo;
  orderId: string;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<string, Token>;
  private redemptions: Map<string, Redemption>;
  private currentUserId: number;

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.redemptions = new Map();
    this.currentUserId = 1;
    
    // Seed some initial tokens for demo purposes
    this.seedTokens();
  }
  
  private seedTokens() {
    const mockTokens: Token[] = [
      {
        id: 1,
        tokenId: "0.0.1001",
        name: "Physical Merch Token",
        symbol: "MERCH",
        decimals: 0,
        redemptionItem: "Limited Edition Merchandise Pack"
      },
      {
        id: 2,
        tokenId: "0.0.1002",
        name: "Apparel Token",
        symbol: "APRL",
        decimals: 0,
        redemptionItem: "Exclusive Branded Apparel"
      },
      {
        id: 3,
        tokenId: "0.0.1003",
        name: "Collectible Token",
        symbol: "CLLCT",
        decimals: 0,
        redemptionItem: "Collectible Hedera-themed Item"
      }
    ];
    
    mockTokens.forEach(token => {
      this.tokens.set(token.tokenId, token);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Token methods
  async getTokensByAccountId(accountId: string): Promise<Token[]> {
    // In a real app, we would fetch tokens that are owned by this account
    // from the Hedera network or from our database
    // For this demo, we'll return all mock tokens with random balances
    
    return Array.from(this.tokens.values()).map(token => {
      // Add a random balance for demo purposes
      const balance = Math.floor(Math.random() * 200) + 1;
      return { ...token, balance };
    });
  }
  
  async getTokenById(tokenId: string): Promise<Token | undefined> {
    return this.tokens.get(tokenId);
  }
  
  // Redemption methods
  async getRedemptions(): Promise<Redemption[]> {
    return Array.from(this.redemptions.values());
  }
  
  async getRedemptionByOrderId(orderId: string): Promise<Redemption | undefined> {
    return this.redemptions.get(orderId);
  }
  
  async createRedemption(data: CreateRedemptionData): Promise<Redemption> {
    const now = new Date().toISOString();
    
    const redemption: Redemption = {
      id: this.redemptions.size + 1,
      orderId: data.orderId,
      accountId: data.accountId,
      tokenId: data.tokenId,
      amount: data.amount,
      transactionId: null,
      shippingInfo: data.shippingInfo,
      status: "pending",
      createdAt: now,
      updatedAt: now
    };
    
    this.redemptions.set(data.orderId, redemption);
    return redemption;
  }
  
  async updateRedemption(orderId: string, data: UpdateRedemption): Promise<Redemption | undefined> {
    const redemption = this.redemptions.get(orderId);
    
    if (!redemption) {
      return undefined;
    }
    
    const updated: Redemption = {
      ...redemption,
      transactionId: data.transactionId,
      status: data.status,
      updatedAt: new Date().toISOString()
    };
    
    this.redemptions.set(orderId, updated);
    return updated;
  }
}

export const storage = new MemStorage();
