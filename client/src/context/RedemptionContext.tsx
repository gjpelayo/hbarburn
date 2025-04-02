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
  transactionId: string | null;
  burnTransactionStatus: BurnTransactionStatus;
  executeBurnTransaction: () => Promise<boolean>;
  resetRedemption: () => void;
}

const RedemptionContext = createContext<RedemptionContextType | undefined>(undefined);

export function RedemptionContextProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { burnTokens } = useWallet();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [burnAmount, setBurnAmount] = useState(1);
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [burnTransactionStatus, setBurnTransactionStatus] = useState<BurnTransactionStatus>("idle");
  
  const executeBurnTransaction = useCallback(async (): Promise<boolean> => {
    if (!selectedToken) {
      toast({
        title: "Error",
        description: "No token selected for burning",
        variant: "destructive"
      });
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
      await apiRequest("PATCH", `/api/redemptions/${orderId}`, {
        transactionId: txId,
        status: "completed"
      });
      
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
        transactionId,
        burnTransactionStatus,
        executeBurnTransaction,
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
