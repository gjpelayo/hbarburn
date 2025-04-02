import { 
  createContext, 
  useContext, 
  useState, 
  ReactNode,
  useCallback 
} from "react";
import { useWallet } from "./WalletContext";
import { Token, ShippingInfo, BurnTransactionStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RedemptionContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  selectedToken: Token | null;
  setSelectedToken: (token: Token | null) => void;
  burnAmount: number;
  setBurnAmount: (amount: number) => void;
  shippingInfo: ShippingInfo | null;
  setShippingInfo: (info: ShippingInfo) => void;
  orderId: string | null;
  setOrderId: (id: string | null) => void;
  transactionId: string | null;
  burnTransactionStatus: BurnTransactionStatus;
  executeBurnTransaction: () => Promise<boolean>;
  createRedemptionOrder: () => Promise<boolean>;
  resetRedemption: () => void;
}

const RedemptionContext = createContext<RedemptionContextType | undefined>(undefined);

export function RedemptionContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { burnTokens, accountId } = useWallet();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [burnAmount, setBurnAmount] = useState(1);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [burnTransactionStatus, setBurnTransactionStatus] = useState<BurnTransactionStatus>("idle");
  
  // Create a redemption order before starting the burn transaction
  const createRedemptionOrder = useCallback(async (): Promise<boolean> => {
    if (!selectedToken || !shippingInfo) {
      toast({
        title: "Missing Information",
        description: "Token selection and shipping information are required",
        variant: "destructive"
      });
      return false;
    }
    
    try {
      // Submit the redemption data to create an order
      const response = await apiRequest("POST", "/api/redemptions", {
        tokenId: selectedToken.tokenId,
        burnAmount,
        shippingInfo,
        accountId: accountId // Include the accountId from wallet context
      });
      
      // Store the order ID from the response
      if (response && response.orderId) {
        setOrderId(response.orderId);
        return true;
      } else {
        toast({
          title: "Error",
          description: "Failed to create redemption order. Missing order ID in response.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Error creating redemption order:", error);
      toast({
        title: "Error",
        description: "Failed to create redemption order. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [selectedToken, burnAmount, shippingInfo, accountId, toast]);
  
  const executeBurnTransaction = useCallback(async (): Promise<boolean> => {
    if (!selectedToken) {
      toast({
        title: "Error",
        description: "No token selected for burning",
        variant: "destructive"
      });
      return false;
    }
    
    if (!orderId) {
      toast({
        title: "Error",
        description: "No redemption order created. Please try again.",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate token balance before burning
    if (selectedToken.balance < burnAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You have ${selectedToken.balance} tokens available but are trying to burn ${burnAmount}.`,
        variant: "destructive"
      });
      setBurnTransactionStatus("failed");
      return false;
    }
    
    try {
      // Set initial status
      setBurnTransactionStatus("preparing");
      
      // Wait a bit to simulate preparation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update status to signing
      setBurnTransactionStatus("signing");
      
      // Execute the burn transaction
      const txId = await burnTokens(selectedToken.tokenId, burnAmount);
      setTransactionId(txId);
      
      // Update status to broadcasting
      setBurnTransactionStatus("broadcasting");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update status to confirming
      setBurnTransactionStatus("confirming");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the redemption order with the transaction ID
      try {
        await apiRequest("PATCH", `/api/redemptions/${orderId}`, {
          transactionId: txId,
          status: "completed"
        });
      } catch (updateError) {
        console.error("Error updating redemption with transaction ID:", updateError);
        // Continue even if update fails, as the burn transaction was successful
      }
      
      // Update status to completing
      setBurnTransactionStatus("completing");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Set final status
      setBurnTransactionStatus("completed");
      
      return true;
    } catch (error) {
      console.error("Error executing burn transaction:", error);
      setBurnTransactionStatus("failed");
      toast({
        title: "Transaction Failed",
        description: "Failed to burn tokens. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [selectedToken, burnAmount, burnTokens, orderId, toast]);
  
  const resetRedemption = useCallback(() => {
    setCurrentStep(1);
    setSelectedToken(null);
    setBurnAmount(1);
    setShippingInfo(null);
    setOrderId(null);
    setTransactionId(null);
    setBurnTransactionStatus("idle");
  }, []);
  
  return (
    <RedemptionContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        selectedToken,
        setSelectedToken,
        burnAmount,
        setBurnAmount,
        shippingInfo,
        setShippingInfo,
        orderId,
        setOrderId,
        transactionId,
        burnTransactionStatus,
        executeBurnTransaction,
        createRedemptionOrder,
        resetRedemption,
      }}
    >
      {children}
    </RedemptionContext.Provider>
  );
}

export function useRedemption() {
  const context = useContext(RedemptionContext);
  if (context === undefined) {
    throw new Error("useRedemption must be used within a RedemptionContextProvider");
  }
  return context;
}
