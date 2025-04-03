import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Components
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Check, CircleAlert, Loader2, PackagePlus, Search, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";

// Types
import type { PhysicalItem, Shop } from "@shared/schema";

export default function ShopItemsPage() {
  const [, setLocation] = useLocation();
  const { shopId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  
  // Fetch shop data
  const {
    data: shop,
    isLoading: isShopLoading,
    error: shopError,
  } = useQuery({
    queryKey: [`/api/admin/shops/${shopId}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/shops/${shopId}`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch shop: ${errorText || res.statusText}`);
      }
      return await res.json() as Shop;
    },
    enabled: !!shopId,
  });
  
  // Fetch shop items
  const {
    data: shopItems,
    isLoading: isItemsLoading,
    error: itemsError,
  } = useQuery({
    queryKey: [`/api/admin/shops/${shopId}/items`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/shops/${shopId}/items`);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch shop items: ${errorText || res.statusText}`);
      }
      return await res.json() as PhysicalItem[];
    },
    enabled: !!shopId,
  });
  
  // Fetch all physical items for adding to shop
  const {
    data: allPhysicalItems,
    isLoading: isAllItemsLoading,
  } = useQuery({
    queryKey: ["/api/physical-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/physical-items");
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch physical items: ${errorText || res.statusText}`);
      }
      return await res.json() as PhysicalItem[];
    },
    enabled: isAddItemDialogOpen, // Only fetch when dialog is open
  });
  
  // Add item to shop mutation
  const addItemMutation = useMutation({
    mutationFn: async (physicalItemId: number) => {
      const res = await apiRequest(
        "POST", 
        `/api/admin/shops/${shopId}/items`,
        { physicalItemId }
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add item to shop");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item added to shop",
        description: "The physical item has been successfully added to this shop.",
      });
      
      // Invalidate shop items query to refresh list
      queryClient.invalidateQueries({ queryKey: [`/api/admin/shops/${shopId}/items`] });
      
      // Close the dialog
      setIsAddItemDialogOpen(false);
      setSelectedItemId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Remove item from shop mutation
  const removeItemMutation = useMutation({
    mutationFn: async (physicalItemId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/admin/shops/${shopId}/items/${physicalItemId}`
      );
      
      if (!res.ok) {
        throw new Error("Failed to remove item from shop");
      }
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Item removed",
        description: "The item has been removed from this shop.",
      });
      
      // Invalidate shop items query to refresh list
      queryClient.invalidateQueries({ queryKey: [`/api/admin/shops/${shopId}/items`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddItem = () => {
    if (!selectedItemId) {
      toast({
        title: "No item selected",
        description: "Please select a physical item to add to the shop.",
        variant: "destructive",
      });
      return;
    }
    
    addItemMutation.mutate(selectedItemId);
  };
  
  const handleRemoveItem = (itemId: number) => {
    removeItemMutation.mutate(itemId);
  };
  
  // Filter available items (not already in shop)
  const getAvailableItems = () => {
    if (!allPhysicalItems || !shopItems) return [];
    
    // Get IDs of items already in the shop
    const shopItemIds = new Set(shopItems.map(item => item.id));
    
    // Filter out items already in the shop
    return allPhysicalItems.filter(item => !shopItemIds.has(item.id));
  };
  
  // Type definition for physical item with token configurations
  type PhysicalItemWithTokenConfig = PhysicalItem & { 
    tokenConfigurations?: Array<{ 
      id: number;
      tokenId: string;
      physicalItemId: number;
      burnAmount: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    }> 
  };
  
  // Filter items based on search query
  const filteredAvailableItems = getAvailableItems().filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );
  
  const isLoading = isShopLoading || isItemsLoading;
  const error = shopError || itemsError;
  
  return (
    <AdminLayout title="Shop Items Management">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop Items</h1>
            {shop && (
              <p className="text-muted-foreground">
                Managing items for shop: <span className="font-medium">{shop.name}</span>
              </p>
            )}
          </div>
          <Button
            onClick={() => setIsAddItemDialogOpen(true)}
            disabled={isLoading}
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            Add Item to Shop
          </Button>
        </div>
        
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {error && !isLoading && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "An unknown error occurred"}
            </AlertDescription>
          </Alert>
        )}
        
        {!isLoading && !error && shopItems && (
          <>
            {shopItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center justify-center py-12">
                    <CircleAlert className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Items in Shop</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      This shop doesn't have any items yet. Add physical items to make them available for redemption.
                    </p>
                    <Button onClick={() => setIsAddItemDialogOpen(true)}>
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Add Item to Shop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shopItems.map((item) => (
                  <Card key={item.id} className="flex flex-col">
                    <div className="aspect-video w-full overflow-hidden">
                      <img 
                        src={item.imageUrl || "https://placehold.co/400x200?text=No+Image"} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/400x200?text=Image+Error";
                        }}
                      />
                    </div>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant={(item.stock ?? 0) > 0 ? "outline" : "destructive"}>
                          {(item.stock ?? 0) > 0 ? `Stock: ${item.stock}` : "Out of stock"}
                        </Badge>
                        
                        {/* Check for token configurations - commented out until API returns this data */}
                        {/* 
                        {item.tokenConfigurations && item.tokenConfigurations.length > 0 && (
                          <Badge className="bg-primary/20 text-primary">
                            {item.tokenConfigurations[0].burnAmount} Tokens Required
                          </Badge>
                        )}
                        */}
                      </div>
                      
                      <div className="mt-auto">
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removeItemMutation.isPending}
                        >
                          {removeItemMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Trash className="h-4 w-4 mr-2" />
                          )}
                          Remove from Shop
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Add Item Dialog */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Item to Shop</DialogTitle>
            <DialogDescription>
              Select a physical item to add to this shop. Items already in the shop are not shown.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {isAllItemsLoading && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            
            {!isAllItemsLoading && filteredAvailableItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No items match your search" : "No items available to add"}
              </div>
            )}
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {filteredAvailableItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedItemId === item.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  }`}
                  onClick={() => setSelectedItemId(item.id)}
                >
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded overflow-hidden shrink-0">
                      <img
                        src={item.imageUrl || "https://placehold.co/64x64?text=No+Image"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://placehold.co/64x64?text=Error";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        {selectedItemId === item.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddItem}
              disabled={!selectedItemId || addItemMutation.isPending}
            >
              {addItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add to Shop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}