import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";

export function WalletConnectHeader() {
  const { isConnected, accountId, connectWallet, disconnectWallet } = useWallet();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  
  const handleConnectWalletConnect = async () => {
    try {
      await connectWallet("walletconnect");
      setIsConnectDialogOpen(false);
      // No redirection - stay on current page
    } catch (error) {
      console.error("Error connecting with WalletConnect:", error);
    }
  };
  
  const handleConnectBlade = async () => {
    try {
      await connectWallet("blade");
      setIsConnectDialogOpen(false);
      // No redirection - stay on current page
    } catch (error) {
      console.error("Error connecting Blade wallet:", error);
    }
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
    setIsDisconnectDialogOpen(false);
    
    // If on admin page, redirect to home
    if (location.includes('/admin')) {
      navigate('/');
    }
  };
  
  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="h-7 w-7 text-primary"
              >
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="m4.93 4.93 4.24 4.24"/>
                <path d="m14.83 9.17 4.24-4.24"/>
                <path d="m14.83 14.83 4.24 4.24"/>
                <path d="m9.17 14.83-4.24 4.24"/>
                <circle cx="12" cy="12" r="4"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-neutral-800 text-xl">TokenBurn</div>
              <div className="hidden md:block text-xs text-neutral-500">Physical Redemption Platform</div>
            </div>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            {!isConnected ? (
              <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="bg-primary text-white">
                    Connect Wallet
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Connect your wallet</DialogTitle>
                    <DialogDescription>
                      Choose a wallet to connect to the Hedera network.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Button 
                      onClick={handleConnectWalletConnect}
                      className="w-full flex justify-center items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67Z" fill="#3396FF"/>
                        <path d="M22.44 6.49C27.73 11.63 27.73 19.69 22.44 24.83L22.43 24.84C22.36 24.9 22.26 24.91 22.18 24.86L19.75 22.5C19.61 22.35 19.61 22.11 19.75 21.95L21.44 20.3C24.69 17.11 24.69 11.9 21.44 8.71L19.73 7.04C19.59 6.89 19.59 6.65 19.73 6.49L21.51 4.76C21.53 4.74 21.56 4.72 21.59 4.71C21.65 4.68 21.71 4.68 21.77 4.69C21.83 4.71 21.89 4.75 21.93 4.8L22.44 6.49Z" fill="#3396FF"/>
                        <path d="M7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#3396FF"/>
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
            ) : (
              <Dialog open={isDisconnectDialogOpen} onOpenChange={setIsDisconnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-green-500 text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                    <span className="truncate max-w-[140px]">{accountId}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Wallet Connected</DialogTitle>
                    <DialogDescription>
                      Your wallet is currently connected to the Hedera network.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="pt-4 pb-2">
                    <div className="mb-4 p-3 bg-neutral-50 rounded-md border">
                      <div className="text-xs text-neutral-500 mb-1">Connected Account</div>
                      <div className="text-neutral-800 font-medium">{accountId}</div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => {
                          setIsDisconnectDialogOpen(false);
                          navigate('/admin');
                        }}
                        variant="default"
                        className="w-full"
                      >
                        Go to Dashboard
                      </Button>
                      <Button 
                        onClick={handleDisconnect}
                        variant="destructive"
                        className="w-full"
                      >
                        Disconnect Wallet
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}