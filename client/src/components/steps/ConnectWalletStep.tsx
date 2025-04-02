import { useWallet } from "@/context/WalletContext";

export function ConnectWalletStep() {
  const { connectWallet } = useWallet();
  
  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-6 mb-8">
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-primary-light/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">Connect Your Wallet</h2>
        <p className="text-neutral-500 mb-6">Connect your Hedera wallet to view your tokens and continue with the redemption process.</p>
        
        <div className="flex flex-col space-y-3">
          <button 
            className="flex items-center justify-center space-x-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            onClick={() => connectWallet("hashpack")}
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="hashpack_icon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#723cd3" />
                  <stop offset="100%" stopColor="#466bff" />
                </linearGradient>
              </defs>
              <path 
                d="M21 18v-2c0-1.7-0.3-3-2-3h-7v-4h1c1.7 0 3-1.3 3-3s-1.3-3-3-3h-1v-1c0-0.6-0.4-1-1-1s-1 0.4-1 1v1h-1c-0.6 0-1 0.4-1 1s0.4 1 1 1h4c0.6 0 1 0.4 1 1s-0.4 1-1 1h-7c-1.7 0-3 1.3-3 3v12c0 0.6 0.4 1 1 1h16c0.6 0 1-0.4 1-1zM10 9v2h-4v-2h4zM6 17v-4h4v4h-4zM18 17h-6v-4h6v4z"
                fill="url(#hashpack_icon)" 
              />
            </svg>
            <span className="font-medium text-neutral-700">Connect with HashPack</span>
          </button>
          <button 
            className="flex items-center justify-center space-x-2 px-4 py-3 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            onClick={() => connectWallet("blade")}
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
      </div>
      
      <div className="border-t border-neutral-200 pt-4 mt-4">
        <h3 className="text-sm font-medium text-neutral-800 mb-2">What is a Hedera wallet?</h3>
        <p className="text-sm text-neutral-500">A Hedera wallet allows you to store, send, and interact with tokens on the Hedera network. You'll need a wallet to burn tokens for physical redemption.</p>
      </div>
    </div>
  );
}
