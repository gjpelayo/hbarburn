import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { useWallet } from "@/context/WalletContext";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/Footer";
import { WalletConnectHeader } from "@/components/WalletConnectHeader";
import { Button } from "@/components/ui/button";
import { EducationalContent } from "@/components/EducationalContent";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShoppingBag, Link as LinkIcon, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Shop {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}

export default function Home() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAdmin();
  const { isConnected, connectWallet } = useWallet();
  const [isCopied, setIsCopied] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  
  // Fetch active shops
  const { data: shops = [], isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    // This will fail gracefully if the API endpoint doesn't exist yet
  });

  // Handle navigation to shop
  const goToShop = (shopId: string) => {
    navigate(`/shop/${shopId}`);
  };

  // Generate and copy shop link
  const copyShopLink = (shopId: string) => {
    const link = `${window.location.origin}/shop/${shopId}`;
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    
    toast({
      title: "Link copied!",
      description: "Shop link has been copied to clipboard.",
    });
    
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  // Handler functions for wallet connection
  const handleConnectWalletConnect = async () => {
    try {
      await connectWallet("walletconnect");
      setIsConnectDialogOpen(false);
      navigate("/admin");
    } catch (error) {
      console.error("Error connecting WalletConnect:", error);
    }
  };
  
  // Removed Blade wallet connection handler
  
  // Handle setup shop click - navigate to admin if connected, or show connect dialog
  const handleSetupShopClick = () => {
    if (user || isConnected) {
      navigate("/admin");
    } else {
      setIsConnectDialogOpen(true);
    }
  };

  return (
    <>
      <WalletConnectHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-800 mb-3 bg-gradient-to-r from-primary to-primary/60 text-transparent bg-clip-text">
            TokenBurn Redemption Platform
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto text-lg">
            Create token redemption shops and allow users to burn Hedera tokens in exchange for physical products.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={handleSetupShopClick}
              size="lg"
              className="px-8 gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {user ? "Manage My Shop" : "Setup Shop"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => navigate("/session-test")}
              size="lg"
              className="px-8 gap-2"
            >
              Session Test
            </Button>
            
            {/* Wallet Connection Dialog */}
            <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect your wallet</DialogTitle>
                  <DialogDescription>
                    Connect your Hedera wallet to set up and manage your shop.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Button 
                    onClick={handleConnectWalletConnect}
                    className="w-full flex justify-center items-center gap-2"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67ZM22.44 6.49C27.73 11.63 27.73 19.69 22.44 24.83L22.43 24.84C22.41 24.86 22.38 24.88 22.36 24.89C22.33 24.93 22.29 24.96 22.24 24.98C22.21 25 22.17 25.01 22.13 25.01C22.09 25.01 22.05 25 22.01 24.98C21.96 24.96 21.92 24.93 21.89 24.89C21.87 24.88 21.84 24.86 21.82 24.84L19.38 22.49C19.22 22.34 19.22 22.09 19.38 21.94L21.03 20.34C24.35 17.11 24.35 11.89 21.03 8.66L20.27 7.93C20.11 7.77 20.11 7.52 20.27 7.37L22.06 5.63C22.13 5.56 22.22 5.52 22.31 5.51C22.36 5.51 22.4 5.52 22.45 5.53C22.47 5.54 22.48 5.54 22.5 5.55C22.63 5.63 22.63 5.63 22.66 5.65C22.66 5.65 22.66 5.66 22.67 5.66C22.73 5.72 22.73 5.72 22.74 5.73C22.82 5.81 22.84 5.83 22.89 5.94C22.91 5.97 22.91 5.98 22.92 6.01C22.99 6.16 22.95 6.34 22.84 6.46L22.44 6.49ZM7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#3396FF"/>
                    </svg>
                    <span className="ml-2">Connect with WalletConnect</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Shops Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-neutral-800 mb-2">Available Redemption Shops</h2>
            <p className="text-neutral-500">Visit a shop to browse and redeem physical items with your tokens</p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : shops.length === 0 ? (
            <Card className="text-center py-12 max-w-md mx-auto">
              <CardContent>
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Shops Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  There are no token redemption shops available at the moment.
                </p>
                {user && (
                  <Button onClick={() => navigate("/admin/shops")} variant="outline">
                    Create Shop
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shops.map((shop) => (
                <Card key={shop.id} className="overflow-hidden">
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    {shop.imageUrl ? (
                      <img 
                        src={shop.imageUrl} 
                        alt={shop.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg font-semibold">{shop.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-sm text-neutral-500 line-clamp-2">{shop.description}</p>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                    <Button 
                      onClick={() => goToShop(shop.id)}
                      className="w-full"
                    >
                      Visit Shop
                    </Button>
                    
                    {user && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShopLink(shop.id)}
                        className="w-full gap-2 mt-1"
                      >
                        {isCopied ? <Copy className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                        {isCopied ? 'Copied!' : 'Copy Link'}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Educational Content */}
        <EducationalContent />
      </main>
      
      <Footer />
    </>
  );
}
