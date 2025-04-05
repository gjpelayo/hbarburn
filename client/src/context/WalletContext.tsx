import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useToast } from "@/hooks/use-toast";
import {
  connectWalletConnect,
  disconnectWalletConnect,
  burnTokensWithWalletConnect,
  initializeWalletConnect,
  getWalletConnectState,
  signAuthMessage
} from "@/lib/walletconnect";
import { Token } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type WalletType = "walletconnect" | null;

interface WalletContextType {
  isConnected: boolean;
  accountId: string | null;
  walletType: WalletType;
  tokens: Token[];
  isLoading: boolean;
  connectWallet: (walletType: "walletconnect") => Promise<boolean>;
  disconnectWallet: () => void;
  burnTokens: (tokenId: string, amount: number) => Promise<string>;
  authenticateWithSignature: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  
  // Define a query key that depends on the account ID
  const tokensQueryKey = accountId ? ['/api/tokens', accountId] : ['/api/tokens'];
  
  // Query to fetch tokens when account is connected
  const { 
    data: tokens = [], 
    isLoading,
    refetch: refetchTokens
  } = useQuery<Token[]>({
    queryKey: tokensQueryKey,
    queryFn: async () => {
      if (!accountId) return [] as Token[];
      try {
        console.log('Fetching tokens with accountId:', accountId);
        const response = await apiRequest('GET', `/api/tokens?accountId=${accountId}`);
        console.log('API response for tokens:', response);
        
        // Ensure we return a valid Token array
        if (Array.isArray(response)) {
          return response as Token[];
        }
        
        // If not an array or otherwise invalid, return empty array
        return [] as Token[];
      } catch (error) {
        console.error('Error fetching tokens:', error);
        return [] as Token[];
      }
    },
    enabled: !!accountId,
  });
  
  // Initialize wallet SDKs without auto-reconnect
  useEffect(() => {
    async function initializeWallets() {
      try {
        // Initialize WalletConnect
        await initializeWalletConnect().catch(error => console.error("WalletConnect initialization error:", error));
        
        // Do not auto-reconnect to avoid confusion with the test account
        // We'll let users explicitly connect their wallets
        console.log("Wallet SDKs initialized, not auto-reconnecting for demo");
        
        /* UNCOMMENT THIS FOR PRODUCTION
        // Check for existing WalletConnect session
        const wcState = getWalletConnectState();
        if (wcState.isConnected && wcState.accountId) {
          try {
            // Authenticate with the backend
            await apiRequest('POST', '/api/auth/wallet', { 
              accountId: wcState.accountId
            });
            
            // Invalidate the admin user query so it refetches with new authentication
            queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
            
            setAccountId(wcState.accountId);
            setWalletType("walletconnect");
            
            toast({
              title: "Wallet Reconnected",
              description: `Connected to WalletConnect (${wcState.accountId})`,
            });
            
            return;
          } catch (authError) {
            console.error("Authentication error on auto-reconnect:", authError);
          }
        }
        */
      } catch (error) {
        console.error("Wallet initialization failed:", error);
      }
    }
    
    initializeWallets();
  }, [toast]);
  
  const connectWallet = async (type: "walletconnect"): Promise<boolean> => {
    try {
      if (type === "walletconnect") {
        const result = await connectWalletConnect();
        
        if (result.success && result.accountId) {
          // Set local state
          setAccountId(result.accountId);
          setWalletType(type);
          
          try {
            // Authenticate with the backend
            await apiRequest('POST', '/api/auth/wallet', { 
              accountId: result.accountId
            });
            
            // Invalidate the admin user query so it refetches with new authentication
            queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
            
            toast({
              title: "Wallet Connected",
              description: `Connected to WalletConnect (${result.accountId})`,
            });
            return true;
          } catch (authError) {
            console.error("Authentication error:", authError);
            // Disconnect the wallet
            await disconnectWalletConnect();
            setAccountId(null);
            setWalletType(null);
            
            toast({
              title: "Authentication Failed",
              description: "Could not authenticate with the server",
              variant: "destructive",
            });
            return false;
          }
        } else {
          // Handle connection failure
          toast({
            title: "Connection Failed",
            description: result.error || "Could not connect to WalletConnect",
            variant: "destructive",
          });
          return false;
        }
      } else {
        throw new Error("Unsupported wallet type");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to the wallet",
        variant: "destructive",
      });
      return false;
    }
  };
  
  const disconnectWallet = async () => {
    try {
      if (walletType === "walletconnect") {
        await disconnectWalletConnect();
      }
      
      try {
        // Logout from backend
        await apiRequest('POST', '/api/auth/logout');
        
        // Clear all admin-related query data
        queryClient.setQueryData(['/api/admin/user'], null);
        queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
        
        // Also invalidate any other relevant queries that might have user-specific data
        queryClient.invalidateQueries({ queryKey: ['/api'] });
      } catch (logoutError) {
        console.error("Server logout error:", logoutError);
        // Continue with local logout even if server logout fails
      }
      
      setAccountId(null);
      setWalletType(null);
      
      toast({
        title: "Wallet Disconnected",
        description: "Your wallet has been disconnected",
      });
    } catch (error) {
      console.error("Wallet disconnection error:", error);
      toast({
        title: "Disconnection Error",
        description: "An error occurred while disconnecting the wallet",
        variant: "destructive",
      });
    }
  };
  
  const burnTokens = async (tokenId: string, amount: number): Promise<string> => {
    if (!accountId || !walletType) {
      throw new Error("Wallet not connected");
    }
    
    try {
      if (walletType === "walletconnect") {
        // Call WalletConnect's burn function
        const txId = await burnTokensWithWalletConnect(tokenId, amount);
        
        // Refetch token balances after burn
        await refetchTokens();
        
        return txId;
      } else {
        throw new Error("Unsupported wallet type");
      }
    } catch (error) {
      console.error("Token burn error:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to burn tokens: ${error.message}`);
      } else {
        throw new Error("Failed to burn tokens");
      }
    }
  };
  
  // New authentication method using wallet signatures
  const authenticateWithSignature = async (): Promise<boolean> => {
    if (!accountId || !walletType) {
      toast({
        title: "Authentication Failed",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Create a challenge message that includes the account ID and a timestamp
      const timestamp = Date.now();
      const message = `Authenticate ${accountId} for the Token Redemption Platform at ${timestamp}`;
      
      let signature: string | undefined;
      
      if (walletType === "walletconnect") {
        // Use WalletConnect to sign the message
        const signResult = await signAuthMessage(message);
        
        if (signResult.success && signResult.signature) {
          signature = signResult.signature;
        } else {
          throw new Error(signResult.error || "Failed to sign the authentication message");
        }
      } else {
        throw new Error("Unsupported wallet type");
      }
      
      if (!signature) {
        throw new Error("No signature was provided");
      }
      
      // Send the signed message to the server for verification
      interface AuthResult {
        success: boolean;
        error?: string;
        accountId?: string;
      }
      
      const authResult = await apiRequest<AuthResult>('POST', '/api/auth/signature', {
        accountId,
        message,
        signature
      });
      
      if (authResult && authResult.success) {
        // Update query cache to reflect successful authentication
        queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
        
        toast({
          title: "Authentication Successful",
          description: "Your wallet signature has been verified",
        });
        return true;
      } else {
        throw new Error((authResult.error) || "Signature verification failed");
      }
    } catch (error) {
      console.error("Signature authentication error:", error);
      
      toast({
        title: "Authentication Failed",
        description: error instanceof Error ? error.message : "Failed to authenticate with signature",
        variant: "destructive",
      });
      return false;
    }
  };
  
  return (
    <WalletContext.Provider
      value={{
        isConnected: !!accountId,
        accountId,
        walletType,
        tokens,
        isLoading,
        connectWallet,
        disconnectWallet,
        burnTokens,
        authenticateWithSignature,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletContextProvider");
  }
  return context;
}
