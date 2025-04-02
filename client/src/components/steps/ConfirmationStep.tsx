import { useState } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getFormattedAddress, getCountryName } from "@/lib/utils";

export function ConfirmationStep({ 
  onBack, 
  onBurn 
}: { 
  onBack: () => void; 
  onBurn: () => void;
}) {
  const { toast } = useToast();
  const { selectedToken, burnAmount, shippingInfo } = useRedemption();
  const [confirmed, setConfirmed] = useState(false);
  
  const handleCheckboxChange = (checked: boolean) => {
    setConfirmed(checked);
  };

  const handleConfirmBurn = async () => {
    if (!confirmed) {
      toast({
        title: "Confirmation required",
        description: "Please confirm that you understand this action is irreversible",
        variant: "destructive"
      });
      return;
    }
    
    // Submit the redemption data to the backend before initiating the burn
    try {
      await apiRequest("POST", "/api/redemptions", {
        tokenId: selectedToken?.tokenId,
        burnAmount,
        shippingInfo
      });
      
      // Once the backend order is created, proceed to burn the tokens
      onBurn();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create redemption request. Please try again.",
        variant: "destructive"
      });
      console.error("Error creating redemption:", error);
    }
  };

  if (!selectedToken || !shippingInfo) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <p className="text-center text-neutral-500">
            Missing information. Please go back and complete all required steps.
          </p>
        </div>
      </div>
    );
  }

  const formattedAddress = getFormattedAddress(shippingInfo);
  const fullName = `${shippingInfo.firstName} ${shippingInfo.lastName}`;
  const countryName = getCountryName(shippingInfo.country);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">Confirm Your Redemption</h2>
        <p className="text-neutral-500 mb-6">Please review your redemption details before burning your tokens.</p>
        
        <div className="space-y-6">
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-medium text-neutral-800 mb-2">Token Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-neutral-500">Token Name:</div>
              <div className="text-neutral-800 font-medium">{selectedToken.name}</div>
              
              <div className="text-neutral-500">Token ID:</div>
              <div className="text-neutral-800 font-medium">{selectedToken.tokenId}</div>
              
              <div className="text-neutral-500">Amount to Burn:</div>
              <div className="text-neutral-800 font-medium">{burnAmount} token{burnAmount !== 1 ? 's' : ''}</div>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-medium text-neutral-800 mb-2">Shipping Information</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-neutral-500">Name:</div>
              <div className="text-neutral-800 font-medium">{fullName}</div>
              
              <div className="text-neutral-500">Email:</div>
              <div className="text-neutral-800 font-medium">{shippingInfo.email}</div>
              
              <div className="text-neutral-500">Address:</div>
              <div className="text-neutral-800 font-medium">{formattedAddress}</div>
              
              <div className="text-neutral-500">Phone:</div>
              <div className="text-neutral-800 font-medium">{shippingInfo.phone}</div>
            </div>
          </div>
          
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-medium text-neutral-800 mb-2">Redemption Summary</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-neutral-500">You will receive:</div>
              <div className="text-neutral-800 font-medium">{selectedToken.redemptionItem}</div>
              
              <div className="text-neutral-500">Estimated Delivery:</div>
              <div className="text-neutral-800 font-medium">2-3 weeks</div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
            <div className="flex space-x-3">
              <div className="flex-shrink-0">
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
                  className="text-yellow-500"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <path d="M12 9v4"></path>
                  <path d="M12 17h.01"></path>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Important Notice</h3>
                <p className="text-sm text-yellow-700">Token burning is irreversible. Once you confirm, the tokens will be permanently removed from your wallet and cannot be recovered.</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-start">
            <Checkbox
              id="confirm-checkbox"
              checked={confirmed}
              onCheckedChange={handleCheckboxChange}
              className="mt-1"
            />
            <label htmlFor="confirm-checkbox" className="ml-2 text-neutral-700 text-sm">
              I understand that this action is irreversible and confirm that I want to burn my tokens to redeem for physical goods.
            </label>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleConfirmBurn}
            disabled={!confirmed}
            className={!confirmed ? "opacity-50 cursor-not-allowed" : ""}
          >
            Confirm & Burn Tokens
          </Button>
        </div>
      </div>
    </div>
  );
}
