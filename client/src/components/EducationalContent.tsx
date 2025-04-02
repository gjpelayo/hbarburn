export function EducationalContent() {
  return (
    <div className="max-w-3xl mx-auto mt-8">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">About Token Burning</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-neutral-700 mb-2">What is token burning?</h3>
            <p className="text-neutral-500 text-sm">Token burning is the process of permanently removing tokens from circulation by sending them to a wallet address that is inaccessible. On Hedera, burned tokens are sent to a null account, reducing the total supply.</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-700 mb-2">Why burn tokens for physical goods?</h3>
            <p className="text-neutral-500 text-sm">Burning tokens for physical goods creates a direct bridge between digital assets and real-world items. This process ensures that the digital tokens represent actual value and can be redeemed for tangible benefits.</p>
          </div>
          
          <div>
            <h3 className="font-medium text-neutral-700 mb-2">Is token burning safe?</h3>
            <p className="text-neutral-500 text-sm">Yes, token burning is a standard practice in the blockchain ecosystem. However, it's important to note that once tokens are burned, they cannot be recovered. Always double-check before confirming a burn transaction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
