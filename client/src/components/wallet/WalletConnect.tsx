import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function WalletConnect() {
  const { accountId, isConnected, connectWallet, disconnectWallet, authenticateWithSignature } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleConnectClick = () => {
    connectWallet("walletconnect");
  };
  
  const handleSignatureAuth = async () => {
    setIsAuthenticating(true);
    try {
      await authenticateWithSignature();
    } finally {
      setIsAuthenticating(false);
    }
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
          onClick={handleSignatureAuth}
          disabled={isAuthenticating}
          className="text-xs"
        >
          {isAuthenticating ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing...
            </>
          ) : "Authenticate"}
        </Button>
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
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67ZM7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#ffffff"/>
          </svg>
          Connect with WalletConnect
        </div>
      </Button>
    </div>
  );
}
