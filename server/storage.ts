import { 
  users, 
  tokens, 
  redemptions,
  physicalItems,
  tokenConfigurations,
  shops,
  shopItems,
  itemVariations,
  itemVariantStocks,
  type User, 
  type Token,
  type PhysicalItem,
  type TokenConfiguration, 
  type InsertUser,
  type InsertPhysicalItem,
  type UpdatePhysicalItem,
  type InsertToken,
  type UpdateToken,
  type InsertTokenConfiguration,
  type UpdateTokenConfiguration, 
  type Redemption, 
  type UpdateRedemption,
  type ShippingInfo,
  type Shop,
  type InsertShop,
  type UpdateShop,
  type FulfillmentUpdate,
  type ShopItem,
  type InsertShopItem,
  type ItemVariation,
  type InsertItemVariation,
  type UpdateItemVariation,
  type ItemVariantStock,
  type InsertItemVariantStock
} from "@shared/schema";
import { randomUUID } from "crypto";
import { createHash } from 'crypto';
import session from "express-session";
import createMemoryStore from "memorystore";

// Extend the storage interface with methods for our application
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAccountId(accountId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserPassword(username: string, password: string): Promise<User | null>;
  createOrGetWalletUser(accountId: string): Promise<User>;
  
  // Shop methods
  getShops(): Promise<Shop[]>;
  getActiveShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, data: UpdateShop): Promise<Shop | undefined>;
  deleteShop(id: number): Promise<boolean>;
  
  // Physical Item methods
  getPhysicalItems(): Promise<PhysicalItem[]>;
  getPhysicalItem(id: number): Promise<PhysicalItem | undefined>;
  createPhysicalItem(item: InsertPhysicalItem): Promise<PhysicalItem>;
  updatePhysicalItem(id: number, data: UpdatePhysicalItem): Promise<PhysicalItem | undefined>;
  deletePhysicalItem(id: number): Promise<boolean>;
  
  // Shop Items association methods
  getShopItems(shopId: number): Promise<PhysicalItem[]>;
  addItemToShop(shopId: number, physicalItemId: number): Promise<ShopItem>;
  removeItemFromShop(shopId: number, physicalItemId: number): Promise<boolean>;
  
  // Token methods
  getTokens(): Promise<Token[]>;
  getTokensByAccountId(accountId: string): Promise<Token[]>;
  getTokenById(tokenId: string): Promise<Token | undefined>;
  createToken(token: InsertToken): Promise<Token>;
  updateToken(tokenId: string, data: UpdateToken): Promise<Token | undefined>;
  deleteToken(tokenId: string): Promise<boolean>;
  
  // Token Configuration methods
  getTokenConfigurations(): Promise<TokenConfiguration[]>;
  getTokenConfiguration(id: number): Promise<TokenConfiguration | undefined>;
  getTokenConfigurationsByPhysicalItem(physicalItemId: number): Promise<TokenConfiguration[]>;
  getTokenConfigurationsByToken(tokenId: string): Promise<TokenConfiguration[]>;
  createTokenConfiguration(config: InsertTokenConfiguration): Promise<TokenConfiguration>;
  updateTokenConfiguration(id: number, data: UpdateTokenConfiguration): Promise<TokenConfiguration | undefined>;
  deleteTokenConfiguration(id: number): Promise<boolean>;
  
  // Redemption methods
  getRedemptions(): Promise<Redemption[]>;
  getRedemptionByOrderId(orderId: string): Promise<Redemption | undefined>;
  createRedemption(data: CreateRedemptionData): Promise<Redemption>;
  updateRedemption(orderId: string, data: UpdateRedemption): Promise<Redemption | undefined>;
  
  // Item Variation methods
  getItemVariations(physicalItemId: number): Promise<ItemVariation[]>;
  createItemVariation(data: InsertItemVariation): Promise<ItemVariation>;
  updateItemVariation(id: number, data: UpdateItemVariation): Promise<ItemVariation | undefined>;
  deleteItemVariation(id: number): Promise<boolean>;
  
  // Item Variant Stock methods
  getItemVariantStocks(physicalItemId: number): Promise<ItemVariantStock[]>;
  getItemVariantStockByCombination(physicalItemId: number, combination: string): Promise<ItemVariantStock | undefined>;
  createItemVariantStock(data: InsertItemVariantStock): Promise<ItemVariantStock>;
  updateItemVariantStock(id: number, stock: number): Promise<ItemVariantStock | undefined>;
  deleteItemVariantStock(id: number): Promise<boolean>;
}

interface CreateRedemptionData {
  accountId: string;
  tokenId: string;
  physicalItemId: number;
  amount: number;
  shippingInfo: ShippingInfo;
  orderId: string;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<string, Token>;
  private physicalItems: Map<number, PhysicalItem>;
  private tokenConfigurations: Map<number, TokenConfiguration>;
  private redemptions: Map<string, Redemption>;
  private shops: Map<number, Shop>;
  private shopItems: Map<number, ShopItem>;
  private itemVariations: Map<number, ItemVariation>;
  private itemVariantStocks: Map<number, ItemVariantStock>;
  private currentUserId: number;
  private currentPhysicalItemId: number;
  private currentTokenConfigId: number;
  private currentShopId: number;
  private currentShopItemId: number;
  private currentItemVariationId: number;
  private currentItemVariantStockId: number;
  public sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.physicalItems = new Map();
    this.tokenConfigurations = new Map();
    this.redemptions = new Map();
    this.shops = new Map();
    this.shopItems = new Map();
    this.itemVariations = new Map();
    this.itemVariantStocks = new Map();
    this.currentUserId = 1;
    this.currentPhysicalItemId = 1;
    this.currentTokenConfigId = 1;
    this.currentShopId = 1;
    this.currentShopItemId = 1;
    this.currentItemVariationId = 1;
    this.currentItemVariantStockId = 1;
    
    // Create memory session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24 hours
    });
    
    // Seed initial data
    this.seedData();
  }
  
  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
  
  private seedData() {
    // Seed admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: 'admin',
      password: this.hashPassword('admin123'),
      email: 'admin@example.com',
      accountId: null, // Admin will not use wallet login
      isAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.users.set(adminUser.id, adminUser);
    
    // Seed physical items
    const physicalItems: PhysicalItem[] = [
      {
        id: this.currentPhysicalItemId++,
        name: "Limited Edition Merchandise Pack",
        description: "A collection of limited edition merchandise including t-shirts, stickers, and a tote bag.",
        imageUrl: "https://example.com/merch-pack.jpg",
        stock: 100,
        hasVariations: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentPhysicalItemId++,
        name: "Exclusive Branded Apparel",
        description: "High-quality branded apparel with blockchain-themed designs.",
        imageUrl: "https://example.com/apparel.jpg",
        stock: 50,
        hasVariations: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentPhysicalItemId++,
        name: "Collectible Hedera-themed Item",
        description: "Rare collectible item for Hedera enthusiasts. Limited supply available.",
        imageUrl: "https://example.com/collectible.jpg",
        stock: 25,
        hasVariations: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    physicalItems.forEach(item => {
      this.physicalItems.set(item.id, item);
    });
    
    // Seed shops
    const shops: Shop[] = [
      {
        id: this.currentShopId++,
        name: "Limited Edition Collection",
        description: "Exclusive items available for token redemption. Get them while supplies last!",
        imageUrl: "https://example.com/limited-edition.jpg",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentShopId++,
        name: "Hedera Merchandise",
        description: "Official Hedera merchandise available for token redemption.",
        imageUrl: "https://example.com/hedera-merchandise.jpg",
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentShopId++,
        name: "Community Rewards",
        description: "Redeem your community tokens for exclusive physical items.",
        imageUrl: "https://example.com/community-rewards.jpg",
        isActive: false, // This shop is not active yet
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    shops.forEach(shop => {
      this.shops.set(shop.id, shop);
    });
    
    // Seed tokens
    const tokens: Token[] = [
      {
        id: 1,
        tokenId: "0.0.1001",
        name: "Physical Merch Token",
        symbol: "MERCH",
        decimals: 0,
        redemptionItem: "Limited Edition Merchandise Pack",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 2,
        tokenId: "0.0.1002",
        name: "Apparel Token",
        symbol: "APRL",
        decimals: 0,
        redemptionItem: "Exclusive Branded Apparel",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 3,
        tokenId: "0.0.1003",
        name: "Collectible Token",
        symbol: "CLLCT",
        decimals: 0,
        redemptionItem: "Collectible Hedera-themed Item",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    tokens.forEach(token => {
      this.tokens.set(token.tokenId, token);
    });
    
    // Seed token configurations
    const tokenConfigs: TokenConfiguration[] = [
      {
        id: this.currentTokenConfigId++,
        tokenId: "0.0.1001",
        physicalItemId: 1,
        burnAmount: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentTokenConfigId++,
        tokenId: "0.0.1002",
        physicalItemId: 2,
        burnAmount: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: this.currentTokenConfigId++,
        tokenId: "0.0.1003",
        physicalItemId: 3,
        burnAmount: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    
    tokenConfigs.forEach(config => {
      this.tokenConfigurations.set(config.id, config);
    });
    
    // Seed shop items associations - add items to the first shop
    for (let i = 1; i <= 3; i++) {
      const shopItem: ShopItem = {
        id: this.currentShopItemId++,
        shopId: 1, // First shop
        physicalItemId: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.shopItems.set(shopItem.id, shopItem);
    }
    
    // Add first two items to the second shop
    for (let i = 1; i <= 2; i++) {
      const shopItem: ShopItem = {
        id: this.currentShopItemId++,
        shopId: 2, // Second shop
        physicalItemId: i,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.shopItems.set(shopItem.id, shopItem);
    }
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
  
  async getUserByAccountId(accountId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.accountId === accountId,
    );
  }
  
  async createOrGetWalletUser(accountId: string): Promise<User> {
    // Check if user already exists with this account ID
    const existingUser = await this.getUserByAccountId(accountId);
    if (existingUser) {
      return existingUser;
    }
    
    // Create a new user with the wallet account ID
    const id = this.currentUserId++;
    const now = new Date().toISOString();
    
    // For the purpose of this app, we're making all wallet users admins
    // In a production app, you would likely have a whitelist of admin wallet addresses
    const user: User = { 
      id,
      username: `wallet_${accountId.replace(/\./g, '_')}`,
      password: null, // No password for wallet users
      email: null,
      accountId,
      isAdmin: true, // Make wallet users admins by default for this demo
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, user);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const hashedPassword = insertUser.password ? this.hashPassword(insertUser.password) : null;
    const now = new Date().toISOString();
    
    const user: User = { 
      id,
      username: insertUser.username!,  // Force non-null assertion since username should always be provided
      password: hashedPassword,
      email: insertUser.email ?? null,  // Use nullish coalescing to ensure null not undefined
      accountId: insertUser.accountId ?? null, // Use nullish coalescing to ensure null not undefined
      isAdmin: insertUser.isAdmin || false,
      createdAt: now,
      updatedAt: now
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async validateUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;
    
    const hashedPassword = this.hashPassword(password);
    if (user.password === hashedPassword) {
      return user;
    }
    
    return null;
  }
  
  // Physical Item methods
  async getPhysicalItems(): Promise<PhysicalItem[]> {
    return Array.from(this.physicalItems.values());
  }
  
  async getPhysicalItem(id: number): Promise<PhysicalItem | undefined> {
    return this.physicalItems.get(id);
  }
  
  async createPhysicalItem(item: InsertPhysicalItem): Promise<PhysicalItem> {
    const id = this.currentPhysicalItemId++;
    const now = new Date().toISOString();
    
    const physicalItem: PhysicalItem = {
      id,
      name: item.name,
      description: item.description || null,
      imageUrl: item.imageUrl || null,
      stock: item.stock || 0,
      hasVariations: item.hasVariations || false,
      createdAt: now,
      updatedAt: now
    };
    
    this.physicalItems.set(id, physicalItem);
    return physicalItem;
  }
  
  async updatePhysicalItem(id: number, data: UpdatePhysicalItem): Promise<PhysicalItem | undefined> {
    const item = this.physicalItems.get(id);
    if (!item) return undefined;
    
    const updated: PhysicalItem = {
      ...item,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.physicalItems.set(id, updated);
    return updated;
  }
  
  async deletePhysicalItem(id: number): Promise<boolean> {
    return this.physicalItems.delete(id);
  }
  
  // Token methods
  async getTokens(): Promise<Token[]> {
    return Array.from(this.tokens.values());
  }
  
  async getTokensByAccountId(accountId: string): Promise<Token[]> {
    // In a real app, we would fetch tokens that are owned by this account
    // from the Hedera network or from our database
    // For this demo, we'll return all tokens with random balances
    
    return Array.from(this.tokens.values()).map(token => {
      // Add a random balance for demo purposes
      const balance = Math.floor(Math.random() * 200) + 1;
      return { ...token, balance };
    });
  }
  
  async getTokenById(tokenId: string): Promise<Token | undefined> {
    return this.tokens.get(tokenId);
  }
  
  async createToken(token: InsertToken): Promise<Token> {
    const id = this.tokens.size + 1;
    const now = new Date().toISOString();
    
    const newToken: Token = {
      id,
      tokenId: token.tokenId,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      redemptionItem: token.redemptionItem || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.tokens.set(token.tokenId, newToken);
    return newToken;
  }
  
  async updateToken(tokenId: string, data: UpdateToken): Promise<Token | undefined> {
    const token = this.tokens.get(tokenId);
    if (!token) return undefined;
    
    const updated: Token = {
      ...token,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.tokens.set(tokenId, updated);
    return updated;
  }
  
  async deleteToken(tokenId: string): Promise<boolean> {
    return this.tokens.delete(tokenId);
  }
  
  // Token Configuration methods
  async getTokenConfigurations(): Promise<TokenConfiguration[]> {
    return Array.from(this.tokenConfigurations.values());
  }
  
  async getTokenConfiguration(id: number): Promise<TokenConfiguration | undefined> {
    return this.tokenConfigurations.get(id);
  }
  
  async getTokenConfigurationsByPhysicalItem(physicalItemId: number): Promise<TokenConfiguration[]> {
    return Array.from(this.tokenConfigurations.values()).filter(
      config => config.physicalItemId === physicalItemId
    );
  }
  
  async getTokenConfigurationsByToken(tokenId: string): Promise<TokenConfiguration[]> {
    return Array.from(this.tokenConfigurations.values()).filter(
      config => config.tokenId === tokenId
    );
  }
  
  async createTokenConfiguration(config: InsertTokenConfiguration): Promise<TokenConfiguration> {
    const id = this.currentTokenConfigId++;
    const now = new Date().toISOString();
    
    const tokenConfig: TokenConfiguration = {
      id,
      tokenId: config.tokenId,
      physicalItemId: config.physicalItemId,
      burnAmount: config.burnAmount || 1,
      isActive: config.isActive || true,
      createdAt: now,
      updatedAt: now
    };
    
    this.tokenConfigurations.set(id, tokenConfig);
    return tokenConfig;
  }
  
  async updateTokenConfiguration(id: number, data: UpdateTokenConfiguration): Promise<TokenConfiguration | undefined> {
    const config = this.tokenConfigurations.get(id);
    if (!config) return undefined;
    
    const updated: TokenConfiguration = {
      ...config,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.tokenConfigurations.set(id, updated);
    return updated;
  }
  
  async deleteTokenConfiguration(id: number): Promise<boolean> {
    return this.tokenConfigurations.delete(id);
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
      physicalItemId: data.physicalItemId,
      amount: data.amount,
      transactionId: null,
      trackingNumber: null,
      trackingUrl: null,
      carrier: null,
      notes: null,
      shippingInfo: data.shippingInfo,
      status: "pending",
      fulfillmentUpdates: [],
      estimatedDelivery: null,
      createdAt: now,
      updatedAt: now
    };
    
    // Add initial fulfillment update
    const initialUpdate = {
      status: "pending",
      timestamp: now,
      message: "Order received",
      performedBy: "system"
    };
    
    redemption.fulfillmentUpdates = [initialUpdate];
    
    this.redemptions.set(data.orderId, redemption);
    return redemption;
  }
  
  async updateRedemption(orderId: string, data: UpdateRedemption): Promise<Redemption | undefined> {
    const redemption = this.redemptions.get(orderId);
    
    if (!redemption) {
      return undefined;
    }
    
    const now = new Date().toISOString();
    
    // Handle the fulfillment update
    let fulfillmentUpdates: FulfillmentUpdate[] = Array.isArray(redemption.fulfillmentUpdates) ? 
      [...redemption.fulfillmentUpdates] : [];
    
    // If there's a new fulfillment update, add it to the history
    if (data.fulfillmentUpdate) {
      const newUpdate: FulfillmentUpdate = {
        ...data.fulfillmentUpdate,
        timestamp: data.fulfillmentUpdate.timestamp || now
      };
      fulfillmentUpdates = [...fulfillmentUpdates, newUpdate];
    } 
    // If a complete replacement is provided (admin only), use that
    else if (data.fulfillmentUpdates && Array.isArray(data.fulfillmentUpdates)) {
      fulfillmentUpdates = [...data.fulfillmentUpdates];
    }
    
    const updated: Redemption = {
      ...redemption,
      status: data.status,
      updatedAt: now,
      fulfillmentUpdates,
      // Only update these fields if they are provided
      ...(data.transactionId !== undefined && { transactionId: data.transactionId }),
      ...(data.trackingNumber !== undefined && { trackingNumber: data.trackingNumber }),
      ...(data.trackingUrl !== undefined && { trackingUrl: data.trackingUrl }),
      ...(data.carrier !== undefined && { carrier: data.carrier }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.estimatedDelivery !== undefined && { estimatedDelivery: data.estimatedDelivery })
    };
    
    this.redemptions.set(orderId, updated);
    return updated;
  }

  // Shop Items methods
  async getShopItems(shopId: number): Promise<PhysicalItem[]> {
    // Find all shop items associated with this shop
    const shopItemEntries = Array.from(this.shopItems.values())
      .filter(item => item.shopId === shopId);
    
    // Get the corresponding physical items
    const physicalItems: PhysicalItem[] = [];
    for (const shopItem of shopItemEntries) {
      const item = this.physicalItems.get(shopItem.physicalItemId);
      if (item) {
        physicalItems.push(item);
      }
    }
    
    return physicalItems;
  }
  
  async addItemToShop(shopId: number, physicalItemId: number): Promise<ShopItem> {
    // Check if shop and item exist
    const shop = this.shops.get(shopId);
    const item = this.physicalItems.get(physicalItemId);
    
    if (!shop || !item) {
      throw new Error('Shop or physical item not found');
    }
    
    // Check if association already exists
    const existingAssociation = Array.from(this.shopItems.values()).find(
      shopItem => shopItem.shopId === shopId && shopItem.physicalItemId === physicalItemId
    );
    
    if (existingAssociation) {
      return existingAssociation;
    }
    
    // Create new association
    const id = this.currentShopItemId++;
    const now = new Date().toISOString();
    
    const shopItem: ShopItem = {
      id,
      shopId,
      physicalItemId,
      createdAt: now,
      updatedAt: now
    };
    
    this.shopItems.set(id, shopItem);
    return shopItem;
  }
  
  async removeItemFromShop(shopId: number, physicalItemId: number): Promise<boolean> {
    // Find the shop item entry
    const shopItemEntry = Array.from(this.shopItems.entries()).find(
      ([_, item]) => item.shopId === shopId && item.physicalItemId === physicalItemId
    );
    
    if (!shopItemEntry) {
      return false;
    }
    
    // Delete the association
    return this.shopItems.delete(shopItemEntry[0]);
  }

  // Shop methods
  async getShops(): Promise<Shop[]> {
    return Array.from(this.shops.values());
  }

  async getActiveShops(): Promise<Shop[]> {
    return Array.from(this.shops.values()).filter(shop => shop.isActive);
  }

  async getShop(id: number): Promise<Shop | undefined> {
    return this.shops.get(id);
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const id = this.currentShopId++;
    const now = new Date().toISOString();
    
    const newShop: Shop = {
      id,
      name: shop.name,
      description: shop.description,
      imageUrl: shop.imageUrl || null,
      isActive: shop.isActive ?? true,
      createdAt: now,
      updatedAt: now
    };
    
    this.shops.set(id, newShop);
    return newShop;
  }

  async updateShop(id: number, data: UpdateShop): Promise<Shop | undefined> {
    const shop = this.shops.get(id);
    if (!shop) return undefined;
    
    const updated: Shop = {
      ...shop,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.shops.set(id, updated);
    return updated;
  }

  async deleteShop(id: number): Promise<boolean> {
    return this.shops.delete(id);
  }

  // Item Variation methods
  async getItemVariations(physicalItemId: number): Promise<ItemVariation[]> {
    return Array.from(this.itemVariations.values()).filter(
      variation => variation.physicalItemId === physicalItemId
    );
  }

  async createItemVariation(data: InsertItemVariation): Promise<ItemVariation> {
    const id = this.currentItemVariationId++;
    const now = new Date().toISOString();
    
    const itemVariation: ItemVariation = {
      id,
      physicalItemId: data.physicalItemId,
      name: data.name,
      options: data.options,
      createdAt: now,
      updatedAt: now
    };
    
    this.itemVariations.set(id, itemVariation);
    return itemVariation;
  }

  async updateItemVariation(id: number, data: UpdateItemVariation): Promise<ItemVariation | undefined> {
    const variation = this.itemVariations.get(id);
    if (!variation) return undefined;
    
    const updated: ItemVariation = {
      ...variation,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.itemVariations.set(id, updated);
    return updated;
  }

  async deleteItemVariation(id: number): Promise<boolean> {
    return this.itemVariations.delete(id);
  }

  // Item Variant Stock methods
  async getItemVariantStocks(physicalItemId: number): Promise<ItemVariantStock[]> {
    return Array.from(this.itemVariantStocks.values()).filter(
      stock => stock.physicalItemId === physicalItemId
    );
  }

  async getItemVariantStockByCombination(physicalItemId: number, combination: string): Promise<ItemVariantStock | undefined> {
    return Array.from(this.itemVariantStocks.values()).find(
      stock => stock.physicalItemId === physicalItemId && stock.combination === combination
    );
  }

  async createItemVariantStock(data: InsertItemVariantStock): Promise<ItemVariantStock> {
    const id = this.currentItemVariantStockId++;
    const now = new Date().toISOString();
    
    const itemVariantStock: ItemVariantStock = {
      id,
      physicalItemId: data.physicalItemId,
      combination: data.combination,
      stock: data.stock || 0,
      createdAt: now,
      updatedAt: now
    };
    
    this.itemVariantStocks.set(id, itemVariantStock);
    return itemVariantStock;
  }

  async updateItemVariantStock(id: number, stock: number): Promise<ItemVariantStock | undefined> {
    const variantStock = this.itemVariantStocks.get(id);
    if (!variantStock) return undefined;
    
    const updated: ItemVariantStock = {
      ...variantStock,
      stock,
      updatedAt: new Date().toISOString()
    };
    
    this.itemVariantStocks.set(id, updated);
    return updated;
  }

  async deleteItemVariantStock(id: number): Promise<boolean> {
    return this.itemVariantStocks.delete(id);
  }
}

export const storage = new MemStorage();
