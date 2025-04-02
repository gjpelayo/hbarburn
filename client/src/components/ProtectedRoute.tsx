import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAdmin();
  const { isConnected, connectWallet } = useWallet();
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  if (!user) {
    // If not connected to a wallet, prompt them to connect
    if (!isConnected) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto text-center px-4">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet to Continue</h1>
          <p className="text-muted-foreground mb-8">
            You need to connect your wallet to access the admin dashboard.
          </p>
          <div className="flex flex-col gap-4 w-full">
            <Button
              onClick={() => connectWallet("hashpack")}
              size="lg"
              className="w-full"
            >
              Connect with HashPack
            </Button>
            <Button
              onClick={() => connectWallet("blade")}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Connect with Blade
            </Button>
          </div>
          <Button
            variant="link"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Return to Home
          </Button>
        </div>
      );
    }
    
    // If connected but no user found
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
        <p className="text-muted-foreground mb-8">
          Your wallet is connected, but you don't have permission to access this area.
        </p>
        <Button onClick={() => navigate("/")} className="w-full">
          Return to Home
        </Button>
      </div>
    );
  }
  
  // If user is not an admin, redirect to home
  if (!user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen max-w-md mx-auto text-center px-4">
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-muted-foreground mb-8">
          You need admin privileges to access this area.
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