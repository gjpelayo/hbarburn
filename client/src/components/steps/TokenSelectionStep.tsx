import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Token } from "@/types";

interface TokenCardProps {
  token: Token;
  isSelected: boolean;
  onSelect: (token: Token) => void;
}

function TokenCard({ token, isSelected, onSelect }: TokenCardProps) {
  const hasBalance = token.balance > 0;
  
  return (
    <div 
      className={`token-card border rounded-lg p-4 cursor-pointer transition-colors ${
        isSelected ? "border-primary bg-primary/5" : hasBalance ? "border-neutral-200 hover:border-primary" : "border-neutral-200 opacity-60"
      }`}
      onClick={() => hasBalance && onSelect(token)}
    >
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasBalance ? "bg-primary/10" : "bg-neutral-100"}`}>
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
            className={hasBalance ? "text-primary" : "text-neutral-400"}
          >
            <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
            <line x1="16" y1="8" x2="2" y2="22" />
            <line x1="17.5" y1="15" x2="9" y2="15" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${hasBalance ? "text-neutral-800" : "text-neutral-500"}`}>{token.name}</h3>
          <div className="text-sm text-neutral-500">Token ID: {token.tokenId}</div>
        </div>
        <div className="text-right">
          <div className={`font-medium ${hasBalance ? "text-neutral-800" : "text-red-500"}`}>
            {token.balance} tokens
            {!hasBalance && <span className="text-xs ml-1">(Empty)</span>}
          </div>
          <div className="text-xs text-neutral-500">Available Balance</div>
        </div>
      </div>
      
      {!hasBalance && (
        <div className="mt-2 text-xs text-red-500 font-medium">
          Insufficient balance to redeem
        </div>
      )}
    </div>
  );
}

export function TokenSelectionStep({ onContinue }: { onContinue: () => void }) {
  const { tokens } = useWallet();
  const { toast } = useToast();
  const { selectedToken, setSelectedToken, burnAmount, setBurnAmount } = useRedemption();
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the current selected token and burn amount are valid
  const hasInsufficientBalance = selectedToken && burnAmount > selectedToken.balance;
  const isValidSelection = selectedToken && burnAmount > 0 && !hasInsufficientBalance;

  const handleTokenSelect = (token: Token) => {
    // Clear any previous errors
    setError(null);
    
    // Only allow tokens with positive balance
    if (token.balance <= 0) {
      setError(`${token.name} has insufficient balance (${token.balance} tokens).`);
      return;
    }
    
    setSelectedToken(token);
    
    // Initialize burn amount to 1 or reset to current token's balance if needed
    const initialAmount = Math.min(token.balance, burnAmount > 0 ? burnAmount : 1);
    setBurnAmount(initialAmount);
    
    setShowDetails(true);
  };

  const handleBackToTokens = () => {
    setShowDetails(false);
    setError(null);
  };

  const handleContinue = () => {
    // Validate before continuing
    if (!selectedToken) {
      setError("Please select a token to continue.");
      return;
    }
    
    if (burnAmount <= 0) {
      setError("Please select a valid burn amount greater than zero.");
      return;
    }
    
    if (burnAmount > selectedToken.balance) {
      setError(`Insufficient balance. You have ${selectedToken.balance} tokens available but are trying to burn ${burnAmount}.`);
      return;
    }
    
    // If all validations pass, clear error and continue
    setError(null);
    onContinue();
  };

  const handleDecrementAmount = () => {
    if (burnAmount > 1) {
      setBurnAmount(burnAmount - 1);
      // Clear error if decrement makes the amount valid
      if (hasInsufficientBalance && burnAmount - 1 <= (selectedToken?.balance || 0)) {
        setError(null);
      }
    }
  };

  const handleIncrementAmount = () => {
    if (selectedToken && burnAmount < selectedToken.balance) {
      setBurnAmount(burnAmount + 1);
    } else if (selectedToken) {
      // Show error when trying to exceed available balance
      setError(`Maximum available balance is ${selectedToken.balance} tokens.`);
      toast({
        title: "Balance Limit Reached",
        description: `You cannot burn more than your available balance of ${selectedToken.balance} tokens.`,
        variant: "destructive"
      });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    
    if (!selectedToken) return;

    if (isNaN(value)) {
      setBurnAmount(1); // Reset to 1 if invalid input
      return;
    }
    
    // Always update the input value for a smoother UX
    setBurnAmount(value);
    
    // But provide feedback if it's invalid
    if (value <= 0) {
      setError("Burn amount must be greater than zero.");
    } else if (value > selectedToken.balance) {
      setError(`Insufficient balance. You have ${selectedToken.balance} tokens available.`);
    } else {
      setError(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {!showDetails ? (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-neutral-800 mb-4">Select Token to Burn</h2>
          <p className="text-neutral-500 mb-6">Choose a token from your wallet to burn and redeem for physical goods.</p>
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
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
          
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
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
                  <div className={`font-medium ${hasInsufficientBalance ? "text-red-500" : "text-neutral-800"}`}>
                    {selectedToken.balance} tokens
                    {hasInsufficientBalance && (
                      <div className="text-xs font-normal mt-1">
                        (Not enough for current selection)
                      </div>
                    )}
                  </div>
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
                        className={`w-8 h-8 rounded-l flex items-center justify-center border ${
                          burnAmount > 1 ? "bg-neutral-100 border-neutral-300" : "bg-neutral-50 border-neutral-200 cursor-not-allowed"
                        }`}
                        onClick={handleDecrementAmount}
                        disabled={burnAmount <= 1}
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
                          className={burnAmount > 1 ? "text-neutral-600" : "text-neutral-400"}
                        >
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                      <Input
                        type="number"
                        className={`w-16 h-8 border-y border-neutral-300 text-center rounded-none ${
                          hasInsufficientBalance ? "border-red-300 text-red-600" : ""
                        }`}
                        value={burnAmount}
                        onChange={handleAmountChange}
                        min={1}
                        max={selectedToken.balance}
                      />
                      <button 
                        className={`w-8 h-8 rounded-r flex items-center justify-center border ${
                          selectedToken && burnAmount < selectedToken.balance 
                            ? "bg-neutral-100 border-neutral-300" 
                            : "bg-neutral-50 border-neutral-200 cursor-not-allowed"
                        }`}
                        onClick={handleIncrementAmount}
                        disabled={!selectedToken || burnAmount >= selectedToken.balance}
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
                          className={selectedToken && burnAmount < selectedToken.balance ? "text-neutral-600" : "text-neutral-400"}
                        >
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </button>
                    </div>
                    {hasInsufficientBalance && (
                      <div className="text-xs text-red-500 mt-1">
                        Exceeds available balance of {selectedToken.balance} tokens
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button variant="outline" onClick={handleBackToTokens}>
              Back
            </Button>
            <Button 
              onClick={handleContinue} 
              disabled={!isValidSelection}
              className={!isValidSelection ? "opacity-50 cursor-not-allowed" : ""}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
