import { useState } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Wallet, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminAuthPage() {
  const [location, navigate] = useLocation();
  const { user } = useAdmin();
  const { isConnected, accountId, connectWallet, disconnectWallet } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);
  
  // If user is already logged in, redirect to admin dashboard
  if (user) {
    navigate("/admin");
    return null;
  }
  
  const handleConnectHashpack = async () => {
    setIsConnecting(true);
    try {
      await connectWallet("hashpack");
      // After connecting the wallet, we would typically verify on the server
      // that this wallet has admin privileges, then automatically redirect
      navigate("/admin");
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleConnectBlade = async () => {
    setIsConnecting(true);
    try {
      await connectWallet("blade");
      // After connecting the wallet, we would typically verify on the server
      // that this wallet has admin privileges, then automatically redirect
      navigate("/admin");
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Setup Your Shop</CardTitle>
            <CardDescription>
              Connect your wallet to manage your token redemption platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <>
                <Alert className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    Connect your Hedera wallet to access the shop management dashboard.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleConnectHashpack}
                  className="w-full flex justify-center items-center gap-2 py-6 text-base"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 7h.01" />
                      <path d="M17 7h.01" />
                      <path d="M7 17h.01" />
                      <path d="M17 17h.01" />
                    </svg>
                  )}
                  Connect with HashPack
                </Button>
                
                <Button 
                  onClick={handleConnectBlade}
                  variant="outline"
                  className="w-full flex justify-center items-center gap-2 py-6 text-base"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8.5" />
                      <path d="M20 16V8a2 2 0 0 0-2-2h-2" />
                      <path d="M12 12h6" />
                    </svg>
                  )}
                  Connect with Blade
                </Button>
              </>
            ) : (
              <>
                <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Wallet connected successfully! You can now proceed to the admin dashboard.
                  </AlertDescription>
                </Alert>
                
                <div className="mb-4 p-4 bg-neutral-50 rounded-md border">
                  <div className="text-sm text-neutral-500 mb-1">Connected Account</div>
                  <div className="text-neutral-800 font-semibold break-all">{accountId}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    onClick={() => navigate("/admin")}
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                  <Button 
                    onClick={handleDisconnect}
                    variant="outline"
                    className="w-full"
                  >
                    Disconnect
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <div className="hidden lg:flex flex-col justify-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Token Redemption Admin</h1>
            <p className="text-muted-foreground">
              Manage physical items, tokens, and redemption configurations. Monitor orders and update their status.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Manage Physical Items</h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, and remove physical items available for token redemption.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Configure Tokens</h3>
              <p className="text-sm text-muted-foreground">
                Set up which tokens can be burned to redeem specific physical items.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Track Redemptions</h3>
              <p className="text-sm text-muted-foreground">
                View and manage all redemption orders. Update order status and verify transactions.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Create Shops</h3>
              <p className="text-sm text-muted-foreground">
                Design public storefronts where users can redeem your tokens for physical items.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}