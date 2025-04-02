import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const handleConnectHashpack = async () => {
    await connectWallet("hashpack");
    setIsDialogOpen(false);
  };
  
  const handleConnectBlade = async () => {
    await connectWallet("blade");
    setIsDialogOpen(false);
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
            <div className="font-bold text-neutral-800 text-xl">TokenBurn</div>
            <div className="hidden md:block text-sm text-neutral-500 ml-2 mt-1">| Physical Redemption Platform</div>
          </div>
          
          {!isConnected ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    onClick={handleConnectHashpack}
                    className="w-full flex justify-center items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M7 7h.01" />
                      <path d="M17 7h.01" />
                      <path d="M7 17h.01" />
                      <path d="M17 17h.01" />
                    </svg>
                    Connect with HashPack
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
            <div className="flex items-center gap-4">
              <div className="text-sm text-neutral-600">
                Connected: <span className="font-medium">{accountId}</span>
              </div>
              <Button 
                variant="outline" 
                onClick={disconnectWallet}
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}