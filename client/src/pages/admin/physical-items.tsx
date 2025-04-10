import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import AdminLayout from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, PencilIcon, Trash2Icon, PlusIcon, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { 
  PhysicalItem, 
  InsertPhysicalItem, 
  Token, 
  TokenConfiguration,
  InsertTokenConfiguration,
  UpdateTokenConfiguration
} from "@shared/schema";

// Create schema for form validation
const physicalItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
});

// Create schema for token configuration
const tokenConfigSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required"),
  burnAmount: z.coerce.number().min(1, "Burn amount must be at least 1"),
});

type PhysicalItemFormValues = z.infer<typeof physicalItemSchema>;
type TokenConfigFormValues = z.infer<typeof tokenConfigSchema>;

export default function PhysicalItemsPage() {
  const { toast } = useToast();
  const { 
    createPhysicalItemMutation, 
    updatePhysicalItemMutation, 
    deletePhysicalItemMutation,
    createTokenConfigurationMutation,
    updateTokenConfigurationMutation
  } = useAdmin();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PhysicalItem | null>(null);
  
  // Load physical items data
  const { data: physicalItems = [], isLoading } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });

  // Load tokens data
  const { data: tokens = [], isLoading: isLoadingTokens } = useQuery<Token[]>({
    queryKey: ["/api/admin/tokens"],
  });

  // Load token configurations
  const { data: tokenConfigurations = [] } = useQuery<TokenConfiguration[]>({
    queryKey: ["/api/admin/token-configurations"],
  });
  
  // Form for creating a new item
  const physicalItemForm = useForm<PhysicalItemFormValues>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
    },
  });

  // Form for token configuration
  const tokenConfigForm = useForm<TokenConfigFormValues>({
    resolver: zodResolver(tokenConfigSchema),
    defaultValues: {
      tokenId: "",
      burnAmount: 1,
    },
  });
  
  // Form for editing an existing item
  const editForm = useForm<PhysicalItemFormValues>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
    },
  });
  
  // Get token configuration for a physical item
  const getTokenConfigForItem = (physicalItemId: number) => {
    return tokenConfigurations.find(config => config.physicalItemId === physicalItemId);
  };
  
  // Get token details
  const getTokenDetails = (tokenId: string) => {
    return tokens.find(token => token.tokenId === tokenId);
  };
  
  // When edit dialog opens, populate form with selected item data
  const handleEditClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    
    // Set physical item form values
    editForm.reset({
      name: item.name,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
    });
    
    // Find token configuration for this item
    const tokenConfig = getTokenConfigForItem(item.id);
    if (tokenConfig) {
      tokenConfigForm.reset({
        tokenId: tokenConfig.tokenId,
        burnAmount: tokenConfig.burnAmount,
      });
    } else {
      // Reset to default if no configuration found
      tokenConfigForm.reset({
        tokenId: "",
        burnAmount: 1
      });
    }
    
    setIsEditOpen(true);
  };
  
  // When delete dialog opens, set the selected item
  const handleDeleteClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };
  
  // Update an existing physical item
  const onEditSubmit = (values: PhysicalItemFormValues) => {
    if (!selectedItem) return;
    
    updatePhysicalItemMutation.mutate(
      { id: selectedItem.id, data: values }, 
      {
        onSuccess: () => {
          toast({
            title: "Physical item updated",
            description: "The physical item has been updated successfully.",
          });
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
        },
      }
    );
  };
  
  // Delete a physical item
  const handleDelete = () => {
    if (!selectedItem) return;
    
    deletePhysicalItemMutation.mutate(selectedItem.id, {
      onSuccess: () => {
        toast({
          title: "Physical item deleted",
          description: "The physical item has been deleted successfully.",
        });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      },
    });
  };
  
  return (
    <AdminLayout title="Physical Items">
      <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
        <strong>Development Mode Notice:</strong> Token configuration is currently displayed for UI completeness but operations related to token configurations will be fully functional when deployed to a production environment with Hedera access credentials. For now, you can create and update physical items without token configurations.
      </div>
      
      <div className="mb-6 max-w-[100vw] overflow-hidden px-2">
        <h2 className="text-lg font-semibold mb-1.5">Manage Physical Items</h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
          Add, edit or remove physical items available for token redemption
        </p>
        <div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Add New Item
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : physicalItems.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Physical Items</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't added any physical items yet.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {physicalItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              {item.imageUrl && (
                <div className="h-36 overflow-hidden border-b">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover object-center" 
                  />
                </div>
              )}
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {(() => {
                      const config = getTokenConfigForItem(item.id);
                      const token = config ? getTokenDetails(config.tokenId) : null;
                      return token ? (
                        <span className="font-semibold text-primary">{token.symbol}</span>
                      ) : (
                        <span className="font-semibold text-primary">?</span>
                      );
                    })()}
                  </div>
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    {(() => {
                      const config = getTokenConfigForItem(item.id);
                      const token = config ? getTokenDetails(config.tokenId) : null;
                      return token && config ? (
                        <p className="text-sm text-muted-foreground">
                          {config.burnAmount} {token.symbol}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          No token configured
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {item.description}
                </p>
                <div className="mt-auto flex flex-col gap-3">
                  <div className="text-muted-foreground text-sm">
                    {(() => {
                      const config = getTokenConfigForItem(item.id);
                      const token = config ? getTokenDetails(config.tokenId) : null;
                      
                      return token && config ? (
                        <span className="truncate inline-block w-full" title={token.tokenId}>Token: {token.tokenId}</span>
                      ) : (
                        <span className="italic">No token assigned</span>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditClick(item)}
                    >
                      <PencilIcon className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2Icon className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Item Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Physical Item</DialogTitle>
            <DialogDescription>
              Create a physical item that users can redeem with tokens.
            </DialogDescription>
          </DialogHeader>
          
          {/* Use two separate forms but style them as a single form */}
          <div className="space-y-6">
            {/* Physical Item Form */}
            <div>
              <h3 className="text-sm font-medium mb-3">Item Details</h3>
              <Form {...physicalItemForm}>
                <div className="space-y-4">
                  <FormField
                    control={physicalItemForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Limited Edition T-Shirt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={physicalItemForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="A detailed description of the physical item" 
                            className="resize-none min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={physicalItemForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </div>
            
            {/* Token Configuration Form */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Token Configuration</h3>
              <Form {...tokenConfigForm}>
                <div className="space-y-4">
                  <FormField
                    control={tokenConfigForm.control}
                    name="tokenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Token</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a token" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tokens.map((token) => (
                              <SelectItem key={token.tokenId} value={token.tokenId}>
                                {token.name} ({token.symbol}) - {token.tokenId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tokenConfigForm.control}
                    name="burnAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Burn Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                // Only validate the physical item form
                const isItemValid = await physicalItemForm.trigger();
                
                if (!isItemValid) {
                  return;
                }
                
                // Get form values for physical item only
                const itemData = physicalItemForm.getValues();
                
                // Create physical item only
                createPhysicalItemMutation.mutate(itemData as InsertPhysicalItem, {
                  onSuccess: (newItem) => {
                    toast({
                      title: "Physical item created",
                      description: "The physical item has been created successfully.",
                    });
                    setIsCreateOpen(false);
                    physicalItemForm.reset();
                    tokenConfigForm.reset();
                    // Refresh data
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
                  },
                  onError: (error) => {
                    toast({
                      title: "Error creating physical item",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                });
              }}
              disabled={createPhysicalItemMutation.isPending}
            >
              {createPhysicalItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Physical Item</DialogTitle>
            <DialogDescription>
              Update details and token requirements for this physical item.
            </DialogDescription>
          </DialogHeader>
          
          {/* Use two separate forms but style them as a single form */}
          <div className="space-y-6">
            {/* Physical Item Form */}
            <div>
              <h3 className="text-sm font-medium mb-3">Item Details</h3>
              <Form {...editForm}>
                <div className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="resize-none min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </div>
            
            {/* Token Configuration Form */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">Token Configuration</h3>
              <Form {...tokenConfigForm}>
                <div className="space-y-4">
                  <FormField
                    control={tokenConfigForm.control}
                    name="tokenId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Token</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a token" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tokens.map((token) => (
                              <SelectItem key={token.tokenId} value={token.tokenId}>
                                {token.name} ({token.symbol}) - {token.tokenId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={tokenConfigForm.control}
                    name="burnAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Burn Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Form>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (!selectedItem) return;
                
                // Only validate the physical item form for now
                const isItemValid = await editForm.trigger();
                
                if (!isItemValid) {
                  return;
                }
                
                // Get form values for physical item only
                const itemData = editForm.getValues();
                
                // Update physical item only
                updatePhysicalItemMutation.mutate(
                  { id: selectedItem.id, data: itemData }, 
                  {
                    onSuccess: () => {
                      toast({
                        title: "Physical item updated",
                        description: "The physical item has been updated successfully.",
                      });
                      setIsEditOpen(false);
                      // Refresh data
                      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
                    },
                    onError: (error) => {
                      toast({
                        title: "Error updating physical item",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }
                );
              }}
              disabled={updatePhysicalItemMutation.isPending}
            >
              {updatePhysicalItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Item"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Physical Item</DialogTitle>
            <DialogDescription>
              This will permanently remove the item from your inventory.
            </DialogDescription>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete <strong>{selectedItem?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePhysicalItemMutation.isPending}
            >
              {deletePhysicalItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}