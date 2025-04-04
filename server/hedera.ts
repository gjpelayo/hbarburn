import { 
  TokenId, 
  AccountId, 
  TransactionId, 
  Client, 
  TokenBurnTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
  TokenInfoQuery,
  PrivateKey,
  Hbar
} from "@hashgraph/sdk";

// Initialize Hedera client for server-side use
let client: Client;

export const initializeClient = (operatorId?: string, operatorKey?: string) => {
  // Use testnet by default, or mainnet if specified in env
  const isMainnet = process.env.VITE_HEDERA_NETWORK === "mainnet";
    
  if (isMainnet) {
    client = Client.forMainnet();
  } else {
    client = Client.forTestnet();
  }

  // If operator credentials are provided, set them on the client
  if (operatorId && operatorKey) {
    try {
      console.log("Initializing Hedera client with operator:", operatorId);
      const privateKey = PrivateKey.fromString(operatorKey);
      client.setOperator(AccountId.fromString(operatorId), privateKey);
      console.log("Hedera client initialized successfully with operator");
    } catch (error) {
      console.error("Error setting Hedera operator:", error);
    }
  } else {
    console.log("No Hedera operator credentials provided - client will have limited functionality");
    console.log("Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY for full functionality");
  }

  return client;
};

// Initialize the client with the new operator credentials
initializeClient(
  "0.0.3531301",
  "0x6d07c01f164c9d9ab5fe8a57dfc98548fe0315492f362067d8925f6e735295c6"
);

// Helper function to validate an account ID string
export function isValidAccountId(accountId: string): boolean {
  try {
    AccountId.fromString(accountId);
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to validate a token ID string format
export function isValidTokenId(tokenId: string): boolean {
  try {
    TokenId.fromString(tokenId);
    return true;
  } catch (error) {
    return false;
  }
}

// Interface for token information
export interface TokenInfo {
  tokenId: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number;
  isDeleted: boolean;
  tokenType: string;
}

// Verify if a token exists on the Hedera network and is a valid HTS token
export async function verifyTokenOnHedera(tokenId: string): Promise<TokenInfo | null> {
  if (!isValidTokenId(tokenId)) {
    console.error("Invalid token ID format:", tokenId);
    return null;
  }
  
  // Check if we have operator credentials - if not, we can't properly verify tokens
  const hasOperator = client && client.operatorAccountId && client.operatorPublicKey;
  console.log("Checking operator status:", { 
    hasOperator, 
    operatorId: client?.operatorAccountId?.toString() 
  });
  
  if (!hasOperator) {
    console.log("No operator credentials for Hedera client, using specific token hardcoded lookup for known tokens");
    
    // For specific tokens, we can return hardcoded info if we know about them
    // This allows the app to function with real token IDs even without operator credentials
    // but only for tokens we explicitly define
    const knownTokens: { [key: string]: TokenInfo } = {
      "0.0.786931": {
        tokenId: "0.0.786931",
        name: "Blast Token",
        symbol: "BLAST",
        decimals: 8,
        totalSupply: 1000000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      },
      "0.0.8052597": {
        tokenId: "0.0.8052597",
        name: "AuraToken",
        symbol: "AURA",
        decimals: 6,
        totalSupply: 5000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      },
      "0.0.8397255": {
        tokenId: "0.0.8397255",
        name: "SponsorCoin",
        symbol: "SPON",
        decimals: 8,
        totalSupply: 10000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      }
    };
    
    if (knownTokens[tokenId]) {
      console.log("Found hardcoded info for token:", tokenId);
      return knownTokens[tokenId];
    }
    
    console.log("Token not found in hardcoded list, and no operator to verify on network:", tokenId);
    return null;
  }
  
  try {
    console.log("Attempting to verify token on Hedera network with operator ID:", client.operatorAccountId?.toString());
    const token = TokenId.fromString(tokenId);
    
    // Query token info from Hedera with a timeout
    const query = new TokenInfoQuery()
      .setTokenId(token)
      .setMaxQueryPayment(new Hbar(0.1));  // Set a reasonable max payment
    
    console.log("Executing TokenInfoQuery for token:", tokenId);
    const tokenInfo = await query.execute(client);
    
    if (!tokenInfo) {
      console.log("Token not found on Hedera:", tokenId);
      return null;
    }
    
    const result = {
      tokenId: token.toString(),
      name: tokenInfo.name.toString(),
      symbol: tokenInfo.symbol.toString(),
      decimals: tokenInfo.decimals,
      totalSupply: Number(tokenInfo.totalSupply.toString()),
      isDeleted: tokenInfo.isDeleted,
      tokenType: tokenInfo.tokenType ? tokenInfo.tokenType.toString() : "FUNGIBLE"
    };
    
    console.log("Token verified on Hedera network successfully:", result);
    return result;
  } catch (error) {
    console.error("Error verifying token on Hedera network:", error);
    
    // Even if verification fails, check our hardcoded list as a fallback
    const knownTokens: { [key: string]: TokenInfo } = {
      "0.0.786931": {
        tokenId: "0.0.786931",
        name: "Blast Token",
        symbol: "BLAST",
        decimals: 8,
        totalSupply: 1000000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      },
      "0.0.8052597": {
        tokenId: "0.0.8052597",
        name: "AuraToken",
        symbol: "AURA",
        decimals: 6,
        totalSupply: 5000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      },
      "0.0.8397255": {
        tokenId: "0.0.8397255",
        name: "SponsorCoin",
        symbol: "SPON",
        decimals: 8,
        totalSupply: 10000000,
        isDeleted: false,
        tokenType: "FUNGIBLE"
      }
    };
    
    if (knownTokens[tokenId]) {
      console.log("Error occurred but found hardcoded info for token:", tokenId);
      return knownTokens[tokenId];
    }
    
    return null; // Token doesn't exist or other error
  }
}

// Fetch all token balances for an account
export async function getAccountTokenBalances(accountId: string): Promise<Map<string, number>> {
  try {
    // Check if we have operator credentials
    const hasOperator = client && client.operatorAccountId && client.operatorPublicKey;
    console.log("Checking operator status for token balances:", { 
      hasOperator, 
      operatorId: client?.operatorAccountId?.toString() 
    });
    
    if (!hasOperator) {
      console.log("No operator credentials for Hedera client, using hardcoded balances for development");
      
      // For demonstration and testing, we can return hardcoded balances for known account IDs
      // This allows the app to function without operator credentials in development
      if (accountId === "0.0.123456") {
        console.log("Using hardcoded balances for demo account: 0.0.123456");
        const result = new Map<string, number>();
        result.set("0.0.786931", 1000);
        result.set("0.0.8052597", 500);
        result.set("0.0.8397255", 750);
        return result;
      }
      
      return new Map<string, number>();
    }
    
    console.log("Attempting to fetch token balances for account:", accountId, "with operator:", client.operatorAccountId?.toString());
    const account = AccountId.fromString(accountId);
    
    const query = new AccountBalanceQuery()
      .setAccountId(account)
      .setMaxQueryPayment(new Hbar(0.1));  // Set a reasonable max payment
    
    console.log("Executing AccountBalanceQuery for account:", accountId);
    const accountBalance = await query.execute(client);
    console.log("AccountBalanceQuery executed successfully");
    
    // Convert to a regular Map for easier use
    const result = new Map<string, number>();
    
    if (!accountBalance.tokens) {
      console.log("No tokens found for account:", accountId);
      return result;
    }
    
    console.log("Raw token balance data:", accountBalance.tokens);
    const tokenBalances = accountBalance.tokens._map;
    
    if (!tokenBalances) {
      console.log("No token balances map available");
      return result;
    }
    
    console.log("Processing token balances map with size:", tokenBalances.size);
    
    tokenBalances.forEach((balance, tokenId) => {
      // Convert Long to number
      const balanceNumber = Number(balance.toString());
      console.log(`Token ${tokenId} has balance:`, balanceNumber);
      
      // Only add tokens with a non-zero balance
      if (balanceNumber > 0) {
        result.set(tokenId, balanceNumber);
      }
    });
    
    console.log(`Found ${result.size} tokens with non-zero balance for account:`, accountId);
    return result;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    
    // For development, provide hardcoded test balances as fallback
    if (process.env.NODE_ENV !== 'production') {
      console.log("Error occurred, using fallback balances for development");
      const result = new Map<string, number>();
      
      // Only do this for specific accounts to avoid confusion
      if (accountId === "0.0.123456") {
        console.log("Using hardcoded fallback balances for demo account: 0.0.123456");
        result.set("0.0.786931", 1000);
        result.set("0.0.8052597", 500);
        result.set("0.0.8397255", 750);
      }
      
      return result;
    }
    
    throw new Error("Failed to fetch token balances");
  }
}

// Helper function to parse and format a transaction ID
export function formatTransactionId(transactionId: string): string {
  try {
    const txId = TransactionId.fromString(transactionId);
    return txId.toString();
  } catch (error) {
    // If it's not a valid transaction ID format, return as is
    return transactionId;
  }
}

// Export the client for server-side use
export { client };