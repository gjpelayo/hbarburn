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
      const privateKey = PrivateKey.fromString(operatorKey);
      client.setOperator(AccountId.fromString(operatorId), privateKey);
    } catch (error) {
      console.error("Error setting operator:", error);
    }
  }

  return client;
};

// Initialize the client by default
initializeClient(
  process.env.HEDERA_OPERATOR_ID,
  process.env.HEDERA_OPERATOR_KEY
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
    return null;
  }
  
  // Check if we're in development mode
  if (process.env.NODE_ENV !== 'production') {
    // Check if we have operator credentials - if not, we can't properly verify tokens in testnet
    const hasOperator = client && client.operatorAccountId && client.operatorPublicKey;
    if (!hasOperator) {
      console.log("No operator credentials for Hedera client, skipping network verification");
      return null;
    }
  }
  
  try {
    const token = TokenId.fromString(tokenId);
    
    // Query token info from Hedera
    const query = new TokenInfoQuery()
      .setTokenId(token);
    
    const tokenInfo = await query.execute(client);
    
    if (!tokenInfo) {
      return null;
    }
    
    // Return formatted token info
    return {
      tokenId: token.toString(),
      name: tokenInfo.name.toString(),
      symbol: tokenInfo.symbol.toString(),
      decimals: tokenInfo.decimals,
      totalSupply: Number(tokenInfo.totalSupply.toString()),
      isDeleted: tokenInfo.isDeleted,
      tokenType: tokenInfo.tokenType ? tokenInfo.tokenType.toString() : "FUNGIBLE"
    };
  } catch (error) {
    console.error("Error verifying token on Hedera:", error);
    return null; // Token doesn't exist or other error
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