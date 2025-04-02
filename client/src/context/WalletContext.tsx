import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode 
} from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  connectHashpack, 
  disconnectHashpack, 
  burnTokensWithHashpack,
  initializeHashConnect
} from "@/lib/hashconnect";
import { 
  connectBlade, 
  disconnectBlade, 
  burnTokensWithBlade 
} from "@/lib/blade";
import { Token } from "@/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  
  // Initialize wallet SDKs and try to reconnect on page load
  useEffect(() => {
    async function initAndAutoReconnect() {
      try {
        // Initialize HashConnect - no need to await as it will initialize in background
        initializeHashConnect().catch(err => console.error("HashConnect initialization error:", err));
        
        // Check for existing HashPack connection
        const hashpackAccount = localStorage.getItem("hashpack_account");
        if (hashpackAccount) {
          const reconnected = await connectHashpack();
          if (reconnected.success && reconnected.accountId) {
            try {
              // Authenticate with the backend
              await apiRequest('POST', '/api/auth/wallet', { 
                accountId: reconnected.accountId
              });
              
              // Invalidate the admin user query so it refetches with new authentication
              queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
              
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
              
              // Invalidate the admin user query so it refetches with new authentication
              queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
              
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
    
    initAndAutoReconnect();
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
          
          // Invalidate the admin user query so it refetches with new authentication
          queryClient.invalidateQueries({ queryKey: ['/api/admin/user'] });
          
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
        
        // Invalidate the admin user query so it reflects the logout
        queryClient.setQueryData(['/api/admin/user'], null);
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
        // Call HashPack's burn function with the real implementation
        const txId = await burnTokensWithHashpack(tokenId, amount);
        
        // Refetch token balances after burn
        await refetchTokens();
        
        return txId;
      } else if (walletType === "blade") {
        // Call Blade's burn function with the real implementation
        const txId = await burnTokensWithBlade(tokenId, amount);
        
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
