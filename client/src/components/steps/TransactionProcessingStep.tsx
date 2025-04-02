import { useState, useEffect } from "react";
import { useRedemption } from "@/context/RedemptionContext";

interface TransactionProgressStatus {
  preparing: "pending" | "active" | "complete";
  signing: "pending" | "active" | "complete";
  broadcasting: "pending" | "active" | "complete";
  confirming: "pending" | "active" | "complete";
  completing: "pending" | "active" | "complete";
}

export function TransactionProcessingStep({ onComplete }: { onComplete: () => void }) {
  const { burnTransactionStatus } = useRedemption();
  
  const [progress, setProgress] = useState<TransactionProgressStatus>({
    preparing: "active",
    signing: "pending",
    broadcasting: "pending",
    confirming: "pending",
    completing: "pending"
  });

  useEffect(() => {
    // Update progress based on transaction status
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
    }
  }, [burnTransactionStatus, onComplete]);

  const getIconForStatus = (status: "pending" | "active" | "complete", step: number) => {
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
    } else {
      return <span className="text-xs text-neutral-500">{step}</span>;
    }
  };

  const getContainerClassForStatus = (status: "pending" | "active" | "complete") => {
    if (status === "complete") {
      return "w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mr-2";
    } else if (status === "active") {
      return "w-6 h-6 rounded-full bg-primary-light/50 flex items-center justify-center mr-2";
    } else {
      return "w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center mr-2";
    }
  };

  const getTextClassForStatus = (status: "pending" | "active" | "complete") => {
    if (status === "pending") {
      return "opacity-50";
    }
    return "";
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
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
          </div>
        </div>
        <h2 className="text-xl font-semibold text-neutral-800 mb-2">Processing Your Transaction</h2>
        <p className="text-neutral-500 mb-6">Please wait while we process your token burn transaction on the Hedera network.</p>
        
        <div className="w-full max-w-md mx-auto bg-neutral-50 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            <div className={`flex items-center ${getTextClassForStatus(progress.preparing)}`}>
              <div className={getContainerClassForStatus(progress.preparing)}>
                {getIconForStatus(progress.preparing, 1)}
              </div>
              <div className="flex-1 text-sm text-neutral-700">Preparing transaction</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.signing)}`}>
              <div className={getContainerClassForStatus(progress.signing)}>
                {getIconForStatus(progress.signing, 2)}
              </div>
              <div className="flex-1 text-sm text-neutral-700">Signing transaction with your wallet</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.broadcasting)}`}>
              <div className={getContainerClassForStatus(progress.broadcasting)}>
                {getIconForStatus(progress.broadcasting, 3)}
              </div>
              <div className="flex-1 text-sm text-neutral-700">Broadcasting to Hedera network</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.confirming)}`}>
              <div className={getContainerClassForStatus(progress.confirming)}>
                {getIconForStatus(progress.confirming, 4)}
              </div>
              <div className="flex-1 text-sm text-neutral-700">Waiting for confirmation</div>
            </div>
            
            <div className={`flex items-center ${getTextClassForStatus(progress.completing)}`}>
              <div className={getContainerClassForStatus(progress.completing)}>
                {getIconForStatus(progress.completing, 5)}
              </div>
              <div className="flex-1 text-sm text-neutral-700">Completing redemption</div>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-neutral-500">This process typically takes less than a minute. Please do not close this window.</p>
      </div>
    </div>
  );
}
