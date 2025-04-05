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
  
  const handleConnectWalletConnect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet("walletconnect");
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
                  onClick={handleConnectWalletConnect}
                  className="w-full flex justify-center items-center gap-2 py-6 text-base"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67ZM22.44 6.49C27.73 11.63 27.73 19.69 22.44 24.83L22.43 24.84C22.41 24.86 22.38 24.88 22.36 24.89C22.33 24.93 22.29 24.96 22.24 24.98C22.21 25 22.17 25.01 22.13 25.01C22.09 25.01 22.05 25 22.01 24.98C21.96 24.96 21.92 24.93 21.89 24.89C21.87 24.88 21.84 24.86 21.82 24.84L19.38 22.49C19.22 22.34 19.22 22.09 19.38 21.94L21.03 20.34C24.35 17.11 24.35 11.89 21.03 8.66L20.27 7.93C20.11 7.77 20.11 7.52 20.27 7.37L22.06 5.63C22.13 5.56 22.22 5.52 22.31 5.51C22.36 5.51 22.4 5.52 22.45 5.53C22.47 5.54 22.48 5.54 22.5 5.55C22.63 5.63 22.63 5.63 22.66 5.65C22.66 5.65 22.66 5.66 22.67 5.66C22.73 5.72 22.73 5.72 22.74 5.73C22.82 5.81 22.84 5.83 22.89 5.94C22.91 5.97 22.91 5.98 22.92 6.01C22.99 6.16 22.95 6.34 22.84 6.46L22.44 6.49ZM7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#3396FF"/>
                    </svg>
                  )}
                  Connect with WalletConnect
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