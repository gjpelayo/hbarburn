import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function WalletConnect() {
  const { accountId, isConnected, connectWallet, disconnectWallet } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  const handleConnectClick = () => {
    setIsOpen(true);
  };

  const handleConnect = async (walletType: "hashpack" | "blade") => {
    await connectWallet(walletType);
    setIsOpen(false);
  };

  if (isConnected) {
    return (
      <div className="flex items-center space-x-2">
        <div className="bg-neutral-100 px-3 py-1 rounded-lg text-sm flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 text-primary"
          >
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
          </svg>
          <span className="text-neutral-600 font-medium">{accountId}</span>
        </div>
        <div className="bg-green-100 px-2 py-1 rounded-lg text-xs text-green-800 flex items-center">
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
          Connected
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => disconnectWallet()}
          className="text-xs"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={handleConnectClick} className="bg-primary text-white hover:bg-primary-dark transition-colors">
        Connect Wallet
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <span></span>
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col space-y-3 p-2">
            <h3 className="font-medium text-center mb-2">Connect Wallet</h3>
            <button 
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              onClick={() => handleConnect("hashpack")}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="hashpack" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#723cd3" />
                    <stop offset="100%" stopColor="#466bff" />
                  </linearGradient>
                </defs>
                <path 
                  d="M21 18v-2c0-1.7-0.3-3-2-3h-7v-4h1c1.7 0 3-1.3 3-3s-1.3-3-3-3h-1v-1c0-0.6-0.4-1-1-1s-1 0.4-1 1v1h-1c-0.6 0-1 0.4-1 1s0.4 1 1 1h4c0.6 0 1 0.4 1 1s-0.4 1-1 1h-7c-1.7 0-3 1.3-3 3v12c0 0.6 0.4 1 1 1h16c0.6 0 1-0.4 1-1zM10 9v2h-4v-2h4zM6 17v-4h4v4h-4zM18 17h-6v-4h6v4z"
                  fill="url(#hashpack)" 
                />
              </svg>
              <span className="font-medium text-neutral-700">Connect with HashPack</span>
            </button>
            <button 
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
              onClick={() => handleConnect("blade")}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-neutral-600"
              >
                <path d="M7 15h0a5 5 0 0 1 5-5h0a5 5 0 0 1 5 5h0a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5Z"></path>
                <path d="M4 16v-1a2 2 0 0 1 2-2h1"></path>
                <path d="M9 10V8a2 2 0 0 1 2-2h0v0a2 2 0 0 1 2 2v2"></path>
                <path d="M17 16v-1a2 2 0 0 0-2-2h-1"></path>
              </svg>
              <span className="font-medium text-neutral-700">Connect with Blade</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
