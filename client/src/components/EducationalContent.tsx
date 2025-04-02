export function EducationalContent() {
  return (
    <div className="max-w-4xl mx-auto mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-800">Frequently Asked Questions</h2>
        <div className="h-1 w-20 bg-primary mx-auto mt-4"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-primary font-medium">Q</span>
            </span>
            What is token burning?
          </h3>
          <p className="text-neutral-600 ml-10">
            Token burning is the process of permanently removing tokens from circulation by sending them to a wallet address that is inaccessible. On Hedera, burned tokens are sent to a null account, reducing the total supply.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-primary font-medium">Q</span>
            </span>
            Why burn tokens for physical goods?
          </h3>
          <p className="text-neutral-600 ml-10">
            Burning tokens for physical goods creates a direct bridge between digital assets and real-world items. This process ensures that the digital tokens represent actual value and can be redeemed for tangible benefits.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-primary font-medium">Q</span>
            </span>
            Is token burning safe?
          </h3>
          <p className="text-neutral-600 ml-10">
            Yes, token burning is a standard practice in the blockchain ecosystem. However, it's important to note that once tokens are burned, they cannot be recovered. Always double-check before confirming a burn transaction.
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 flex-shrink-0">
              <span className="text-primary font-medium">Q</span>
            </span>
            How long does shipping take?
          </h3>
          <p className="text-neutral-600 ml-10">
            Physical items are typically shipped within 5-7 business days after your redemption is processed. Delivery times vary based on your location, but most items arrive within 2-3 weeks from the redemption date.
          </p>
        </div>
      </div>
    </div>
  );
}
