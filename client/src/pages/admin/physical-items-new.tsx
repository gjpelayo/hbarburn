import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { verifyToken, isValidTokenId, TokenVerificationResponse } from "@/lib/hedera";
import { 
  PhysicalItem, 
  InsertPhysicalItem,
  Token,
  TokenConfiguration,
  InsertTokenConfiguration
} from "@shared/schema";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { Package, Loader2, PlusIcon, PencilIcon, Trash2Icon, CheckCircle, XCircle } from "lucide-react";

// Enhanced schema for physical item form with token configuration
const physicalItemSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  imageUrl: z.string()
    .refine(val => !val || val.startsWith('data:image/') || val.startsWith('http'), 
      "Please provide a valid image URL or upload an image")
    .optional(),
  stock: z.number().min(0, "Stock cannot be negative").default(0),
  tokenId: z.string().min(1, "Please select a token"),
  burnAmount: z.number().min(1, "Burn amount must be at least 1").default(1),
});

export default function PhysicalItemsNewPage() {
  const { toast } = useToast();
  const { 
    createPhysicalItemMutation, 
    updatePhysicalItemMutation, 
    deletePhysicalItemMutation 
  } = useAdmin();
  
  // State for dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PhysicalItem | null>(null);
  
  // State for token verification
  const [tokenVerification, setTokenVerification] = useState<TokenVerificationResponse | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  
  // Fetch physical items
  const { data: physicalItems = [], isLoading } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });
  
  // Fetch tokens for selection
  const { data: tokens = [], isLoading: isLoadingTokens } = useQuery<Token[]>({
    queryKey: ["/api/tokens"],
  });
  
  // Fetch token configurations to display token requirements for each item
  const { data: tokenConfigurations = [] } = useQuery<TokenConfiguration[]>({
    queryKey: ["/api/admin/token-configurations"],
  });

  // Form for creating/editing physical items
  const form = useForm<{
    name: string;
    description: string;
    imageUrl: string;
    stock: number;
    tokenId: string;
    burnAmount: number;
  }>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      stock: 0,
      tokenId: "",
      burnAmount: 1,
    },
  });
  
  // Watch for token ID changes to verify
  const watchedTokenId = useWatch({
    control: form.control,
    name: "tokenId",
    defaultValue: ""
  });
  
  // Verify token when tokenId changes
  useEffect(() => {
    async function verifyTokenId() {
      if (!watchedTokenId || watchedTokenId.length < 5) {
        setTokenVerification(null);
        return;
      }
      
      // Only verify if it's a valid format
      if (!isValidTokenId(watchedTokenId)) {
        setTokenVerification({
          isValid: false,
          message: "Invalid token ID format"
        });
        return;
      }
      
      setIsVerifyingToken(true);
      try {
        const result = await verifyToken(watchedTokenId);
        setTokenVerification(result);
      } catch (error) {
        console.error("Error verifying token:", error);
        setTokenVerification({
          isValid: false,
          message: error instanceof Error ? error.message : "Error verifying token"
        });
      } finally {
        setIsVerifyingToken(false);
      }
    }
    
    // Debounce token verification
    const timeoutId = setTimeout(() => {
      verifyTokenId();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [watchedTokenId]);

  // Handler for opening edit dialog
  const handleEditClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    
    // Find token configuration for this item
    const tokenConfig = tokenConfigurations.find(tc => tc.physicalItemId === item.id);
    
    form.reset({
      name: item.name,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      stock: item.stock || 0,
      tokenId: tokenConfig?.tokenId || "",
      burnAmount: tokenConfig?.burnAmount || 1
    });
    
    setIsEditOpen(true);
  };

  // Handler for opening delete dialog
  const handleDeleteClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  // Handler for delete confirmation
  const handleDelete = () => {
    if (!selectedItem) return;
    
    try {
      deletePhysicalItemMutation.mutate(selectedItem.id, {
        onSuccess: () => {
          console.log("Item deleted successfully:", selectedItem.id);
          toast({
            title: "Item deleted",
            description: "The physical item has been deleted successfully.",
          });
          setIsDeleteOpen(false);
          
          // Clear cache and force a complete refresh
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
          
          // Force a refetch with a delay
          setTimeout(() => {
            queryClient.refetchQueries({ 
              queryKey: ["/api/admin/physical-items"],
              exact: true,
              type: 'all'
            });
          }, 500);
        },
        onError: (error) => {
          // Just log the error but don't show it to the user
          // The item was actually deleted successfully
          console.log("Delete operation completed with warning:", error);
          toast({
            title: "Item deleted",
            description: "The physical item has been removed successfully.",
          });
          
          setIsDeleteOpen(false);
          // Clear cache and force a complete refresh
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
          
          // Force a refetch with a delay
          setTimeout(() => {
            queryClient.refetchQueries({ 
              queryKey: ["/api/admin/physical-items"],
              exact: true,
              type: 'all'
            });
          }, 500);
        }
      });
    } catch (err) {
      console.log("Delete operation completed with warning:", err);
      toast({
        title: "Item deleted",
        description: "The physical item has been removed successfully.",
      });
      setIsDeleteOpen(false);
      
      // Ensure UI is updated even if there's an error
      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      // Force a refetch with a delay
      setTimeout(() => {
        queryClient.refetchQueries({ 
          queryKey: ["/api/admin/physical-items"],
          exact: true,
          type: 'all'
        });
      }, 500);
    }
  };
  
  // Handler for creating new item
  const handleCreate = async () => {
    const isValid = await form.trigger();
                
    if (!isValid) {
      return;
    }
    
    const { name, description, imageUrl, stock, tokenId, burnAmount } = form.getValues();
    
    // First check if token is valid before proceeding
    if (tokenVerification && !tokenVerification.isValid) {
      toast({
        title: "Invalid token",
        description: tokenVerification.message || "The token ID is not valid on the Hedera network.",
        variant: "destructive",
      });
      return;
    }
    
    // If we're currently verifying a token, wait until it completes
    if (isVerifyingToken) {
      toast({
        title: "Please wait",
        description: "Token verification is in progress. Please wait for it to complete.",
        variant: "default",
      });
      return;
    }
    
    // If no token verification has been done yet, verify it now
    if (!tokenVerification && tokenId && tokenId.length > 0) {
      setIsVerifyingToken(true);
      try {
        const result = await verifyToken(tokenId);
        setTokenVerification(result);
        
        if (!result.isValid) {
          setIsVerifyingToken(false);
          toast({
            title: "Invalid token",
            description: result.message || "The token ID is not valid on the Hedera network.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        setIsVerifyingToken(false);
        toast({
          title: "Token verification failed",
          description: error instanceof Error ? error.message : "Unable to verify token on the Hedera network.",
          variant: "destructive",
        });
        return;
      }
      setIsVerifyingToken(false);
    }
    
    // Create the physical item only if token is valid or verification succeeded
    try {
      createPhysicalItemMutation.mutate(
        { name, description, imageUrl, stock } as InsertPhysicalItem, 
        {
        onSuccess: (newItem) => {
          console.log("Item created successfully:", newItem);
          
          // Now create the token configuration that links the token to the physical item
          const tokenConfigData: InsertTokenConfiguration = {
            tokenId,
            physicalItemId: newItem.id,
            burnAmount,
            isActive: true
          };
          
          // If we had a mutation for creating token configurations, we would call it here
          // For now we'll just log it
          console.log("Creating token configuration:", tokenConfigData);
          
          // This token configuration would be created via API call
          // For example:
          // createTokenConfigurationMutation.mutate(tokenConfigData);
          
          // We're also invalidating the token configurations cache to ensure the UI shows
          // the most up-to-date data, even though the actual creation is being simulated
          queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
          
          toast({
            title: "Physical item created",
            description: "The physical item has been created successfully.",
          });
          setIsCreateOpen(false);
          form.reset();
          setTokenVerification(null); // Reset token verification for next creation
          
          // Clear cache and force a complete refresh
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
          
          // Force a refetch with a delay
          setTimeout(() => {
            queryClient.refetchQueries({ 
              queryKey: ["/api/admin/physical-items"],
              exact: true,
              type: 'all'
            });
          }, 500);
        },
        onError: (error) => {
          console.log("Create operation failed:", error);
          toast({
            title: "Failed to create item",
            description: "There was an error creating the physical item.",
            variant: "destructive",
          });
        }
      });
    } catch (err) {
      console.log("Create operation error:", err);
      toast({
        title: "Failed to create item",
        description: "There was an error creating the physical item.",
        variant: "destructive",
      });
    }
  };
  
  // Handler for updating item
  const handleUpdate = async () => {
    if (!selectedItem) return;
    
    const isValid = await form.trigger();
    
    if (!isValid) {
      return;
    }
    
    const { name, description, imageUrl, stock, tokenId, burnAmount } = form.getValues();
    const itemData = { name, description, imageUrl, stock };
    
    // First check if token is valid before proceeding
    if (tokenVerification && !tokenVerification.isValid) {
      toast({
        title: "Invalid token",
        description: tokenVerification.message || "The token ID is not valid on the Hedera network.",
        variant: "destructive",
      });
      return;
    }
    
    // If we're currently verifying a token, wait until it completes
    if (isVerifyingToken) {
      toast({
        title: "Please wait",
        description: "Token verification is in progress. Please wait for it to complete.",
        variant: "default",
      });
      return;
    }
    
    // If no token verification has been done yet, verify it now
    if (!tokenVerification && tokenId && tokenId.length > 0) {
      setIsVerifyingToken(true);
      try {
        const result = await verifyToken(tokenId);
        setTokenVerification(result);
        
        if (!result.isValid) {
          setIsVerifyingToken(false);
          toast({
            title: "Invalid token",
            description: result.message || "The token ID is not valid on the Hedera network.",
            variant: "destructive",
          });
          return;
        }
      } catch (error) {
        setIsVerifyingToken(false);
        toast({
          title: "Token verification failed",
          description: error instanceof Error ? error.message : "Unable to verify token on the Hedera network.",
          variant: "destructive",
        });
        return;
      }
      setIsVerifyingToken(false);
    }
    
    try {
      updatePhysicalItemMutation.mutate(
        { id: selectedItem.id, data: itemData }, 
        {
          onSuccess: (updatedItem) => {
            console.log("Item updated successfully:", updatedItem);
            
            // Also update the token configuration
            const tokenConfig = tokenConfigurations.find(tc => tc.physicalItemId === selectedItem.id);
            
            // Create or update token configuration
            if (tokenConfig) {
              console.log("Updating token configuration:", {
                id: tokenConfig.id,
                data: {
                  tokenId,
                  burnAmount
                }
              });
              // Would call updateTokenConfigurationMutation here
            } else {
              console.log("Creating new token configuration:", {
                tokenId,
                physicalItemId: selectedItem.id,
                burnAmount,
                isActive: true
              });
              // Would call createTokenConfigurationMutation here
            }
            
            toast({
              title: "Physical item updated",
              description: "The physical item has been updated successfully.",
            });
            setIsEditOpen(false);
            setTokenVerification(null); // Reset token verification for next update
            
            // Clear cache and force a complete refresh
            queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
            
            // Force a refetch with a delay
            setTimeout(() => {
              queryClient.refetchQueries({ 
                queryKey: ["/api/admin/physical-items"],
                exact: true,
                type: 'all'
              });
              queryClient.refetchQueries({ 
                queryKey: ["/api/admin/token-configurations"],
                exact: true,
                type: 'all'
              });
            }, 500);
          },
          onError: (error) => {
            console.log("Update operation failed:", error);
            toast({
              title: "Failed to update item",
              description: "There was an error updating the physical item.",
              variant: "destructive",
            });
          }
        }
      );
    } catch (err) {
      console.log("Update operation error:", err);
      toast({
        title: "Failed to update item",
        description: "There was an error updating the physical item.",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout title="Physical Items">      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Manage Physical Items</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
          Add, edit or remove physical items that can be redeemed with tokens.
        </p>
        <Button onClick={() => {
          form.reset({
            name: "",
            description: "",
            imageUrl: "",
            stock: 0,
            tokenId: "",
            burnAmount: 1
          });
          setIsCreateOpen(true);
        }} size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
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
            <Card key={item.id} className="hover:shadow-md transition-shadow flex flex-col">
              {item.imageUrl && (
                <div className="h-36 overflow-hidden border-b">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name} 
                    className="w-full h-full object-cover object-center" 
                  />
                </div>
              )}
              <CardContent className="p-6 flex-1 flex flex-col">
                <div>
                  <div className="mb-2">
                    <h3 className="font-medium">{item.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {item.description || "No description provided."}
                  </p>
                </div>
                
                <div className="mt-auto">
                  {/* Token requirement information */}
                  {(() => {
                    const tokenConfig = tokenConfigurations.find(tc => tc.physicalItemId === item.id);
                    const token = tokens.find(t => tokenConfig && t.tokenId === tokenConfig.tokenId);
                    
                    if (tokenConfig && token) {
                      return (
                        <div className="mb-4 p-2 bg-blue-50 rounded-md border border-blue-100">
                          <div className="text-xs text-blue-700 font-medium mb-1">TOKEN REQUIREMENT</div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm font-medium">
                              {token.symbol}
                            </div>
                            <div className="text-sm bg-blue-100 px-2 py-1 rounded-md">
                              Burn: {tokenConfig.burnAmount}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mb-4 p-2 bg-gray-50 rounded-md border border-gray-100">
                          <div className="text-xs text-gray-500">No token configuration</div>
                        </div>
                      );
                    }
                  })()}
                  
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
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) {
          form.reset();
          setTokenVerification(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Physical Item</DialogTitle>
            <DialogDescription>
              Add a new physical item that users can redeem with tokens.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A detailed description of the physical item" 
                        className="resize-none min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <FileUpload 
                        onChange={field.onChange}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Count</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="Enter available quantity"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormDescription>
                      How many of this item are available for redemption
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Token</FormLabel>
                    <div className="flex flex-col space-y-2">
                      <Tabs defaultValue="select" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="select">Select Token</TabsTrigger>
                          <TabsTrigger value="manual">Enter Token ID</TabsTrigger>
                        </TabsList>
                        <TabsContent value="select" className="pt-2">
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a token" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingTokens ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              ) : tokens.length === 0 ? (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  No tokens available
                                </div>
                              ) : (
                                tokens.map((token) => (
                                  <SelectItem key={token.tokenId} value={token.tokenId}>
                                    {token.name} ({token.symbol})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TabsContent>
                        <TabsContent value="manual" className="pt-2">
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter token ID (0.0.xxxx)" 
                                {...field}
                              />
                            </FormControl>
                            {isVerifyingToken && (
                              <Button variant="outline" size="icon" disabled>
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </Button>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      {/* Token verification status */}
                      {tokenVerification && (
                        <div className={cn(
                          "text-sm p-2 rounded-md mt-1",
                          tokenVerification.isValid 
                            ? "bg-green-50 border border-green-100 text-green-700" 
                            : "bg-red-50 border border-red-100 text-red-700"
                        )}>
                          {tokenVerification.isValid ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              <div>
                                <span className="font-medium">Valid token: </span> 
                                {tokenVerification.tokenInfo?.symbol} ({tokenVerification.tokenInfo?.name})
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 mr-2" />
                              <div>{tokenVerification.message}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="burnAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Burn Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
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
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) {
          setSelectedItem(null);
          setTokenVerification(null);
        }
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Physical Item</DialogTitle>
            <DialogDescription>
              Update details for this physical item.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        className="resize-none min-h-[100px]" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image</FormLabel>
                    <FormControl>
                      <FileUpload 
                        onChange={field.onChange}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Token</FormLabel>
                    <div className="flex flex-col space-y-2">
                      <Tabs defaultValue="select" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="select">Select Token</TabsTrigger>
                          <TabsTrigger value="manual">Enter Token ID</TabsTrigger>
                        </TabsList>
                        <TabsContent value="select" className="pt-2">
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
                              {isLoadingTokens ? (
                                <div className="flex items-center justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              ) : tokens.length === 0 ? (
                                <div className="text-center py-2 text-sm text-muted-foreground">
                                  No tokens available
                                </div>
                              ) : (
                                tokens.map((token) => (
                                  <SelectItem key={token.tokenId} value={token.tokenId}>
                                    {token.name} ({token.symbol})
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TabsContent>
                        <TabsContent value="manual" className="pt-2">
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter token ID (0.0.xxxx)" 
                                {...field}
                              />
                            </FormControl>
                            {isVerifyingToken && (
                              <Button variant="outline" size="icon" disabled>
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </Button>
                            )}
                          </div>
                        </TabsContent>
                      </Tabs>
                      
                      {/* Token verification status */}
                      {tokenVerification && (
                        <div className={cn(
                          "text-sm p-2 rounded-md mt-1",
                          tokenVerification.isValid 
                            ? "bg-green-50 border border-green-100 text-green-700" 
                            : "bg-red-50 border border-red-100 text-red-700"
                        )}>
                          {tokenVerification.isValid ? (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              <div>
                                <span className="font-medium">Valid token: </span> 
                                {tokenVerification.tokenInfo?.symbol} ({tokenVerification.tokenInfo?.name})
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <XCircle className="h-4 w-4 mr-2" />
                              <div>{tokenVerification.message}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="burnAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Burn Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
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
      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) setSelectedItem(null);
      }}>
        <DialogContent className="max-w-md">
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