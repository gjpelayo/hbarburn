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
                  onClick={handleConnectWalletConnect}
                  className="w-full flex justify-center items-center gap-2 py-6 text-base"
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 96 96" fill="none">
                      <path d="M25.4995 36.6505C40.0745 22.0765 64.4155 22.0765 78.9915 36.6505L81.2085 38.8675C82.1515 39.8105 82.1515 41.3435 81.2085 42.2855L74.8525 48.6425C74.3815 49.1135 73.614 49.1135 73.143 48.6425L70.093 45.5935C60.2725 35.7735 44.217 35.7735 34.3965 45.5935L31.1855 48.8045C30.7145 49.2755 29.947 49.2755 29.476 48.8045L23.1195 42.4485C22.1765 41.5055 22.1765 39.9725 23.1195 39.0305L25.4995 36.6505ZM89.8255 47.4845L95.449 53.1075C96.392 54.0505 96.392 55.5835 95.449 56.5255L73.1995 78.7775C72.2555 79.7205 70.7235 79.7205 69.7815 78.7775L54.7275 63.7255C54.492 63.49 54.1095 63.49 53.874 63.7255L38.8215 78.7775C37.8775 79.7205 36.3455 79.7205 35.404 78.7775L13.126 56.5255C12.183 55.5835 12.183 54.0505 13.126 53.1075L18.7495 47.4845C19.6935 46.5415 21.2255 46.5415 22.1675 47.4845L37.22 62.5365C37.455 62.772 37.838 62.772 38.0735 62.5365L53.126 47.4845C54.07 46.5415 55.602 46.5415 56.5435 47.4845L71.5965 62.5365C71.832 62.772 72.2145 62.772 72.45 62.5365L87.5025 47.4845C88.4475 46.5415 89.9795 46.5415 89.8255 47.4845Z" fill="currentColor" />
                    </svg>
                  )}
                  Connect with WalletConnect
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