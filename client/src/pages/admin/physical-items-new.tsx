import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import AdminLayout from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutoDismissToast } from "@/hooks/use-auto-dismiss-toast";
import { Package, PencilIcon, Trash2Icon, PlusIcon, Loader2, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import type { 
  PhysicalItem, 
  InsertPhysicalItem, 
  Token, 
  TokenConfiguration,
  InsertTokenConfiguration,
  UpdateTokenConfiguration
} from "@shared/schema";
import { ItemVariationManager } from "@/components/ItemVariationManager";

// Form schemas
const physicalItemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
  stock: z.coerce.number().int().min(0, "Stock must be zero or greater"),
  hasVariations: z.boolean().default(false),
  tokenId: z.string().min(1, "Token selection is required"),
  burnAmount: z.coerce.number().int().min(1, "Burn amount must be at least 1"),
});

type PhysicalItemFormValues = z.infer<typeof physicalItemFormSchema>;

export default function PhysicalItemsNewPage() {
  const { autoDismissToast } = useAutoDismissToast();
  const { 
    createPhysicalItemMutation, 
    updatePhysicalItemMutation, 
    deletePhysicalItemMutation,
    createTokenConfigurationMutation,
    updateTokenConfigurationMutation
  } = useAdmin();
  
  // State for dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PhysicalItem | null>(null);
  
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

  // Form for creating a new item
  const form = useForm<PhysicalItemFormValues>({
    resolver: zodResolver(physicalItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      stock: 0,
      hasVariations: false,
      tokenId: "",
      burnAmount: 1
    },
  });
  
  // Form for editing an existing item
  const editForm = useForm<PhysicalItemFormValues>({
    resolver: zodResolver(physicalItemFormSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      stock: 0,
      hasVariations: false,
      tokenId: "",
      burnAmount: 1,
    },
  });

  // Handle opening the edit dialog
  const handleEditClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    
    // Get token configuration for this item
    const tokenConfig = tokenConfigurations.find(tc => tc.physicalItemId === item.id);
    
    editForm.reset({
      name: item.name,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      stock: item.stock || 0,
      hasVariations: false,
      tokenId: tokenConfig ? tokenConfig.tokenId : "",
      burnAmount: tokenConfig ? tokenConfig.burnAmount : 1,
    });
    
    setIsEditOpen(true);
  };

  // Handle opening the delete dialog
  const handleDeleteClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  // Handle form submission for creating a new item
  const onSubmit = async (values: PhysicalItemFormValues) => {
    try {
      // Validate token is selected
      if (!values.tokenId || values.tokenId.trim() === "") {
        autoDismissToast({
          title: "Token required",
          description: "You must select a token requirement for this item",
          variant: "destructive",
        });
        return;
      }
      
      // Create the physical item
      const newItem = await createPhysicalItemMutation.mutateAsync({
        name: values.name,
        description: values.description,
        imageUrl: values.imageUrl || null,
        stock: values.hasVariations ? 0 : values.stock, // If using variations, stock will be managed by variations
      });
      
      // Create token configuration
      await createTokenConfigurationMutation.mutateAsync({
        tokenId: values.tokenId,
        physicalItemId: newItem.id,
        burnAmount: values.burnAmount,
        isActive: true
      });
      
      // Close the dialog and reset the form
      setIsCreateOpen(false);
      form.reset();
      
      // Update the query cache to display the new item immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
      
      autoDismissToast({
        title: "Physical item created",
        description: "The physical item has been created successfully.",
      });
    } catch (error: any) {
      autoDismissToast({
        title: "Error creating physical item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle form submission for editing an item
  const onEditSubmit = async (values: PhysicalItemFormValues) => {
    if (!selectedItem) return;
    
    try {
      // Validate token is selected
      if (!values.tokenId || values.tokenId.trim() === "") {
        autoDismissToast({
          title: "Token required",
          description: "You must select a token requirement for this item",
          variant: "destructive",
        });
        return;
      }
      
      // Update the physical item
      await updatePhysicalItemMutation.mutateAsync({
        id: selectedItem.id,
        data: {
          name: values.name,
          description: values.description,
          imageUrl: values.imageUrl || null,
          stock: values.hasVariations ? 0 : values.stock,
        }
      });
      
      // Get existing token configuration
      const existingConfig = tokenConfigurations.find(
        tc => tc.physicalItemId === selectedItem.id
      );
      
      if (existingConfig) {
        // Update existing configuration
        await updateTokenConfigurationMutation.mutateAsync({
          id: existingConfig.id,
          data: {
            tokenId: values.tokenId,
            burnAmount: values.burnAmount,
          }
        });
      } else {
        // Create new configuration
        await createTokenConfigurationMutation.mutateAsync({
          tokenId: values.tokenId,
          physicalItemId: selectedItem.id,
          burnAmount: values.burnAmount,
          isActive: true
        });
      }
      
      // Close the dialog
      setIsEditOpen(false);
      
      // Update the query cache to display the changes immediately
      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
      
      autoDismissToast({
        title: "Physical item updated",
        description: "The physical item has been updated successfully.",
      });
    } catch (error: any) {
      autoDismissToast({
        title: "Error updating physical item",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle deleting an item
  const handleDelete = async () => {
    if (!selectedItem) return;
    
    try {
      await deletePhysicalItemMutation.mutateAsync(selectedItem.id);
      setIsDeleteOpen(false);
      
      // Update the query cache 
      queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      
      autoDismissToast({
        title: "Physical item deleted",
        description: "The physical item has been deleted successfully.",
      });
    } catch (error: any) {
      autoDismissToast({
        title: "Error deleting physical item",
        description: error.message,
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
            hasVariations: false,
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
                          <p className="text-xs text-blue-700 mb-1">Token Required:</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="font-semibold text-sm">{token.name} ({token.symbol})</span>
                            </div>
                            <div className="text-xs bg-blue-200 px-2 py-1 rounded font-medium text-blue-800">
                              {tokenConfig.burnAmount} {token.symbol}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mb-4 p-2 bg-yellow-50 rounded-md border border-yellow-100">
                          <p className="text-xs text-yellow-700">Token configuration needed</p>
                        </div>
                      );
                    }
                  })()}
                  
                  {/* Stock information */}
                  <div className="flex justify-between items-center text-sm">
                    <div className="text-muted-foreground">
                      Stock:
                    </div>
                    <div className={`font-medium ${item.stock && item.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {item.stock || 0}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEditClick(item)}
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteClick(item)}
                    >
                      <Trash2Icon className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Physical Item</DialogTitle>
            <DialogDescription>
              Add a new physical item that can be redeemed by burning tokens.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} />
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
                        placeholder="Enter item description" 
                        className="resize-none" 
                        {...field} 
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
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter image URL (optional)" 
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
                name="hasVariations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Has Variations</FormLabel>
                      <FormDescription>
                        Enable if this item has variations like sizes or colors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!form.watch("hasVariations") && (
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter stock quantity" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Requirement</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a token (required)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tokens.length === 0 ? (
                          <SelectItem value="" disabled>No tokens available</SelectItem>
                        ) : (
                          tokens.map((token) => (
                            <SelectItem key={token.tokenId} value={token.tokenId}>
                              {token.name} ({token.symbol})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {field.value && field.value.trim() !== "" && (
                      <div className="text-sm p-2 rounded-md mt-1 bg-blue-50 border border-blue-100 text-blue-700">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <div>
                            {(() => {
                              const token = tokens.find(t => t.tokenId === field.value);
                              return token 
                                ? `Using ${token.name} (${token.symbol})`
                                : "Token verified";
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {form.watch("tokenId") && form.watch("tokenId").trim() !== "" && (
                <FormField
                  control={form.control}
                  name="burnAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Burn Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Number of tokens to burn" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPhysicalItemMutation.isPending}
                >
                  {createPhysicalItemMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Physical Item</DialogTitle>
            <DialogDescription>
              Update the details of this physical item.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item name" {...field} />
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
                        placeholder="Enter item description" 
                        className="resize-none" 
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
                      <Input 
                        placeholder="Enter image URL (optional)" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="hasVariations"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Has Variations</FormLabel>
                      <FormDescription>
                        Enable if this item has variations like sizes or colors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              {!editForm.watch("hasVariations") && (
                <FormField
                  control={editForm.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter stock quantity" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={editForm.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token Requirement</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a token (required)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tokens.length === 0 ? (
                          <SelectItem value="" disabled>No tokens available</SelectItem>
                        ) : (
                          tokens.map((token) => (
                            <SelectItem key={token.tokenId} value={token.tokenId}>
                              {token.name} ({token.symbol})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    
                    {field.value && field.value.trim() !== "" && (
                      <div className="text-sm p-2 rounded-md mt-1 bg-blue-50 border border-blue-100 text-blue-700">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          <div>
                            {(() => {
                              const token = tokens.find(t => t.tokenId === field.value);
                              return token 
                                ? `Using ${token.name} (${token.symbol})`
                                : "Token verified";
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {editForm.watch("tokenId") && editForm.watch("tokenId").trim() !== "" && (
                <FormField
                  control={editForm.control}
                  name="burnAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Burn Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Number of tokens to burn" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updatePhysicalItemMutation.isPending}
                >
                  {updatePhysicalItemMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Item
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              physical item and any associated token configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePhysicalItemMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
