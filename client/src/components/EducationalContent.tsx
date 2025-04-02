import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function EducationalContent() {
  return (
    <div className="max-w-3xl mx-auto mt-16 mb-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-800">Frequently Asked Questions</h2>
        <div className="h-1 w-20 bg-primary mx-auto mt-4"></div>
      </div>
      
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="item-1" className="bg-white rounded-xl shadow-sm border px-6 py-2">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-primary font-medium">Q</span>
              </span>
              <span className="text-lg font-medium text-neutral-800">What is token burning?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 pl-11 pb-4 pt-1">
            Token burning is the process of permanently removing tokens from circulation by sending them to a wallet address that is inaccessible. On Hedera, burned tokens are sent to a null account, reducing the total supply.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-2" className="bg-white rounded-xl shadow-sm border px-6 py-2">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-primary font-medium">Q</span>
              </span>
              <span className="text-lg font-medium text-neutral-800">Why burn tokens for physical goods?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 pl-11 pb-4 pt-1">
            Burning tokens for physical goods creates a direct bridge between digital assets and real-world items. This process ensures that the digital tokens represent actual value and can be redeemed for tangible benefits.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-3" className="bg-white rounded-xl shadow-sm border px-6 py-2">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-primary font-medium">Q</span>
              </span>
              <span className="text-lg font-medium text-neutral-800">Is token burning safe?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 pl-11 pb-4 pt-1">
            Yes, token burning is a standard practice in the blockchain ecosystem. However, it's important to note that once tokens are burned, they cannot be recovered. Always double-check before confirming a burn transaction.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-4" className="bg-white rounded-xl shadow-sm border px-6 py-2">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-primary font-medium">Q</span>
              </span>
              <span className="text-lg font-medium text-neutral-800">How long does shipping take?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 pl-11 pb-4 pt-1">
            Physical items are typically shipped within 5-7 business days after your redemption is processed. Delivery times vary based on your location, but most items arrive within 2-3 weeks from the redemption date.
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-5" className="bg-white rounded-xl shadow-sm border px-6 py-2">
          <AccordionTrigger className="py-4 hover:no-underline">
            <div className="flex items-center text-left">
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-primary font-medium">Q</span>
              </span>
              <span className="text-lg font-medium text-neutral-800">What happens if my item is lost during shipping?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-neutral-600 pl-11 pb-4 pt-1">
            All shipments include tracking information that will be emailed to you. If your item is lost during shipping, please contact our support team with your order ID and tracking information, and we'll work to resolve the issue promptly.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
