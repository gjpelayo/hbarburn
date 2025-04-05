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
            onClick={() => connectWallet("walletconnect")}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.04 8.67C9.99 4.83 16.23 4.83 20.18 8.67L20.67 9.14C20.82 9.29 20.82 9.54 20.67 9.69L19.05 11.27C18.98 11.34 18.86 11.34 18.79 11.27L18.13 10.63C15.24 7.83 10.98 7.83 8.09 10.63L7.38 11.32C7.31 11.39 7.19 11.39 7.12 11.32L5.5 9.74C5.35 9.59 5.35 9.34 5.5 9.19L6.04 8.67ZM22.44 6.49C27.73 11.63 27.73 19.69 22.44 24.83L22.43 24.84C22.41 24.86 22.38 24.88 22.36 24.89C22.33 24.93 22.29 24.96 22.24 24.98C22.21 25 22.17 25.01 22.13 25.01C22.09 25.01 22.05 25 22.01 24.98C21.96 24.96 21.92 24.93 21.89 24.89C21.87 24.88 21.84 24.86 21.82 24.84L19.38 22.49C19.22 22.34 19.22 22.09 19.38 21.94L21.03 20.34C24.35 17.11 24.35 11.89 21.03 8.66L20.27 7.93C20.11 7.77 20.11 7.52 20.27 7.37L22.06 5.63C22.13 5.56 22.22 5.52 22.31 5.51C22.36 5.51 22.4 5.52 22.45 5.53C22.47 5.54 22.48 5.54 22.5 5.55C22.63 5.63 22.63 5.63 22.66 5.65C22.66 5.65 22.66 5.66 22.67 5.66C22.73 5.72 22.73 5.72 22.74 5.73C22.82 5.81 22.84 5.83 22.89 5.94C22.91 5.97 22.91 5.98 22.92 6.01C22.99 6.16 22.95 6.34 22.84 6.46L22.44 6.49ZM7.71 15.44C10.61 12.65 14.86 12.65 17.76 15.44L18.14 15.81C18.29 15.95 18.29 16.2 18.14 16.35L16.53 17.92C16.45 17.99 16.33 17.99 16.26 17.92L15.71 17.39C13.87 15.62 11.6 15.62 9.76 17.39L3.33 23.61C3.26 23.68 3.14 23.68 3.07 23.61L1.45 22.04C1.31 21.89 1.31 21.64 1.45 21.49L7.71 15.44Z" fill="#3396FF"/>
            </svg>
            <span className="font-medium text-neutral-700">Connect with WalletConnect</span>
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
