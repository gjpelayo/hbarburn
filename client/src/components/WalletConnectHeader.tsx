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
      console.error("Error connecting WalletConnect wallet:", error);
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
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67ZM22.44 6.49C27.73 11.63 27.73 19.69 22.44 24.83L22.43 24.84C22.41 24.86 22.38 24.88 22.36 24.89C22.33 24.93 22.29 24.96 22.24 24.98C22.21 25 22.17 25.01 22.13 25.01C22.09 25.01 22.05 25 22.01 24.98C21.96 24.96 21.92 24.93 21.89 24.89C21.87 24.88 21.84 24.86 21.82 24.84L19.38 22.49C19.22 22.34 19.22 22.09 19.38 21.94L21.03 20.34C24.35 17.11 24.35 11.89 21.03 8.66L20.27 7.93C20.11 7.77 20.11 7.52 20.27 7.37L22.06 5.63C22.13 5.56 22.22 5.52 22.31 5.51C22.36 5.51 22.4 5.52 22.45 5.53C22.47 5.54 22.48 5.54 22.5 5.55C22.63 5.63 22.63 5.63 22.66 5.65C22.66 5.65 22.66 5.66 22.67 5.66C22.73 5.72 22.73 5.72 22.74 5.73C22.82 5.81 22.84 5.83 22.89 5.94C22.91 5.97 22.91 5.98 22.92 6.01C22.99 6.16 22.95 6.34 22.84 6.46L22.44 6.49ZM7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#3396FF"/>
                      </svg>
                      <span className="ml-2">Connect with WalletConnect</span>
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