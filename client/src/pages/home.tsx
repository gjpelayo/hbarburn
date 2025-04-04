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
  
  const handleConnectBlade = async () => {
    try {
      await connectWallet("blade");
      setIsConnectDialogOpen(false);
      navigate("/admin");
    } catch (error) {
      console.error("Error connecting Blade wallet:", error);
    }
  };
  
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 7h.01" />
                      <path d="M17 7h.01" />
                      <path d="M7 17h.01" />
                      <path d="M17 17h.01" />
                    </svg>
                    Connect with WalletConnect
                  </Button>
                  <Button 
                    onClick={handleConnectBlade}
                    variant="outline"
                    className="w-full flex justify-center items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8.5" />
                      <path d="M20 16V8a2 2 0 0 0-2-2h-2" />
                      <path d="M12 12h6" />
                    </svg>
                    Connect with Blade
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
