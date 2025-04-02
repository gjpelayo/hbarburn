import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { useRedemption } from "@/context/RedemptionContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define our physical items
export interface PhysicalItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  tokenId: string;
  tokenSymbol: string;
  tokenCost: number;
}

const PHYSICAL_ITEMS: PhysicalItem[] = [
  {
    id: "item-1",
    name: "Limited Edition Merchandise Pack",
    description: "Exclusive merchandise package including a branded t-shirt, cap, and stickers with the Hedera logo.",
    imageUrl: "https://placehold.co/300x200/5d45c2/ffffff?text=Merch+Pack",
    tokenId: "0.0.1001",
    tokenSymbol: "MERCH",
    tokenCost: 10
  },
  {
    id: "item-2",
    name: "Exclusive Branded Apparel",
    description: "High-quality apparel featuring unique Hedera designs. Includes a premium hoodie and socks.",
    imageUrl: "https://placehold.co/300x200/5d45c2/ffffff?text=Apparel",
    tokenId: "0.0.1002",
    tokenSymbol: "APRL",
    tokenCost: 15
  },
  {
    id: "item-3",
    name: "Collectible Hedera-themed Item",
    description: "Limited edition collectible item featuring Hedera network artwork and custom packaging.",
    imageUrl: "https://placehold.co/300x200/5d45c2/ffffff?text=Collectible",
    tokenId: "0.0.1003",
    tokenSymbol: "CLLCT",
    tokenCost: 5
  }
];

export function PhysicalItemsGrid({ onItemSelect }: { onItemSelect: (item: PhysicalItem) => void }) {
  const { isConnected } = useWallet();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  const handleSelectItem = (item: PhysicalItem) => {
    setSelectedItem(item.id);
    onItemSelect(item);
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Available Physical Items</h2>
        <p className="text-neutral-500">Browse and select an item to redeem with your tokens</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PHYSICAL_ITEMS.map((item) => (
          <Card 
            key={item.id} 
            className={`overflow-hidden transition-all ${selectedItem === item.id ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="aspect-video w-full overflow-hidden">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {item.tokenCost} {item.tokenSymbol}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-sm text-neutral-500">{item.description}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button 
                onClick={() => handleSelectItem(item)} 
                variant={selectedItem === item.id ? "default" : "outline"}
                className="w-full"
                disabled={!isConnected}
              >
                {selectedItem === item.id ? 'Selected' : 'Select Item'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {!isConnected && (
        <div className="mt-6 p-4 border border-amber-200 bg-amber-50 rounded-lg text-center">
          <p className="text-amber-700">
            Please connect your wallet at the top of the page to select and redeem items.
          </p>
        </div>
      )}
    </div>
  );
}

// Export the items data for use elsewhere in the application
export { PHYSICAL_ITEMS };