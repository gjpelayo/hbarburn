import { useState, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Footer } from "@/components/Footer";
import { ProgressSteps, Step } from "@/components/ui/progress-steps";
import { PhysicalItemsGrid, PhysicalItem, PHYSICAL_ITEMS } from "@/components/PhysicalItemsGrid";
import { WalletConnectHeader } from "@/components/WalletConnectHeader";
import { ShippingStep } from "@/components/steps/ShippingStep";
import { ConfirmationStep } from "@/components/steps/ConfirmationStep";
import { TransactionProcessingStep } from "@/components/steps/TransactionProcessingStep";
import { SuccessStep } from "@/components/steps/SuccessStep";
import { EducationalContent } from "@/components/EducationalContent";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { isConnected, tokens } = useWallet();
  const { 
    currentStep, 
    setCurrentStep, 
    setSelectedToken,
    setBurnAmount,
    executeBurnTransaction, 
    resetRedemption 
  } = useRedemption();
  
  const [selectedPhysicalItem, setSelectedPhysicalItem] = useState<PhysicalItem | null>(null);
  
  // Update the steps to reflect our new flow
  const steps: Step[] = [
    { id: 1, name: "Select Item", status: currentStep === 1 ? "current" : currentStep > 1 ? "complete" : "upcoming" },
    { id: 2, name: "Shipping", status: currentStep === 2 ? "current" : currentStep > 2 ? "complete" : "upcoming" },
    { id: 3, name: "Confirm", status: currentStep === 3 ? "current" : currentStep > 3 ? "complete" : "upcoming" }
  ];
  
  const handlePhysicalItemSelect = (item: PhysicalItem) => {
    setSelectedPhysicalItem(item);
  };
  
  const handleProceedToShipping = () => {
    console.log('Proceed to shipping called', { selectedPhysicalItem, isConnected, tokens });
    
    if (!selectedPhysicalItem || !isConnected) {
      console.log('Selected item or connection missing');
      return;
    }
    
    // Find the matching token for the selected physical item
    const token = tokens.find(t => t.tokenId === selectedPhysicalItem.tokenId);
    console.log('Found token:', token);
    
    if (token) {
      // Set the token and burn amount in the redemption context
      setSelectedToken(token);
      setBurnAmount(selectedPhysicalItem.tokenCost);
      
      // Move to shipping step
      setCurrentStep(2);
    } else {
      console.log('No matching token found for tokenId:', selectedPhysicalItem.tokenId);
    }
  };
  
  const handleBackToItems = () => {
    setCurrentStep(1);
  };
  
  const handleContinueToConfirmation = () => {
    setCurrentStep(3);
  };
  
  const handleBackToShipping = () => {
    setCurrentStep(2);
  };
  
  const handleBurn = async () => {
    setCurrentStep(4); // Processing step
    await executeBurnTransaction();
  };
  
  const handleTransactionComplete = () => {
    setCurrentStep(5); // Success step
  };
  
  const handleRedeemMore = () => {
    resetRedemption();
    setSelectedPhysicalItem(null);
    setCurrentStep(1);
  };
  
  return (
    <>
      <WalletConnectHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 mb-2">Physical Goods Redemption</h1>
          <p className="text-neutral-500 max-w-2xl mx-auto">Browse items, connect your wallet, and redeem physical products by burning your Hedera tokens.</p>
        </div>
        
        {/* Progress Steps - Only show for steps 2-4 (after item selection) */}
        {currentStep >= 2 && currentStep <= 3 && <ProgressSteps steps={steps} />}
        
        {/* Step components */}
        {currentStep === 1 && (
          <>
            <PhysicalItemsGrid onItemSelect={handlePhysicalItemSelect} />
            
            <div className="mt-8 flex justify-center">
              <Button 
                onClick={handleProceedToShipping}
                disabled={!selectedPhysicalItem || !isConnected}
                size="lg"
                className="px-8"
              >
                {!isConnected 
                  ? "Connect Wallet to Continue"
                  : !selectedPhysicalItem 
                  ? "Select an Item to Continue" 
                  : "Continue to Shipping"}
              </Button>
            </div>
          </>
        )}
        
        {currentStep === 2 && (
          <ShippingStep 
            onBack={handleBackToItems} 
            onContinue={handleContinueToConfirmation} 
          />
        )}
        
        {currentStep === 3 && (
          <ConfirmationStep 
            onBack={handleBackToShipping} 
            onBurn={handleBurn} 
          />
        )}
        
        {currentStep === 4 && (
          <TransactionProcessingStep 
            onComplete={handleTransactionComplete} 
          />
        )}
        
        {currentStep === 5 && (
          <SuccessStep 
            onRedeemMore={handleRedeemMore} 
          />
        )}
        
        {/* Educational Content - Show only on initial item selection page */}
        {currentStep === 1 && <EducationalContent />}
      </main>
      
      <Footer />
    </>
  );
}
