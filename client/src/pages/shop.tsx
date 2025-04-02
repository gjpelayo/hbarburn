import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Components
import { PhysicalItemsGrid, PhysicalItem } from "@/components/PhysicalItemsGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, LayoutGrid, Loader2 } from "lucide-react";

// Define Shop interface
interface Shop {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ShopPage() {
  const { shopId } = useParams();
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<PhysicalItem | null>(null);

  // Fetch shop data
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery({
    queryKey: [`/api/shops/${shopId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/shops/${shopId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch shop: ${res.statusText}`);
      }
      return res.json() as Promise<Shop>;
    },
    enabled: !!shopId,
  });

  // Fetch physical items
  const {
    data: physicalItems,
    isLoading: isItemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: ["/api/physical-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/physical-items");
      if (!res.ok) {
        throw new Error(`Failed to fetch items: ${res.statusText}`);
      }
      return res.json() as Promise<PhysicalItem[]>;
    },
  });

  const isLoading = isShopLoading || isItemsLoading;
  const error = shopError || itemsError;

  // Handle item selection
  const handleItemSelect = (item: PhysicalItem) => {
    setSelectedItem(item);
    // Here you would navigate to the redemption flow or show more details
    toast({
      title: `Selected: ${item.name}`,
      description: "Starting redemption process...",
    });
    // Redirect to redemption page
    window.location.href = `/redemption/${item.id}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-32 w-full rounded-lg mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !shop) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Failed to load shop data. Please try again later."}
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="mx-auto"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Shop Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">{shop.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{shop.description}</p>
          
          {shop.imageUrl && (
            <div className="mb-8 rounded-lg overflow-hidden h-56 md:h-72 w-full">
              <img
                src={shop.imageUrl}
                alt={shop.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback image on error
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/800x400?text=Shop+Image";
                }}
              />
            </div>
          )}
        </div>

        {/* Items Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LayoutGrid className="h-5 w-5 mr-2" /> 
              Available Items
            </CardTitle>
            <CardDescription>
              Select an item to start the redemption process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {physicalItems && physicalItems.length > 0 ? (
              <PhysicalItemsGrid
                physicalItems={physicalItems}
                onItemSelect={handleItemSelect}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No items available in this shop.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}