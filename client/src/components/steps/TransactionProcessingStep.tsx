import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface TransactionProgressStatus {
  preparing: "pending" | "active" | "complete" | "failed";
  signing: "pending" | "active" | "complete" | "failed";
  broadcasting: "pending" | "active" | "complete" | "failed";
  confirming: "pending" | "active" | "complete" | "failed";
  completing: "pending" | "active" | "complete" | "failed";
}

export function TransactionProcessingStep({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const { tokens, accountId } = useWallet();
  const { 
    burnTransactionStatus, 
    executeBurnTransaction, 
    selectedToken,
    burnAmount,
    orderId
  } = useRedemption();
  
  const [progress, setProgress] = useState<TransactionProgressStatus>({
    preparing: "active",
    signing: "pending",
    broadcasting: "pending",
    confirming: "pending",
    completing: "pending"
  });
  
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Initialize transaction process on component mount
  useEffect(() => {
    const startTransaction = async () => {
      if (burnTransactionStatus === "idle" && !isRetrying) {
        try {
          // Perform token balance validation
          if (selectedToken) {
            // Get the latest token data from wallet context
            const currentToken = tokens.find(t => t.tokenId === selectedToken.tokenId);
            
            if (!currentToken) {
              setError("Token not found in your wallet. Please try again.");
              return;
            }
            
            if (currentToken.balance < burnAmount) {
              setError(`Insufficient balance. You have ${currentToken.balance} tokens available but are trying to burn ${burnAmount}.`);
              setProgress(prev => ({
                ...prev,
                preparing: "failed"
              }));
              return;
            }
            
            if (!orderId) {
              setError("No redemption order found. Please go back and try again.");
              setProgress(prev => ({
                ...prev,
                preparing: "failed"
              }));
              return;
            }

            if (!accountId) {
              setError("Wallet not connected. Please connect your wallet and try again.");
              setProgress(prev => ({
                ...prev,
                preparing: "failed"
              }));
              return;
            }
          }
          
          // Execute the transaction if all validations pass
          const success = await executeBurnTransaction();
          
          if (success) {
            // Success is handled in the useEffect that watches burnTransactionStatus
          } else if (burnTransactionStatus !== "failed") {
            // Only set error if not already in failed state (to avoid overwriting more specific errors)
            setError("Transaction was not completed successfully. Please try again.");
          }
        } catch (error) {
          console.error("Error starting transaction:", error);
          setError("An error occurred while processing your transaction. Please try again.");
        }
      }
    };
    
    startTransaction();
  }, [accountId, burnAmount, burnTransactionStatus, executeBurnTransaction, isRetrying, orderId, selectedToken, tokens]);

  // Update progress based on transaction status
  useEffect(() => {
    if (burnTransactionStatus === "preparing") {
      setProgress({
        preparing: "active",
        signing: "pending",
        broadcasting: "pending",
        confirming: "pending",
        completing: "pending"
      });
    } else if (burnTransactionStatus === "signing") {
      setProgress({
        preparing: "complete",
        signing: "active",
        broadcasting: "pending",
        confirming: "pending",
        completing: "pending"
      });
    } else if (burnTransactionStatus === "broadcasting") {
      setProgress({
        preparing: "complete",
        signing: "complete",
        broadcasting: "active",
        confirming: "pending",
        completing: "pending"
      });
    } else if (burnTransactionStatus === "confirming") {
      setProgress({
        preparing: "complete",
        signing: "complete",
        broadcasting: "complete",
        confirming: "active",
        completing: "pending"
      });
    } else if (burnTransactionStatus === "completing") {
      setProgress({
        preparing: "complete",
        signing: "complete",
        broadcasting: "complete",
        confirming: "complete",
        completing: "active"
      });
    } else if (burnTransactionStatus === "completed") {
      setProgress({
        preparing: "complete",
        signing: "complete",
        broadcasting: "complete",
        confirming: "complete",
        completing: "complete"
      });
      
      // Add a small delay before transitioning to the success screen
      setTimeout(() => {
        onComplete();
      }, 1000);
    } else if (burnTransactionStatus === "failed") {
      // Determine which step failed based on the current progress
      if (progress.preparing === "active") {
        setProgress(prev => ({
          ...prev,
          preparing: "failed",
        }));
      } else if (progress.signing === "active") {
        setProgress(prev => ({
          ...prev,
          signing: "failed",
        }));
      } else if (progress.broadcasting === "active") {
        setProgress(prev => ({
          ...prev,
          broadcasting: "failed",
        }));
      } else if (progress.confirming === "active") {
        setProgress(prev => ({
          ...prev,
          confirming: "failed",
        }));
      } else if (progress.completing === "active") {
        setProgress(prev => ({
          ...prev,
          completing: "failed",
        }));
      }
      
      // Set a generic error message if none is set
      if (!error) {
        setError("Transaction failed. Please try again.");
      }
    }
  }, [burnTransactionStatus, error, onComplete, progress]);

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError("Maximum retry attempts reached. Please try again later.");
      toast({
        title: "Too Many Attempts",
        description: "Please try again later or contact support if the issue persists.",
        variant: "destructive"
      });
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    setError(null);
    
    try {
      // Reset progress state
      setProgress({
        preparing: "active",
        signing: "pending",
        broadcasting: "pending",
        confirming: "pending",
        completing: "pending"
      });
      
      // Execute the transaction again
      const success = await executeBurnTransaction();
      
      if (success) {
        // Success is handled by the useEffect
      } else {
        setError("Transaction failed again. Please try again later.");
      }
    } catch (error) {
      console.error("Error retrying transaction:", error);
      setError("An error occurred while retrying. Please try again later.");
    } finally {
      setIsRetrying(false);
    }
  };

  const getIconForStatus = (status: "pending" | "active" | "complete" | "failed", step: number) => {
    if (status === "complete") {
      return (
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
          className="text-green-600"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    } else if (status === "active") {
      return (
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
          className="animate-spin text-primary"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      );
    } else if (status === "failed") {
      return (
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
          className="text-red-500"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      );
    } else {
      return <span className="text-xs text-neutral-500">{step}</span>;
    }
  };

  const getContainerClassForStatus = (status: "pending" | "active" | "complete" | "failed") => {
    if (status === "complete") {
      return "w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2";
    } else if (status === "active") {
      return "w-6 h-6 rounded-full bg-primary-light/50 flex items-center justify-center mr-2";
    } else if (status === "failed") {
      return "w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-2";
    } else {
      return "w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center mr-2";
    }
  };

  const getTextClassForStatus = (status: "pending" | "active" | "complete" | "failed") => {
    if (status === "pending") {
      return "opacity-50";
    } else if (status === "failed") {
      return "text-red-500";
    }
    return "";
  };

  const isTransactionFailed = burnTransactionStatus === "failed" || 
    Object.values(progress).some(status => status === "failed");

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
        <div className="mb-4">
          <div className={`w-16 h-16 mx-auto rounded-full ${isTransactionFailed ? 'bg-red-50' : 'bg-primary/10'} flex items-center justify-center`}>
            {isTransactionFailed ? (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="text-red-500"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            ) : (
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="animate-spin text-primary"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
          </div>
        </div>
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">
          {isTransactionFailed ? "Transaction Failed" : "Processing Your Transaction"}
        </h2>
        <p className="text-neutral-500 mb-6">
          {isTransactionFailed 
            ? "We encountered an issue while processing your transaction." 
            : "Please wait while we process your token burn transaction on the Hedera network."}
        </p>
        
        {error && (
          <Alert variant="destructive" className="mb-6 text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="w-full max-w-md mx-auto bg-neutral-50 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className={`flex items-center ${getTextClassForStatus(progress.preparing)}`}>
              <div className={getContainerClassForStatus(progress.preparing)}>
                {getIconForStatus(progress.preparing, 1)}
              </div>
              <div className="flex-1 text-sm text-left">Preparing transaction</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.signing)}`}>
              <div className={getContainerClassForStatus(progress.signing)}>
                {getIconForStatus(progress.signing, 2)}
              </div>
              <div className="flex-1 text-sm text-left">Signing transaction with your wallet</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.broadcasting)}`}>
              <div className={getContainerClassForStatus(progress.broadcasting)}>
                {getIconForStatus(progress.broadcasting, 3)}
              </div>
              <div className="flex-1 text-sm text-left">Broadcasting to Hedera network</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.confirming)}`}>
              <div className={getContainerClassForStatus(progress.confirming)}>
                {getIconForStatus(progress.confirming, 4)}
              </div>
              <div className="flex-1 text-sm text-left">Waiting for confirmation</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.completing)}`}>
              <div className={getContainerClassForStatus(progress.completing)}>
                {getIconForStatus(progress.completing, 5)}
              </div>
              <div className="flex-1 text-sm text-left">Completing redemption</div>
            </div>
          </div>
        </div>
        
        {isTransactionFailed ? (
          <div className="flex justify-center">
            <Button 
              onClick={handleRetry} 
              disabled={isRetrying || retryCount >= 3}
              className="mr-2"
            >
              {isRetrying ? "Retrying..." : `Try Again (${3 - retryCount} attempts left)`}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">This process typically takes less than a minute. Please do not close this window.</p>
        )}
      </div>
    </div>
  );
}
