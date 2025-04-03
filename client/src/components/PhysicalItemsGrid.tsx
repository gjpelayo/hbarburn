import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/context/WalletContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define our physical items
export interface PhysicalItem {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  stock: number;
  tokenConfigurations?: TokenConfiguration[];
}

export interface TokenConfiguration {
  id: number;
  tokenId: string;
  physicalItemId: number;
  burnAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Fallback placeholder items when needed
const PLACEHOLDER_ITEMS: PhysicalItem[] = [
  {
    id: 1,
    name: "Loading...",
    description: "Please wait while we load the items.",
    imageUrl: "https://placehold.co/300x200/5d45c2/ffffff?text=Loading",
    stock: 0,
    tokenConfigurations: []
  }
];

export function PhysicalItemsGrid({ 
  onItemSelect, 
  physicalItems 
}: { 
  onItemSelect: (item: PhysicalItem) => void;
  physicalItems?: PhysicalItem[];
}) {
  const { isConnected } = useWallet();
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  
  // Use provided items or fall back to placeholder items
  const items = physicalItems || PLACEHOLDER_ITEMS;
  
  const handleSelectItem = (item: PhysicalItem) => {
    setSelectedItemId(item.id);
    onItemSelect(item);
  };
  
  // Get token information for each item
  const getTokenInfo = (item: PhysicalItem) => {
    if (!item.tokenConfigurations || item.tokenConfigurations.length === 0) {
      return { symbol: "N/A", amount: 0 };
    }
    
    // Use the first active token configuration
    const activeConfig = item.tokenConfigurations.find(tc => tc.isActive);
    if (!activeConfig) {
      return { symbol: "N/A", amount: 0 };
    }
    
    // Get token symbol and burn amount
    return {
      tokenId: activeConfig.tokenId,
      amount: activeConfig.burnAmount,
      symbol: activeConfig.tokenId.split(".").pop() || "TOKEN" // Fallback to simple ID if no token data
    };
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-neutral-800 mb-2">Available Physical Items</h2>
        <p className="text-neutral-500">Browse and select an item to redeem with your tokens</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const tokenInfo = getTokenInfo(item);
          return (
            <Card 
              key={item.id} 
              className={`overflow-hidden transition-all ${selectedItemId === item.id ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={item.imageUrl || "https://placehold.co/300x200/5d45c2/ffffff?text=No+Image"} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/300x200/5d45c2/ffffff?text=Error+Loading";
                  }}
                />
              </div>
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">{item.name}</CardTitle>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {tokenInfo.amount} {tokenInfo.symbol}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-neutral-500">{item.description}</p>
                {item.stock > 0 && (
                  <p className="text-xs text-green-600 mt-2">In stock: {item.stock} available</p>
                )}
                {item.stock === 0 && (
                  <p className="text-xs text-red-600 mt-2">Out of stock</p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button 
                  onClick={() => handleSelectItem(item)} 
                  variant={selectedItemId === item.id ? "default" : "outline"}
                  className="w-full"
                  disabled={!isConnected || item.stock === 0}
                >
                  {selectedItemId === item.id ? 'Selected' : 'Select Item'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
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

// Export the placeholder items for use elsewhere when needed
export { PLACEHOLDER_ITEMS };