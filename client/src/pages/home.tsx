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
  
  // Handler function for wallet connection
  const handleConnectWalletConnect = async () => {
    try {
      await connectWallet("walletconnect");
      setIsConnectDialogOpen(false);
      navigate("/admin");
    } catch (error) {
      console.error("Error connecting WalletConnect:", error);
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
                    <svg width="20" height="20" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M25.4995 36.6505C40.0745 22.0765 64.4155 22.0765 78.9915 36.6505L81.2085 38.8675C82.1515 39.8105 82.1515 41.3435 81.2085 42.2855L74.8525 48.6425C74.3815 49.1135 73.614 49.1135 73.143 48.6425L70.093 45.5935C60.2725 35.7735 44.217 35.7735 34.3965 45.5935L31.1855 48.8045C30.7145 49.2755 29.947 49.2755 29.476 48.8045L23.1195 42.4485C22.1765 41.5055 22.1765 39.9725 23.1195 39.0305L25.4995 36.6505ZM89.8255 47.4845L95.449 53.1075C96.392 54.0505 96.392 55.5835 95.449 56.5255L73.1995 78.7775C72.2555 79.7205 70.7235 79.7205 69.7815 78.7775L54.7275 63.7255C54.492 63.49 54.1095 63.49 53.874 63.7255L38.8215 78.7775C37.8775 79.7205 36.3455 79.7205 35.404 78.7775L13.126 56.5255C12.183 55.5835 12.183 54.0505 13.126 53.1075L18.7495 47.4845C19.6935 46.5415 21.2255 46.5415 22.1675 47.4845L37.22 62.5365C37.455 62.772 37.838 62.772 38.0735 62.5365L53.126 47.4845C54.07 46.5415 55.602 46.5415 56.5435 47.4845L71.5965 62.5365C71.832 62.772 72.2145 62.772 72.45 62.5365L87.5025 47.4845C88.4475 46.5415 89.9795 46.5415 89.8255 47.4845Z" fill="currentColor" />
                    </svg>
                    Connect with WalletConnect
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
