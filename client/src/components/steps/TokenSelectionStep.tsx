import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Token } from "@/types";

interface TokenCardProps {
  token: Token;
  isSelected: boolean;
  onSelect: (token: Token) => void;
}

function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  return (
    <div 
      className={`token-card border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary/5" : "border-neutral-200 hover:border-primary"
      }`}
      onClick={() => onSelect(token)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
            className="text-primary"
          >
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
            <line x1="16" y1="8" x2="2" y2="22" />
            <line x1="17.5" y1="15" x2="9" y2="15" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-neutral-800">{token.name}</h3>
          <div className="text-sm text-neutral-500">Token ID: {token.tokenId}</div>
        </div>
        <div className="text-right">
          <div className="font-medium text-neutral-800">{token.balance} tokens</div>
          <div className="text-xs text-neutral-500">Available Balance</div>
        </div>
      </div>
    </div>
  );
}

export function TokenSelectionStep({ onContinue }: { onContinue: () => void }) {
  const { tokens } = useWallet();
  const { selectedToken, setSelectedToken, burnAmount, setBurnAmount } = useRedemption();
  const [showDetails, setShowDetails] = useState(false);

  const handleTokenSelect = (token: Token) => {
    setSelectedToken(token);
    setShowDetails(true);
  };

  const handleBackToTokens = () => {
    setShowDetails(false);
  };

  const handleContinue = () => {
    onContinue();
  };

  const handleDecrementAmount = () => {
    if (burnAmount > 1) {
      setBurnAmount(burnAmount - 1);
    }
  };

  const handleIncrementAmount = () => {
    if (selectedToken && burnAmount < selectedToken.balance) {
      setBurnAmount(burnAmount + 1);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && selectedToken && value <= selectedToken.balance) {
      setBurnAmount(value);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!showDetails ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">Select Token to Burn</h2>
          <p className="text-neutral-500 mb-6">Choose a token from your wallet to burn and redeem for physical goods.</p>
          
          <div className="space-y-4">
            {tokens.map((token) => (
              <TokenCard
                key={token.tokenId}
                token={token}
                isSelected={selectedToken?.tokenId === token.tokenId}
                onSelect={handleTokenSelect}
              />
            ))}
            
            {tokens.length === 0 && (
              <div className="text-center py-8 text-neutral-500">
                No tokens found in your wallet.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">Token Redemption Details</h2>
          
          {selectedToken && (
            <div className="flex flex-col md:flex-row md:space-x-6 space-y-4 md:space-y-0">
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Selected Token</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
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
                        className="text-primary"
                      >
                        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
                        <line x1="16" y1="8" x2="2" y2="22" />
                        <line x1="17.5" y1="15" x2="9" y2="15" />
                      </svg>
                    </div>
                    <div className="font-medium text-neutral-800">{selectedToken.name}</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Token ID</h3>
                  <div className="font-medium text-neutral-800">{selectedToken.tokenId}</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Available Balance</h3>
                  <div className="font-medium text-neutral-800">{selectedToken.balance} tokens</div>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Redeemable For</h3>
                  <div className="text-neutral-800">{selectedToken.redemptionItem}</div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Tokens Required</h3>
                  <div className="text-neutral-800">1 token per item</div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 mb-1">Burn Amount</h3>
                  <div className="mt-1">
                    <div className="flex items-center">
                      <button 
                        className="w-8 h-8 rounded-l bg-neutral-100 flex items-center justify-center border border-neutral-300"
                        onClick={handleDecrementAmount}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-neutral-600"
                        >
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <Input
                        type="number"
                        className="w-16 h-8 border-y border-neutral-300 text-center rounded-none"
                        value={burnAmount}
                        onChange={handleAmountChange}
                        min={1}
                        max={selectedToken.balance}
                      />
                      <button 
                        className="w-8 h-8 rounded-r bg-neutral-100 flex items-center justify-center border border-neutral-300"
                        onClick={handleIncrementAmount}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-neutral-600"
                        >
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={handleBackToTokens}>
              Back
            </Button>
            <Button onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
