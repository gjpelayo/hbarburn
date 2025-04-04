import React, { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, navigate] = useLocation();
  const adminContext = useAdmin();
  const authContext = useAuth();
  const { isConnected } = useWallet();
  
  // Use both contexts - the old one (useAdmin) and the new one (useAuth)
  // This ensures backward compatibility while we transition
  const user = authContext.user || adminContext.user;
  const isLoading = authContext.isLoading || adminContext.isLoading;
  const isAdmin = authContext.isAdmin || (adminContext.user?.isAdmin || false);
  
  // Use effects for all navigation to avoid conditional hook issues
  useEffect(() => {
    // If not connected to a wallet, redirect to home page
    if (!isLoading && !isConnected) {
      navigate("/");
    }
  }, [isLoading, isConnected, navigate]);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  // If not connected to a wallet, show loading while redirect happens
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Redirecting to home page...</p>
      </div>
    );
  }
  
  // If no user found or not an admin, display access denied message
  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-muted-foreground mb-8">
          Your wallet is connected, but you don't have admin privileges to access this area.
        </p>
        <Button onClick={() => navigate("/")} className="w-full">
          Return to Home
        </Button>
      </div>
    );
  }
  
  // If user is authenticated and is admin, render the children
  return <>{children}</>;
}