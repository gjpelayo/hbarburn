import { 
  TokenId, 
  AccountId, 
  TransactionId, 
  Client, 
  TokenBurnTransaction 
} from "@hashgraph/sdk";

// Initialize Hedera client (for server-side use)
// This would normally connect to mainnet, testnet, or a local node
let client: Client;

if (import.meta.env.VITE_HEDERA_NETWORK === "mainnet") {
  client = Client.forMainnet();
} else {
  client = Client.forTestnet();
}

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

// Helper function to create a burn transaction (for server-side use)
export async function createBurnTransaction(
  tokenId: string,
  amount: number,
  operatorAccountId: string
): Promise<TokenBurnTransaction> {
  try {
    // Convert string IDs to Hedera SDK objects
    const token = TokenId.fromString(tokenId);
    
    // Create the burn transaction
    const transaction = new TokenBurnTransaction()
      .setTokenId(token)
      .setAmount(amount);
    
    return transaction;
  } catch (error) {
    console.error("Error creating burn transaction:", error);
    throw new Error("Failed to create burn transaction");
  }
}

// Helper function to parse and format a transaction ID
export function formatTransactionId(transactionId: string): string {
  try {
    // For a properly formatted transaction ID like 0.0.1234@1610418338.620670999
    // Just return it as is
    return transactionId;
  } catch (error) {
    // If it's not a valid transaction ID format, return as is
    return transactionId;
  }
}

// Export the client for server-side use
export { client };
