import { useRedemption } from "@/context/RedemptionContext";
import { Button } from "@/components/ui/button";
import { getFormattedAddress, getCountryName } from "@/lib/utils";

export function SuccessStep({ onRedeemMore }: { onRedeemMore: () => void }) {
  const { 
    selectedToken, 
    burnAmount, 
    shippingInfo, 
    transactionId, 
    orderId 
  } = useRedemption();

  if (!selectedToken || !shippingInfo) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
          <p className="text-neutral-500">
            Something went wrong. Transaction information is missing.
          </p>
          <Button 
            onClick={onRedeemMore} 
            className="mt-4"
          >
            Start Over
          </Button>
        </div>
      </div>
    );
  }

  const formattedAddress = getFormattedAddress(shippingInfo);
  const fullName = `${shippingInfo.firstName} ${shippingInfo.lastName}`;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 mb-6 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
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
              className="text-green-600"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-neutral-800 mb-2">Redemption Successful!</h2>
        <p className="text-neutral-500 mb-6">Your tokens have been successfully burned and your physical goods redemption has been processed.</p>
        
        <div className="w-full max-w-md mx-auto bg-neutral-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-neutral-800 mb-3">Transaction Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Transaction ID:</div>
              <div className="w-2/3 text-neutral-800 font-medium text-xs break-all">{transactionId}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Token:</div>
              <div className="w-2/3 text-neutral-800">{selectedToken.name}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Amount Burned:</div>
              <div className="w-2/3 text-neutral-800">{burnAmount} token{burnAmount !== 1 ? 's' : ''}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Status:</div>
              <div className="w-2/3 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                <span className="text-green-700">Confirmed</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="w-full max-w-md mx-auto bg-neutral-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-medium text-neutral-800 mb-3">Shipping Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Order ID:</div>
              <div className="w-2/3 text-neutral-800 font-medium">{orderId}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Recipient:</div>
              <div className="w-2/3 text-neutral-800">{fullName}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Shipping:</div>
              <div className="w-2/3 text-neutral-800">{formattedAddress}</div>
            </div>
            
            <div className="flex">
              <div className="w-1/3 text-neutral-500">Est. Delivery:</div>
              <div className="w-2/3 text-neutral-800">2-3 weeks</div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-left">
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
                className="text-blue-500"
              >
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Confirmation Email Sent</h3>
              <p className="text-sm text-blue-700">We've sent a confirmation email to <span className="font-medium">{shippingInfo.email}</span> with all the details of your redemption.</p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => window.location.href = "/orders"}
          >
            View My Orders
          </Button>
          <Button onClick={onRedeemMore}>
            Redeem More Tokens
          </Button>
        </div>
      </div>
    </div>
  );
}
