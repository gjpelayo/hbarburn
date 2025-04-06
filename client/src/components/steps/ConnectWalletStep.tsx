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
            <svg width="24" height="24" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.4995 36.6505C40.0745 22.0765 64.4155 22.0765 78.9915 36.6505L81.2085 38.8675C82.1515 39.8105 82.1515 41.3435 81.2085 42.2855L74.8525 48.6425C74.3815 49.1135 73.614 49.1135 73.143 48.6425L70.093 45.5935C60.2725 35.7735 44.217 35.7735 34.3965 45.5935L31.1855 48.8045C30.7145 49.2755 29.947 49.2755 29.476 48.8045L23.1195 42.4485C22.1765 41.5055 22.1765 39.9725 23.1195 39.0305L25.4995 36.6505ZM89.8255 47.4845L95.449 53.1075C96.392 54.0505 96.392 55.5835 95.449 56.5255L73.1995 78.7775C72.2555 79.7205 70.7235 79.7205 69.7815 78.7775L54.7275 63.7255C54.492 63.49 54.1095 63.49 53.874 63.7255L38.8215 78.7775C37.8775 79.7205 36.3455 79.7205 35.404 78.7775L13.126 56.5255C12.183 55.5835 12.183 54.0505 13.126 53.1075L18.7495 47.4845C19.6935 46.5415 21.2255 46.5415 22.1675 47.4845L37.22 62.5365C37.455 62.772 37.838 62.772 38.0735 62.5365L53.126 47.4845C54.07 46.5415 55.602 46.5415 56.5435 47.4845L71.5965 62.5365C71.832 62.772 72.2145 62.772 72.45 62.5365L87.5025 47.4845C88.4475 46.5415 89.9795 46.5415 89.8255 47.4845Z" fill="#3B99FC" />
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
