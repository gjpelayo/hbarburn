import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import { TokenBurnTransaction, TokenId, TransactionId } from "@hashgraph/sdk";
import { initializeClient, client } from "./hedera";

// Project ID from WalletConnect Dashboard
// Important: This should never be hardcoded but stored in environment vars
const PROJECT_ID = "dd8571093863d23ee3ec10aefe7db59f";

// Constants for WalletConnect
const WALLETCONNECT_RELAY_URL = "wss://relay.walletconnect.org";

// Define Hedera namespace for WalletConnect
const HEDERA_NAMESPACE = "hedera";
const HEDERA_REFERENCE = "https://hedera.com/";
const HEDERA_METHODS = [
  "hedera_signTransaction",
  "hedera_signAndExecuteTransaction",
  "hedera_executeTransaction",
  "hedera_signMessage",
];
const HEDERA_EVENTS = ["accountsChanged", "chainChanged"];

// Define Hedera chain IDs (mainnet=295, testnet=296, previewnet=297)
const HEDERA_CHAIN_IDS = [
  "hedera:295", // mainnet
  "hedera:296", // testnet
  "hedera:297", // previewnet
];

// Store client and session state
const state = {
  signClient: null as SignClient | null,
  session: null as SessionTypes.Struct | null,
  accounts: [] as string[],
  pairingTopic: null as string | null,
  isConnected: false,
  isInitializing: false,
  chainId: "hedera:296", // Default to testnet
  walletName: "",
};

/**
 * Initialize WalletConnect client
 * 
 * This creates and initializes a WalletConnect Sign Client configured 
 * for Hedera network operations.
 */
export async function initializeWalletConnectClient(): Promise<void> {
  try {
    // Prevent multiple initializations
    if (state.isInitializing) {
      console.log("WalletConnect initialization already in progress");
      return;
    }
    
    if (state.signClient) {
      console.log("WalletConnect client already initialized");
      return;
    }
    
    state.isInitializing = true;
    console.log("Initializing WalletConnect client...");

    // Create SignClient instance
    const signClient = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: {
        name: "Hedera Token Redemption",
        description: "Hedera token redemption platform for physical goods",
        url: typeof window !== "undefined" ? window.location.origin : "https://token-redemption.app",
        icons: [typeof window !== "undefined" 
          ? `${window.location.origin}/favicon.ico`
          : "https://token-redemption.app/favicon.ico"
        ],
      },
    });
    
    state.signClient = signClient;
    console.log("WalletConnect client initialized successfully");
    
    // Set up event listeners
    registerEventListeners();
    
    // Check for existing sessions
    restoreExistingSession();
    
    state.isInitializing = false;
  } catch (error) {
    state.isInitializing = false;
    console.error("Error initializing WalletConnect:", error);
    throw error;
  }
}

/**
 * Register event listeners for WalletConnect client
 */
function registerEventListeners() {
  if (!state.signClient) return;
  
  // Session events
  state.signClient.on("session_event", (args: any) => {
    const event = args.event;
    console.log("WalletConnect session event:", event);

    // Handle account changes
    if (event.name === "accountsChanged") {
      console.log("Accounts changed:", event.data);
      if (Array.isArray(event.data)) {
        state.accounts = event.data as string[];
      }
    }
    
    // Handle chain changes
    if (event.name === "chainChanged") {
      console.log("Chain changed:", event.data);
      if (typeof event.data === "string") {
        state.chainId = event.data as string;
      }
    }
  });

  // Session updates
  state.signClient.on("session_update", ({ topic, params }) => {
    console.log("WalletConnect session update:", params);
    const { namespaces } = params;
    
    if (!state.session) return;
    
    // Update session with new namespaces
    const _session = state.signClient?.session.get(topic);
    if (_session) {
      state.session = _session;
      
      // Extract accounts from namespace
      if (namespaces[HEDERA_NAMESPACE]?.accounts) {
        state.accounts = namespaces[HEDERA_NAMESPACE].accounts;
      }
    }
  });

  // Session delete (disconnect)
  state.signClient.on("session_delete", ({ topic }) => {
    console.log("WalletConnect session deleted");
    resetState();
  });
}

/**
 * Reset the WalletConnect state
 */
function resetState() {
  state.session = null;
  state.accounts = [];
  state.pairingTopic = null;
  state.isConnected = false;
  
  // Clear local storage
  localStorage.removeItem("wc_session_topic");
  localStorage.removeItem("wc_account");
}

/**
 * Restore existing WalletConnect session if available
 */
function restoreExistingSession() {
  if (!state.signClient) return;
  
  try {
    // Get active sessions
    const sessions = state.signClient.session.getAll();
    console.log("Found existing sessions:", sessions.length);
    
    // Use the most recent valid session
    if (sessions.length > 0) {
      const mostRecentSession = sessions[sessions.length - 1];
      
      // Verify if the session contains Hedera namespace
      if (mostRecentSession.namespaces[HEDERA_NAMESPACE]) {
        state.session = mostRecentSession;
        state.accounts = mostRecentSession.namespaces[HEDERA_NAMESPACE].accounts || [];
        state.isConnected = true;
        
        // Get the wallet name if available
        try {
          state.walletName = mostRecentSession.peer.metadata.name || "";
        } catch (e) {
          console.warn("Could not get wallet name:", e);
        }
        
        // Store the session topic
        localStorage.setItem("wc_session_topic", mostRecentSession.topic);
        
        // Store account if available
        if (state.accounts.length > 0) {
          // Extract account ID from accountId format (hedera:296:0.0.12345)
          const accountId = state.accounts[0].split(':').pop() || "";
          localStorage.setItem("wc_account", accountId);
        }
        
        console.log("Restored existing session:", {
          accounts: state.accounts,
          wallet: state.walletName
        });
      }
    }
  } catch (error) {
    console.error("Error restoring WalletConnect session:", error);
    resetState();
  }
}

/**
 * Connect to a wallet using WalletConnect
 */
export async function connectWalletConnect(): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    // Initialize client if needed
    if (!state.signClient) {
      await initializeWalletConnectClient();
    }
    
    if (!state.signClient) {
      throw new Error("WalletConnect client failed to initialize");
    }
    
    // If already connected, return existing account
    if (state.isConnected && state.accounts.length > 0) {
      // Extract account ID from account string (hedera:296:0.0.12345)
      const accountId = state.accounts[0].split(':').pop() || "";
      return {
        success: true,
        accountId,
      };
    }
    
    console.log("Creating WalletConnect connection...");
    
    // Required namespaces for Hedera
    const requiredNamespaces = {
      [HEDERA_NAMESPACE]: {
        methods: HEDERA_METHODS,
        chains: [state.chainId], // Use current chain (testnet by default)
        events: HEDERA_EVENTS,
      },
    };
    
    // Create connection proposal
    const { uri, approval } = await state.signClient.connect({
      requiredNamespaces,
    });
    
    // QR code is needed - URI contains connection data
    if (uri) {
      // Display the URI for scanning - use QR code modal or custom UI
      console.log("WalletConnect connection URI:", uri);
      
      // Use QR code modal from @walletconnect/qrcode-modal if needed
      // For now, we'll just log out that user needs to install wallet
      console.log("Please scan the QR code with your Hedera wallet app");
    }
    
    // Wait for connection approval from the wallet
    const session = await approval();
    console.log("WalletConnect session established:", session);
    
    // Store the session
    state.session = session;
    state.isConnected = true;
    
    // Extract wallet name
    try {
      state.walletName = session.peer.metadata.name || "";
    } catch (e) {
      console.warn("Could not get wallet name:", e);
    }
    
    // Extract accounts from the namespace
    if (session.namespaces[HEDERA_NAMESPACE]?.accounts) {
      state.accounts = session.namespaces[HEDERA_NAMESPACE].accounts;
    }
    
    // Store session data in localStorage
    localStorage.setItem("wc_session_topic", session.topic);
    
    // Extract account ID from the first account (format: hedera:296:0.0.12345)
    if (state.accounts.length > 0) {
      const accountId = state.accounts[0].split(':').pop() || "";
      localStorage.setItem("wc_account", accountId);
      
      console.log("WalletConnect connected with account:", accountId);
      
      return {
        success: true,
        accountId,
      };
    } else {
      throw new Error("No accounts returned from wallet");
    }
  } catch (error) {
    console.error("WalletConnect connection error:", error);
    
    resetState();
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect wallet",
    };
  }
}

/**
 * Disconnect from the currently connected wallet
 */
export async function disconnectWalletConnect(): Promise<boolean> {
  try {
    if (!state.signClient || !state.session) {
      console.log("No active WalletConnect session to disconnect");
      resetState();
      return true;
    }
    
    // Get the session topic
    const topic = state.session.topic;
    
    // Disconnect and remove the session
    await state.signClient.disconnect({
      topic,
      reason: {
        code: 6000,
        message: "User disconnected",
      },
    });
    
    console.log("WalletConnect disconnected successfully");
    resetState();
    return true;
  } catch (error) {
    console.error("Error disconnecting WalletConnect:", error);
    
    // Even if there's an error, clear the local state
    resetState();
    
    return false;
  }
}

/**
 * Burn tokens using WalletConnect
 */
export async function burnTokensWithWalletConnect(
  tokenId: string,
  amount: number
): Promise<string> {
  try {
    if (!state.signClient || !state.session || !state.accounts.length) {
      throw new Error("Not connected to WalletConnect");
    }
    
    // Make sure client is initialized
    if (!client) {
      await initializeClient();
    }
    
    // Get the account ID from the first account
    // Format: hedera:296:0.0.12345
    const accountIdString = state.accounts[0].split(':').pop() || "";
    
    // Create the transaction
    const transaction = new TokenBurnTransaction()
      .setTokenId(tokenId)
      .setAmount(amount);
    
    // Freeze the transaction
    const freezeTx = await transaction.freezeWith(client);
    
    // Serialize the transaction to bytes
    const txBytes = Buffer.from(freezeTx.toBytes()).toString("hex");
    
    console.log("Sending burn transaction to wallet for signing and execution...");
    
    // Execute the transaction using WalletConnect
    const result = await state.signClient.request({
      topic: state.session.topic,
      chainId: state.chainId,
      request: {
        method: "hedera_signAndExecuteTransaction",
        params: {
          transaction: txBytes,
        },
      },
    });
    
    console.log("Burn transaction result:", result);
    
    // Parse the response
    if (typeof result === "string") {
      // Transaction ID format from WalletConnect response
      return result;
    } else if (result && typeof result === "object" && "transactionId" in result) {
      // Some wallets may return an object with transactionId
      return result.transactionId as string;
    } else {
      throw new Error("Invalid transaction response from wallet");
    }
  } catch (error) {
    console.error("WalletConnect burn transaction error:", error);
    throw error;
  }
}

/**
 * Sign message for authentication using WalletConnect
 */
export async function signAuthMessage(
  message: string
): Promise<{ signature: string; accountId: string }> {
  try {
    if (!state.signClient || !state.session || !state.accounts.length) {
      throw new Error("Not connected to WalletConnect");
    }
    
    // Get the account ID from the first account
    const accountIdString = state.accounts[0].split(':').pop() || "";
    
    console.log("Signing authentication message...");
    
    // Sign the message using WalletConnect
    const result = await state.signClient.request({
      topic: state.session.topic,
      chainId: state.chainId,
      request: {
        method: "hedera_signMessage",
        params: {
          message: Buffer.from(message).toString("hex"),
          signerId: accountIdString,
        },
      },
    });
    
    console.log("Message signature result:", result);
    
    if (typeof result === "string") {
      return {
        signature: result,
        accountId: accountIdString,
      };
    } else if (result && typeof result === "object" && "signature" in result) {
      return {
        signature: result.signature as string,
        accountId: accountIdString,
      };
    } else {
      throw new Error("Invalid signature response from wallet");
    }
  } catch (error) {
    console.error("WalletConnect signature error:", error);
    throw error;
  }
}

/**
 * Get the current WalletConnect state
 */
export function getWalletConnectState() {
  // Extract account ID from the first account
  const accountId = state.accounts.length > 0 
    ? state.accounts[0].split(':').pop() || null 
    : null;
  
  return {
    isConnected: state.isConnected,
    accountId,
    walletName: state.walletName,
  };
}