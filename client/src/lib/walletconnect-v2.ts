import QRCodeModal from "@walletconnect/qrcode-modal";
import SignClient from "@walletconnect/sign-client";
import { SessionTypes } from "@walletconnect/types";
import { TokenBurnTransaction } from "@hashgraph/sdk";
import { initializeClient, client } from "./hedera";

// WalletConnect Project ID from .env
const PROJECT_ID = import.meta.env.VITE_PROJECT_ID;

const HEDERA_NAMESPACE = "hedera";
const HEDERA_METHODS = [
  "hedera_signTransaction",
  "hedera_signAndExecuteTransaction",
  "hedera_executeTransaction",
  "hedera_signMessage",
];
const HEDERA_EVENTS = ["accountsChanged", "chainChanged"];
const HEDERA_CHAIN_IDS = ["hedera:296"]; // testnet

const state = {
  signClient: null as SignClient | null,
  session: null as SessionTypes.Struct | null,
  accounts: [] as string[],
  isConnected: false,
  chainId: "hedera:296",
  walletName: "",
};

// 👇 HashPack extension detection support
declare global {
  interface Window {
    walletProvider?: {
      request: (args: { method: string; params: any }) => void;
      isHashPack?: boolean;
    };
  }
}

export async function initializeWalletConnectClient(): Promise<void> {
  if (state.signClient) return;

  if (!PROJECT_ID) {
    throw new Error("Missing VITE_PROJECT_ID in .env");
  }

  state.signClient = await SignClient.init({
    projectId: PROJECT_ID,
    metadata: {
      name: "Hedera Token Redemption",
      description: "Hedera token redemption platform",
      url: window?.location.origin || "https://token-redemption.app",
      icons: [`${window?.location.origin}/favicon.ico`],
    },
  });

  registerEventListeners();
  restoreExistingSession();
}

function registerEventListeners() {
  if (!state.signClient) return;

  state.signClient.on("session_event", ({ event }) => {
    if (event.name === "accountsChanged") {
      state.accounts = event.data;
    } else if (event.name === "chainChanged") {
      state.chainId = event.data;
    }
  });

  state.signClient.on("session_update", ({ topic }) => {
    const updated = state.signClient?.session.get(topic);
    if (updated) {
      state.session = updated;
      state.accounts = updated.namespaces[HEDERA_NAMESPACE]?.accounts || [];
    }
  });

  state.signClient.on("session_delete", () => {
    resetState();
  });
}

function resetState() {
  state.session = null;
  state.accounts = [];
  state.isConnected = false;
  localStorage.removeItem("wc_account");
}

function restoreExistingSession() {
  const sessions = state.signClient?.session.getAll() || [];
  const existing = sessions.find((s) => s.namespaces[HEDERA_NAMESPACE]);
  if (existing) {
    state.session = existing;
    state.accounts = existing.namespaces[HEDERA_NAMESPACE].accounts;
    state.isConnected = true;

    const accountId = state.accounts[0]?.split(":").pop() || "";
    localStorage.setItem("wc_account", accountId);
  }
}

export async function connectWalletConnect() {
  await initializeWalletConnectClient();

  if (!state.signClient) throw new Error("WalletConnect not initialized");

  if (state.isConnected && state.accounts.length > 0) {
    return {
      success: true,
      accountId: state.accounts[0].split(":").pop(),
    };
  }

  const { uri, approval } = await state.signClient.connect({
    requiredNamespaces: {
      [HEDERA_NAMESPACE]: {
        methods: HEDERA_METHODS,
        chains: [state.chainId],
        events: HEDERA_EVENTS,
      },
    },
  });

  const fallbackUrl = `https://hashpack.app/wc?uri=${encodeURIComponent(uri)}`;

  // ✅ Trigger extension if available
  if (window.walletProvider?.isHashPack) {
    console.log("✅ HashPack extension detected. Requesting connection...");
    try {
      await window.walletProvider.request({
        method: "walletconnect_connect",
        params: { uri },
      });
    } catch (err) {
      console.warn("Failed to request extension connection:", err);
      window.open(fallbackUrl, "_blank");
    }
  } else {
    console.log("⚠️ No HashPack extension. Opening QR code modal and fallback...");
    QRCodeModal.open(uri, () => {
      console.log("QR Code Modal closed");
    });
    window.open(fallbackUrl, "_blank");
  }

  const session = await approval();
  state.session = session;
  state.isConnected = true;
  state.accounts = session.namespaces[HEDERA_NAMESPACE]?.accounts || [];

  const accountId = state.accounts[0]?.split(":").pop() || "";
  localStorage.setItem("wc_account", accountId);

  return {
    success: true,
    accountId,
  };
}

export async function disconnectWalletConnect(): Promise<boolean> {
  try {
    if (!state.signClient || !state.session) return true;

    await state.signClient.disconnect({
      topic: state.session.topic,
      reason: { code: 6000, message: "User disconnected" },
    });

    resetState();
    return true;
  } catch (e) {
    console.error("Disconnect error", e);
    resetState();
    return false;
  }
}

export async function burnTokensWithWalletConnect(tokenId: string, amount: number) {
  if (!state.signClient || !state.session || !state.accounts.length) {
    throw new Error("Not connected to wallet");
  }

  const accountId = state.accounts[0]?.split(":").pop() || "";

  await initializeClient();

  const tx = new TokenBurnTransaction()
    .setTokenId(tokenId)
    .setAmount(amount);

  const frozen = await tx.freezeWith(client);
  const txBytes = Buffer.from(frozen.toBytes()).toString("hex");

  const result = await state.signClient.request({
    topic: state.session.topic,
    chainId: state.chainId,
    request: {
      method: "hedera_signAndExecuteTransaction",
      params: { transaction: txBytes },
    },
  });

  return typeof result === "string" ? result : result.transactionId;
}

export async function signAuthMessage(message: string) {
  if (!state.signClient || !state.session || !state.accounts.length) {
    throw new Error("Not connected to Wallet");
  }

  const accountId = state.accounts[0].split(":").pop() || "";
  const hexMessage = Buffer.from(message).toString("hex");

  const result = await state.signClient.request({
    topic: state.session.topic,
    chainId: state.chainId,
    request: {
      method: "hedera_signMessage",
      params: {
        message: hexMessage,
        signerId: accountId,
      },
    },
  });

  return {
    signature: typeof result === "string" ? result : result.signature,
    accountId,
  };
}

export function getWalletConnectState() {
  const accountId = state.accounts[0]?.split(":").pop() || null;
  return {
    isConnected: state.isConnected,
    accountId,
    walletName: state.walletName,
  };
}
