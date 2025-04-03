import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PhysicalItem } from "@shared/schema";
import { ItemVariationManager } from "@/components/ItemVariationManager";
import { ArrowLeft, Box } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function PhysicalItemVariationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, navigate] = useLocation();
  
  // Extract the item ID from the URL path params
  const [match, params] = useRoute<{ itemId: string }>("/admin/physical-item-variations/:itemId");
  
  // Get the itemId as a number
  const itemId = match && params.itemId ? parseInt(params.itemId, 10) : null;
  
  // Fetch the physical item details
  const { data: item, isLoading, error } = useQuery<PhysicalItem>({
    queryKey: ["/api/admin/physical-items", itemId],
    queryFn: async () => {
      if (!itemId) throw new Error("No item ID provided");
      const res = await fetch(`/api/admin/physical-items/${itemId}`);
      if (!res.ok) throw new Error("Failed to fetch item");
      return res.json();
    },
    enabled: !!itemId, // Only run the query if we have an item ID
  });
  
  const handleVariationsChange = () => {
    // Invalidate the item query to refresh the data
    if (itemId) {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items", itemId] });
    }
  };
  
  if (isLoading) {
    return (
      <AdminLayout title="Loading Item Variations">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading item details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  if (error || !item) {
    return (
      <AdminLayout title="Error Loading Item">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-xl text-red-500">Error loading item details</p>
          <p className="text-sm text-muted-foreground mb-4">The item ID may be invalid or the item does not exist.</p>
          <Button onClick={() => navigate("/admin/physical-items")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Items List
          </Button>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout title={`Variations for ${item.name}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/admin/physical-items")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <span className="text-muted-foreground">Manage item variations</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Basic information about this physical item</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                <p>{item.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p>{item.description || "No description"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Base Stock</h3>
                <p>
                  {item.hasVariations 
                    ? "Managed by variations" 
                    : item.stock === 0 
                      ? <span className="text-red-500">Out of stock</span> 
                      : <span className="text-green-500">{item.stock} available</span>
                  }
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Variation Status</h3>
                <p>
                  {item.hasVariations 
                    ? <span className="text-green-500">Uses variations</span> 
                    : "No variations"
                  }
                </p>
              </div>
            </div>
          </CardContent>
          {item.imageUrl && (
            <CardFooter className="flex justify-center p-4 border-t">
              <div className="relative aspect-square w-full max-w-[200px] rounded-md overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="object-cover w-full h-full"
                />
              </div>
            </CardFooter>
          )}
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Variations Management</CardTitle>
            <CardDescription>
              Create and manage variations for this item (e.g., size, color, style)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="variations">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="variations">Variations</TabsTrigger>
                <TabsTrigger value="help">How It Works</TabsTrigger>
              </TabsList>
              
              <TabsContent value="variations" className="pt-4">
                {itemId && (
                  <ItemVariationManager 
                    physicalItemId={itemId} 
                    onVariationsChange={handleVariationsChange}
                  />
                )}
              </TabsContent>
              
              <TabsContent value="help" className="pt-4">
                <div className="space-y-4">
                  <div className="p-4 rounded-md bg-muted/50">
                    <h3 className="font-medium mb-2 flex items-center">
                      <Box className="mr-2 h-4 w-4" /> 
                      Understanding Variations
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Variations allow you to track inventory for different attributes of an item, 
                      such as size, color, or material. Each variation type can have multiple options.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Example Usage</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Create a <strong>Size</strong> variation with options: Small, Medium, Large</li>
                      <li>Create a <strong>Color</strong> variation with options: Red, Blue, Green</li>
                      <li>The system will automatically generate all combinations</li>
                      <li>Track stock levels for each specific combination</li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Important Notes</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      <li>Adding variations will override the base stock level</li>
                      <li>Each combination will have its own stock count</li>
                      <li>When all variations are removed, the item reverts to using the base stock</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}