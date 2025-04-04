import { ReactNode, createContext, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "./WalletContext";

// Types
interface User {
  id: number;
  username: string;
  accountId: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface SessionResponseData {
  authenticated: boolean;
  sessionID: string;
  userID?: number;
  accountId?: string;
  sessionData: {
    cookie: {
      path: string;
      _expires: string;
      originalMaxAge: number;
      httpOnly: boolean;
      secure: boolean;
      sameSite: string;
    };
    user: User | null;
  };
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  error: Error | null;
  logout: () => Promise<void>;
  checkSessionStatus: () => Promise<SessionResponseData | null>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { disconnectWallet } = useWallet();
  const [sessionData, setSessionData] = useState<SessionResponseData | null>(null);

  // Query for user data
  const {
    data,
    isLoading,
    error,
    refetch: refetchUser,
  } = useQuery<SessionResponseData | null>({
    queryKey: ["/api/auth/session-status"],
    queryFn: async ({ queryKey }) => {
      const url = queryKey[0] as string;
      try {
        const response = await fetch(url, { credentials: "include" });
        
        if (response.status === 401) {
          return null;
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching session status:", error);
        return null;
      }
    },
    refetchOnWindowFocus: true,
  });

  // Extract user from session data
  const user = data?.authenticated && data.sessionData.user ? data.sessionData.user : null;

  // Check if user is admin
  const isAdmin = user?.isAdmin || false;

  // Mutation for logging out
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Clear user data from cache
      queryClient.setQueryData(["/api/auth/session-status"], null);
      queryClient.invalidateQueries({
        queryKey: ["/api/auth/session-status"],
      });
      
      // Disconnect wallet 
      disconnectWallet();
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check session status
  const checkSessionStatus = async (): Promise<SessionResponseData | null> => {
    try {
      const response = await fetch("/api/auth/session-status", {
        credentials: "include"
      });
      const data = await response.json();
      console.log("Session status check:", data);
      setSessionData(data);
      return data;
    } catch (error) {
      console.error("Error checking session:", error);
      return null;
    }
  };

  // Handle logout
  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin, 
        error: error as Error | null,
        logout,
        checkSessionStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}