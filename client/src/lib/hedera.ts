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

// Initialize Hedera client (for server-side use)
// In a production environment, you would use environment variables
// for the account ID and private key
let client: Client;

export const initializeClient = (operatorId?: string, operatorKey?: string) => {
  // In browser environment, use import.meta.env
  // In Node.js environment, use process.env
  const isMainnet = typeof process !== 'undefined' && process.env
    ? process.env.VITE_HEDERA_NETWORK === "mainnet" 
    : false;
    
  if (isMainnet) {
    client = Client.forMainnet();
  } else {
    client = Client.forTestnet();
  }

  // If operator credentials are provided, set them on the client
  if (operatorId && operatorKey) {
    try {
      const privateKey = PrivateKey.fromString(operatorKey);
      client.setOperator(AccountId.fromString(operatorId), privateKey);
    } catch (error) {
      console.error("Error setting operator:", error);
    }
  }

  return client;
};

// Initialize the client by default
initializeClient();

// Helper function to validate an account ID string
export function isValidAccountId(accountId: string): boolean {
  try {
    AccountId.fromString(accountId);
    return true;
  } catch (error) {
    return false;
  }
}

// Helper function to validate a token ID string
export function isValidTokenId(tokenId: string): boolean {
  try {
    TokenId.fromString(tokenId);
    return true;
  } catch (error) {
    return false;
  }
}

// Fetch account balance for a specific token
export async function getAccountTokenBalance(accountId: string, tokenId: string): Promise<number> {
  try {
    const account = AccountId.fromString(accountId);
    const token = TokenId.fromString(tokenId);
    
    const query = new AccountBalanceQuery()
      .setAccountId(account);
    
    const accountBalance = await query.execute(client);
    
    if (!accountBalance.tokens) {
      return 0;
    }
    
    const tokenBalanceMap = accountBalance.tokens._map;
    const tokenBalanceObj = tokenBalanceMap?.get(token.toString());
    
    if (!tokenBalanceObj) {
      return 0;
    }
    
    // Convert Long to number
    return Number(tokenBalanceObj.toString());
  } catch (error) {
    console.error("Error fetching token balance:", error);
    throw new Error("Failed to fetch token balance");
  }
}

// Fetch all token balances for an account
export async function getAccountTokenBalances(accountId: string): Promise<Map<string, number>> {
  try {
    const account = AccountId.fromString(accountId);
    
    const query = new AccountBalanceQuery()
      .setAccountId(account);
    
    const accountBalance = await query.execute(client);
    
    // Convert to a regular Map for easier use
    const result = new Map<string, number>();
    
    if (!accountBalance.tokens) {
      return result;
    }
    
    const tokenBalances = accountBalance.tokens._map;
    
    tokenBalances?.forEach((balance, tokenId) => {
      // Convert Long to number
      result.set(tokenId, Number(balance.toString()));
    });
    
    return result;
  } catch (error) {
    console.error("Error fetching token balances:", error);
    throw new Error("Failed to fetch token balances");
  }
}

// Get token information
export async function getTokenInfo(tokenId: string): Promise<any> {
  try {
    const token = TokenId.fromString(tokenId);
    
    const query = new TokenInfoQuery()
      .setTokenId(token);
    
    const tokenInfo = await query.execute(client);
    return tokenInfo;
  } catch (error) {
    console.error("Error fetching token info:", error);
    throw new Error("Failed to fetch token information");
  }
}

// Associate a token with an account
export async function associateTokenWithAccount(accountId: string, tokenId: string, privateKeyStr: string): Promise<string> {
  try {
    const account = AccountId.fromString(accountId);
    const token = TokenId.fromString(tokenId);
    const privateKey = PrivateKey.fromString(privateKeyStr);
    
    // Create the transaction
    const transaction = await new TokenAssociateTransaction()
      .setAccountId(account)
      .setTokenIds([token])
      .freezeWith(client);
    
    // Sign and execute the transaction
    const signedTx = await transaction.sign(privateKey);
    const txResponse = await signedTx.execute(client);
    
    // Get the receipt to ensure the transaction was successful
    const receipt = await txResponse.getReceipt(client);
    if (receipt.status.toString() !== "SUCCESS") {
      throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
    }
    
    return txResponse.transactionId.toString();
  } catch (error) {
    console.error("Error associating token:", error);
    throw new Error("Failed to associate token with account");
  }
}

// Helper function to create a burn transaction (for server-side use)
export async function createBurnTransaction(
  tokenId: string,
  amount: number,
  accountId: string,
  privateKeyStr?: string
): Promise<TokenBurnTransaction> {
  try {
    // Convert string IDs to Hedera SDK objects
    const token = TokenId.fromString(tokenId);
    
    // Create the burn transaction
    const transaction = new TokenBurnTransaction()
      .setTokenId(token)
      .setAmount(amount);
    
    // If private key is provided, sign and freeze the transaction
    if (privateKeyStr) {
      const privateKey = PrivateKey.fromString(privateKeyStr);
      const freezeTx = await transaction.freezeWith(client);
      return await freezeTx.sign(privateKey);
    }
    
    return transaction;
  } catch (error) {
    console.error("Error creating burn transaction:", error);
    throw new Error("Failed to create burn transaction");
  }
}

// Execute a burn transaction with a provided private key
export async function executeBurnTransaction(
  tokenId: string,
  amount: number,
  accountId: string,
  privateKeyStr: string
): Promise<string> {
  try {
    const token = TokenId.fromString(tokenId);
    const account = AccountId.fromString(accountId);
    const privateKey = PrivateKey.fromString(privateKeyStr);
    
    // Create and sign the transaction
    const transaction = await new TokenBurnTransaction()
      .setTokenId(token)
      .setAmount(amount)
      .freezeWith(client);
    
    const signedTx = await transaction.sign(privateKey);
    const txResponse = await signedTx.execute(client);
    
    // Get the receipt to ensure the transaction was successful
    const receipt = await txResponse.getReceipt(client);
    if (receipt.status.toString() !== "SUCCESS") {
      throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
    }
    
    return txResponse.transactionId.toString();
  } catch (error) {
    console.error("Error executing burn transaction:", error);
    throw new Error("Failed to burn tokens");
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

// Interface for token verification response
export interface TokenVerificationResponse {
  isValid: boolean;
  tokenInfo?: {
    tokenId: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    isDeleted: boolean;
    tokenType: string;
  };
  message?: string;
}

// Verify token on Hedera network
// Store local cache of token verification results to avoid repeated network calls
const tokenVerificationCache = new Map<string, TokenVerificationResponse>();

export async function verifyToken(tokenId: string): Promise<TokenVerificationResponse> {
  // Empty token IDs are invalid
  if (!tokenId || tokenId.trim() === '') {
    return {
      isValid: false,
      message: "Token ID cannot be empty"
    };
  }
  
  // Check cache first
  if (tokenVerificationCache.has(tokenId)) {
    console.log("Using cached token verification for:", tokenId);
    return tokenVerificationCache.get(tokenId)!;
  }
  
  // Check format before making a network call
  if (!isValidTokenId(tokenId)) {
    const result = {
      isValid: false,
      message: "Invalid token ID format (should be 0.0.xxxx)"
    };
    tokenVerificationCache.set(tokenId, result);
    return result;
  }
  
  try {
    console.log("Verifying token with API:", tokenId);
    // Call the API to verify the token
    const response = await fetch(`/api/tokens/verify/${tokenId}`);
    
    if (!response.ok) {
      let errorMessage = `Error (${response.status})`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // If response isn't JSON, just use status code
      }
      
      const result = {
        isValid: false,
        message: errorMessage
      };
      tokenVerificationCache.set(tokenId, result);
      return result;
    }
    
    const data = await response.json();
    // Cache the verification result
    tokenVerificationCache.set(tokenId, data);
    return data;
  } catch (error) {
    console.error("Error verifying token:", error);
    
    // In development mode, don't fail completely
    if (import.meta.env.DEV) {
      console.log("In development mode, accepting token format:", tokenId);
      const devResult = {
        isValid: true,
        tokenInfo: {
          tokenId,
          name: `Development Token ${tokenId}`,
          symbol: "DEV",
          decimals: 0,
          totalSupply: 1000000,
          isDeleted: false,
          tokenType: "FUNGIBLE"
        }
      };
      tokenVerificationCache.set(tokenId, devResult);
      return devResult;
    }
    
    const result = {
      isValid: false,
      message: error instanceof Error ? error.message : "Unknown error verifying token"
    };
    tokenVerificationCache.set(tokenId, result);
    return result;
  }
}

// Export the client for server-side use
export { client };
