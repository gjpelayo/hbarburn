import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useToast } from "@/hooks/use-toast";
import { connectHashpack, disconnectHashpack } from "@/lib/hashconnect";
import { connectBlade, disconnectBlade } from "@/lib/blade";
import { Token } from "@/types";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type WalletType = "hashpack" | "blade" | null;

interface WalletContextType {
  isConnected: boolean;
  accountId: string | null;
  walletType: WalletType;
  tokens: Token[];
  isLoading: boolean;
  connectWallet: (walletType: "hashpack" | "blade") => Promise<boolean>;
  disconnectWallet: () => void;
  burnTokens: (tokenId: string, amount: number) => Promise<string>;
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
        const response = await apiRequest<Token[]>('GET', `/api/tokens?accountId=${accountId}`);
        console.log('API response for tokens:', response);
        return response;
      } catch (error) {
        console.error('Error fetching tokens:', error);
        return [] as Token[];
      }
    },
    enabled: !!accountId,
  });
  
  // Automatically try to reconnect on page load if a previous session exists
  useEffect(() => {
    async function autoReconnect() {
      // Check for existing HashPack connection
      try {
        const hashpackAccount = localStorage.getItem("hashpack_account");
        if (hashpackAccount) {
          const reconnected = await connectHashpack();
          if (reconnected.success && reconnected.accountId) {
            try {
              // Authenticate with the backend
              await apiRequest('POST', '/api/auth/wallet', { 
                accountId: reconnected.accountId
              });
              
              setAccountId(reconnected.accountId);
              setWalletType("hashpack");
              return;
            } catch (authError) {
              console.error("Authentication error on auto-reconnect:", authError);
              // Continue to try the next wallet if authentication fails
            }
          }
        }
        
        // Try Blade if HashPack failed
        const bladeAccount = localStorage.getItem("blade_account");
        if (bladeAccount) {
          const reconnected = await connectBlade();
          if (reconnected.success && reconnected.accountId) {
            try {
              // Authenticate with the backend
              await apiRequest('POST', '/api/auth/wallet', { 
                accountId: reconnected.accountId
              });
              
              setAccountId(reconnected.accountId);
              setWalletType("blade");
              return;
            } catch (authError) {
              console.error("Authentication error on auto-reconnect:", authError);
            }
          }
        }
      } catch (error) {
        console.error("Auto-reconnect failed:", error);
      }
    }
    
    autoReconnect();
  }, []);
  
  const connectWallet = async (type: "hashpack" | "blade"): Promise<boolean> => {
    try {
      let result;
      if (type === "hashpack") {
        result = await connectHashpack();
      } else if (type === "blade") {
        result = await connectBlade();
      } else {
        throw new Error("Unsupported wallet type");
      }
      
      if (result.success && result.accountId) {
        // Set local state
        setAccountId(result.accountId);
        setWalletType(type);
        
        try {
          // Authenticate with the backend
          await apiRequest('POST', '/api/auth/wallet', { 
            accountId: result.accountId
          });
          
          toast({
            title: "Wallet Connected",
            description: `Connected to ${type === 'hashpack' ? 'HashPack' : 'Blade'} (${result.accountId})`,
          });
          return true;
        } catch (authError) {
          console.error("Authentication error:", authError);
          // Disconnect the wallet if authentication fails
          if (type === "hashpack") {
            await disconnectHashpack();
          } else if (type === "blade") {
            await disconnectBlade();
          }
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
        toast({
          title: "Connection Failed",
          description: result.error || `Could not connect to ${type === 'hashpack' ? 'HashPack' : 'Blade'}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast({
        title: "Connection Error",
        description: "An error occurred while connecting to the wallet",
        variant: "destructive",
      });
    }
    
    return false;
  };
  
  const disconnectWallet = async () => {
    try {
      if (walletType === "hashpack") {
        await disconnectHashpack();
      } else if (walletType === "blade") {
        await disconnectBlade();
      }
      
      try {
        // Logout from backend
        await apiRequest('POST', '/api/auth/logout');
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
      if (walletType === "hashpack") {
        // Call HashPack's burn function
        // This is a placeholder - the actual implementation
        // will depend on the HashPack SDK implementation
        const mockTransactionId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`;
        return mockTransactionId;
      } else if (walletType === "blade") {
        // Call Blade's burn function
        // This is a placeholder - the actual implementation
        // will depend on the Blade SDK implementation
        const mockTransactionId = `0.0.${Date.now()}@${Math.floor(Date.now() / 1000)}.${Math.floor(Math.random() * 1000000)}`;
        return mockTransactionId;
      } else {
        throw new Error("Unsupported wallet type");
      }
    } catch (error) {
      console.error("Token burn error:", error);
      throw new Error("Failed to burn tokens");
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
