import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProgressSteps, Step } from "@/components/ui/progress-steps";
import { ConnectWalletStep } from "@/components/steps/ConnectWalletStep";
import { TokenSelectionStep } from "@/components/steps/TokenSelectionStep";
import { ShippingStep } from "@/components/steps/ShippingStep";
import { ConfirmationStep } from "@/components/steps/ConfirmationStep";
import { TransactionProcessingStep } from "@/components/steps/TransactionProcessingStep";
import { SuccessStep } from "@/components/steps/SuccessStep";
import { EducationalContent } from "@/components/EducationalContent";

export default function Home() {
  const { isConnected } = useWallet();
  const { 
    currentStep, 
    setCurrentStep, 
    executeBurnTransaction, 
    resetRedemption 
  } = useRedemption();
  
  const steps: Step[] = [
    { id: 1, name: "Connect", status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming" },
    { id: 2, name: "Select Token", status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming" },
    { id: 3, name: "Shipping", status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming" },
    { id: 4, name: "Confirm", status: currentStep === 4 ? "current" : currentStep > 4 ? "complete" : "upcoming" }
  ];
  
  // Automatically move to token selection when wallet is connected
  useEffect(() => {
    if (isConnected && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [isConnected, currentStep, setCurrentStep]);
  
  const handleContinueToShipping = () => {
    setCurrentStep(3);
  };
  
  const handleBackToTokenSelection = () => {
    setCurrentStep(2);
  };
  
  const handleContinueToConfirmation = () => {
    setCurrentStep(4);
  };
  
  const handleBackToShipping = () => {
    setCurrentStep(3);
  };
  
  const handleBurn = async () => {
    setCurrentStep(5); // Processing step
    await executeBurnTransaction();
  };
  
  const handleTransactionComplete = () => {
    setCurrentStep(6); // Success step
  };
  
  const handleRedeemMore = () => {
    resetRedemption();
    setCurrentStep(1);
  };
  
  return (
    <>
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-2">Burn Tokens, Redeem Physical Goods</h1>
          <p className="text-neutral-500 max-w-2xl mx-auto">Connect your wallet to burn Hedera tokens and redeem them for physical products shipped to your address.</p>
        </div>
        
        {/* Progress Steps - Only show for steps 1-4 */}
        {currentStep <= 4 && <ProgressSteps steps={steps} />}
        
        {/* Step components */}
        {currentStep === 1 && <ConnectWalletStep />}
        
        {currentStep === 2 && (
          <TokenSelectionStep onContinue={handleContinueToShipping} />
        )}
        
        {currentStep === 3 && (
          <ShippingStep 
            onBack={handleBackToTokenSelection} 
            onContinue={handleContinueToConfirmation} 
          />
        )}
        
        {currentStep === 4 && (
          <ConfirmationStep 
            onBack={handleBackToShipping} 
            onBurn={handleBurn} 
          />
        )}
        
        {currentStep === 5 && (
          <TransactionProcessingStep 
            onComplete={handleTransactionComplete} 
          />
        )}
        
        {currentStep === 6 && (
          <SuccessStep 
            onRedeemMore={handleRedeemMore} 
          />
        )}
        
        {/* Educational Content - Show only on first steps */}
        {currentStep <= 3 && <EducationalContent />}
      </main>
      
      <Footer />
    </>
  );
}
