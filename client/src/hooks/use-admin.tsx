import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { 
  User, 
  LoginCredentials, 
  PhysicalItem, 
  InsertPhysicalItem, 
  UpdatePhysicalItem,
  Token,
  InsertToken,
  UpdateToken,
  TokenConfiguration,
  InsertTokenConfiguration,
  UpdateTokenConfiguration
} from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AdminContextType = {
  isLoading: boolean;
  error: Error | null;
  user: User | null;
  loginMutation: UseMutationResult<Omit<User, 'password'>, Error, LoginCredentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
  
  // Physical Item Mutations
  createPhysicalItemMutation: UseMutationResult<PhysicalItem, Error, InsertPhysicalItem>;
  updatePhysicalItemMutation: UseMutationResult<PhysicalItem, Error, { id: number, data: UpdatePhysicalItem }>;
  deletePhysicalItemMutation: UseMutationResult<void, Error, number>;
  
  // Token Mutations
  createTokenMutation: UseMutationResult<Token, Error, InsertToken>;
  updateTokenMutation: UseMutationResult<Token, Error, { tokenId: string, data: UpdateToken }>;
  deleteTokenMutation: UseMutationResult<void, Error, string>;
  
  // Token Configuration Mutations
  createTokenConfigurationMutation: UseMutationResult<TokenConfiguration, Error, InsertTokenConfiguration>;
  updateTokenConfigurationMutation: UseMutationResult<TokenConfiguration, Error, { id: number, data: UpdateTokenConfiguration }>;
  deleteTokenConfigurationMutation: UseMutationResult<void, Error, number>;
};

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Fetch the current admin user
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/admin/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    // Without this, the hook will cache the 401 response and not try to refetch
    // when the user logs in via wallet
    staleTime: 0,
    retryOnMount: true,
    refetchOnWindowFocus: true,
  });
  
  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/admin/login", credentials);
      return await res.json();
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/admin/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Use fetch directly instead of apiRequest to handle non-JSON responses
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include"
      });
      
      if (!res.ok) {
        throw new Error(`Logout failed: ${res.status} ${res.statusText}`);
      }
      
      // Nothing to return as we're just handling the logout action
      return;
    },
    onSuccess: () => {
      // Clear all admin-related query data
      queryClient.setQueryData(["/api/admin/user"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      
      // Also invalidate any other relevant queries that might have user-specific data
      queryClient.invalidateQueries({ queryKey: ["/api"] });
      
      toast({
        title: "Logout successful",
        description: "You have been logged out successfully.",
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
  
  // Physical Items mutations
  const createPhysicalItemMutation = useMutation({
    mutationFn: async (item: InsertPhysicalItem) => {
      const res = await apiRequest("POST", "/api/admin/physical-items", item);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create physical item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updatePhysicalItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UpdatePhysicalItem }) => {
      const res = await apiRequest("PATCH", `/api/admin/physical-items/${id}`, data);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update physical item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deletePhysicalItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/physical-items/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete physical item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Token mutations
  const createTokenMutation = useMutation({
    mutationFn: async (token: InsertToken) => {
      const res = await apiRequest("POST", "/api/admin/tokens", token);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateTokenMutation = useMutation({
    mutationFn: async ({ tokenId, data }: { tokenId: string, data: UpdateToken }) => {
      const res = await apiRequest("PATCH", `/api/admin/tokens/${tokenId}`, data);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await apiRequest("DELETE", `/api/admin/tokens/${tokenId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete token",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Token Configuration mutations
  const createTokenConfigurationMutation = useMutation({
    mutationFn: async (config: InsertTokenConfiguration) => {
      const res = await apiRequest("POST", "/api/admin/token-configurations", config);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create token configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateTokenConfigurationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: UpdateTokenConfiguration }) => {
      const res = await apiRequest("PATCH", `/api/admin/token-configurations/${id}`, data);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update token configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const deleteTokenConfigurationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/token-configurations/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete token configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <AdminContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        createPhysicalItemMutation,
        updatePhysicalItemMutation,
        deletePhysicalItemMutation,
        createTokenMutation,
        updateTokenMutation,
        deleteTokenMutation,
        createTokenConfigurationMutation,
        updateTokenConfigurationMutation,
        deleteTokenConfigurationMutation,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}