import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { TokenBurnTransaction, TokenId, AccountId } from '@hashgraph/sdk';
import { initializeClient, client } from './hedera';

// Define a project ID from WalletConnect Dashboard
// You should get this from WalletConnect Dashboard
const PROJECT_ID = "1e30abcb50dc0a3eb2c7bc0f9cf7f25c";

// Create state management
const state = {
  signClient: null as SignClient | null,
  session: null as SessionTypes.Struct | null,
  accountId: null as string | null,
  isConnected: false,
  chainId: "hedera:testnet", // Using testnet for development
  isInitializing: false,
  isInitialized: false
};

export async function initializeWalletConnect(): Promise<void> {
  try {
    if (state.isInitialized || state.isInitializing) {
      console.log("WalletConnect client already initialized or initializing");
      return;
    }
    
    state.isInitializing = true;
    console.log("Initializing WalletConnect...");
    
    if (state.signClient) {
      console.log("WalletConnect client already initialized");
      state.isInitialized = true;
      state.isInitializing = false;
      return;
    }

    const signClient = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: "Hedera Token Burn App",
        description: "Burn tokens to redeem physical items",
        url: window.location.origin,
        icons: [window.location.origin + "/logo.png"],
      },
    });

    state.signClient = signClient;

    // Check if there is an existing session
    const lastKeyIndex = signClient.session.getAll().length - 1;
    if (lastKeyIndex >= 0) {
      const lastSession = signClient.session.getAll()[lastKeyIndex];
      if (lastSession && lastSession.expiry > Math.floor(Date.now() / 1000)) {
        state.session = lastSession;
        
        // Extract the account ID from the session
        const accountAddresses = Object.values(lastSession.namespaces)
          .flatMap(namespace => namespace.accounts)
          .filter(address => address.startsWith(state.chainId));
          
        if (accountAddresses.length > 0) {
          // Extract Hedera account ID from the address format: hedera:mainnet:0.0.12345
          const accountAddress = accountAddresses[0];
          const accountId = accountAddress.split(':')[2];
          state.accountId = accountId;
          state.isConnected = true;
          localStorage.setItem("walletconnect_account", accountId);
          console.log("Restored WalletConnect session with account:", accountId);
        }
      }
    }

    // Setup event listeners
    signClient.on("session_delete", () => {
      console.log("Session deleted -> disconnected");
      state.session = null;
      state.accountId = null;
      state.isConnected = false;
      localStorage.removeItem("walletconnect_account");
    });
    
    state.isInitialized = true;
    state.isInitializing = false;
    console.log("WalletConnect initialized successfully");
  } catch (error) {
    state.isInitializing = false;
    console.error("Error initializing WalletConnect:", error);
    throw error;
  }
}

export async function connectWalletConnect() {
  try {
    if (!state.signClient) {
      await initializeWalletConnect();
      if (!state.signClient) {
        throw new Error("Failed to initialize WalletConnect");
      }
    }

    if (state.isConnected && state.accountId) {
      console.log("Already connected to WalletConnect with account:", state.accountId);
      return {
        success: true,
        accountId: state.accountId,
      };
    }

    console.log("Connecting to WalletConnect...");
    
    // Prepare connection parameters
    const { uri, approval } = await state.signClient.connect({
      requiredNamespaces: {
        hedera: {
          methods: ["hedera_signAndExecuteTransaction"],
          chains: [state.chainId],
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    // Display QR code using the WalletConnect modal
    if (uri) {
      QRCodeModal.open(uri, () => {
        console.log("QR Code Modal closed");
      });
    }

    // Wait for the user to approve the session
    const session = await approval();
    QRCodeModal.close();
    
    state.session = session;
    
    // Extract the account ID from the session
    const accountAddresses = Object.values(session.namespaces)
      .flatMap(namespace => namespace.accounts)
      .filter(address => address.startsWith(state.chainId));
      
    if (accountAddresses.length === 0) {
      throw new Error("No Hedera accounts found in session");
    }
    
    // Extract Hedera account ID from the address format: hedera:mainnet:0.0.12345
    const accountAddress = accountAddresses[0];
    const accountId = accountAddress.split(':')[2];
    
    // Store the account
    state.accountId = accountId;
    state.isConnected = true;
    localStorage.setItem("walletconnect_account", accountId);
    
    console.log("Connected to WalletConnect with account:", accountId);
    
    return {
      success: true,
      accountId: accountId,
    };
  } catch (error) {
    console.error("WalletConnect connection error:", error);
    QRCodeModal.close();
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect",
    };
  }
}

export async function disconnectWalletConnect() {
  try {
    if (!state.session || !state.signClient) {
      console.log("No active WalletConnect session to disconnect");
      
      // Clean up local state anyway
      state.session = null;
      state.accountId = null;
      state.isConnected = false;
      localStorage.removeItem("walletconnect_account");
      
      return true;
    }
    
    console.log("Disconnecting from WalletConnect...");
    await state.signClient.disconnect({
      topic: state.session.topic,
      reason: {
        code: 6000,
        message: "User disconnected",
      },
    });
    
    // Clean up local state
    state.session = null;
    state.accountId = null;
    state.isConnected = false;
    localStorage.removeItem("walletconnect_account");
    
    console.log("Disconnected from WalletConnect");
    return true;
  } catch (error) {
    console.error("WalletConnect disconnection error:", error);
    throw error;
  }
}

export async function burnTokensWithWalletConnect(tokenId: string, amount: number): Promise<string> {
  try {
    if (!state.isConnected || !state.accountId || !state.session || !state.signClient) {
      throw new Error("Not connected to WalletConnect");
    }
    
    // Get account ID
    const accountId = state.accountId;
    
    // Create the burn transaction
    const tokenBurn = new TokenBurnTransaction()
      .setTokenId(TokenId.fromString(tokenId))
      .setAmount(amount);
    
    // In a real implementation, we would:
    // 1. Freeze the transaction
    // 2. Convert to bytes
    // 3. Send to wallet for signing via WalletConnect
    // 4. Receive signed transaction
    // 5. Execute it on the network
    
    // For the purpose of demonstration during development:
    const mockTransactionId = `${accountId}@${Math.floor(Date.now() / 1000)}`;
    return mockTransactionId;
  } catch (error) {
    console.error("WalletConnect burn transaction error:", error);
    throw error;
  }
}

export function getWalletConnectState() {
  return {
    isConnected: state.isConnected,
    accountId: state.accountId,
  };
}