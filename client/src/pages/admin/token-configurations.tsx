import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PencilIcon, Trash2Icon, PlusIcon, Loader2, LinkIcon } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { TokenConfiguration, PhysicalItem, Token, InsertTokenConfiguration } from "@shared/schema";

// Create schema for form validation
const tokenConfigSchema = z.object({
  physicalItemId: z.coerce.number().min(1, "Physical item is required"),
  tokenId: z.string().min(1, "Token is required"),
  burnAmount: z.coerce.number().min(1, "Burn amount must be at least 1"),
});

type FormValues = z.infer<typeof tokenConfigSchema>;

export default function TokenConfigurationsPage() {
  const { toast } = useToast();
  const { 
    createTokenConfigurationMutation, 
    updateTokenConfigurationMutation, 
    deleteTokenConfigurationMutation 
  } = useAdmin();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<TokenConfiguration | null>(null);
  
  // Load data
  const { data: configurations = [], isLoading } = useQuery<TokenConfiguration[]>({
    queryKey: ["/api/admin/token-configurations"],
  });
  
  const { data: physicalItems = [] } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });
  
  const { data: tokens = [] } = useQuery<Token[]>({
    queryKey: ["/api/admin/tokens"],
  });
  
  // Form for creating a new token configuration
  const createForm = useForm<FormValues>({
    resolver: zodResolver(tokenConfigSchema),
    defaultValues: {
      physicalItemId: 0,
      tokenId: "",
      burnAmount: 1,
    },
  });
  
  // Form for editing an existing token configuration
  const editForm = useForm<FormValues>({
    resolver: zodResolver(tokenConfigSchema),
    defaultValues: {
      physicalItemId: 0,
      tokenId: "",
      burnAmount: 1,
    },
  });
  
  // Prepare for editing
  const handleEditClick = (config: TokenConfiguration) => {
    setSelectedConfig(config);
    editForm.reset({
      physicalItemId: config.physicalItemId,
      tokenId: config.tokenId,
      burnAmount: config.burnAmount,
    });
    setIsEditOpen(true);
  };
  
  // Prepare for deletion
  const handleDeleteClick = (config: TokenConfiguration) => {
    setSelectedConfig(config);
    setIsDeleteOpen(true);
  };
  
  // Create a new token configuration
  const onCreateSubmit = (values: FormValues) => {
    createTokenConfigurationMutation.mutate(values as InsertTokenConfiguration, {
      onSuccess: () => {
        toast({
          title: "Configuration created",
          description: "The token configuration has been created successfully.",
        });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
      },
    });
  };
  
  // Update an existing token configuration
  const onEditSubmit = (values: FormValues) => {
    if (!selectedConfig) return;
    
    updateTokenConfigurationMutation.mutate(
      { id: selectedConfig.id, data: values }, 
      {
        onSuccess: () => {
          toast({
            title: "Configuration updated",
            description: "The token configuration has been updated successfully.",
          });
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
        },
      }
    );
  };
  
  // Delete a token configuration
  const handleDelete = () => {
    if (!selectedConfig) return;
    
    deleteTokenConfigurationMutation.mutate(selectedConfig.id, {
      onSuccess: () => {
        toast({
          title: "Configuration deleted",
          description: "The token configuration has been deleted successfully.",
        });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/token-configurations"] });
      },
    });
  };
  
  // Helper function to get physical item details
  const getPhysicalItemDetails = (id: number) => {
    return physicalItems.find(item => item.id === id);
  };
  
  // Helper function to get token details
  const getTokenDetails = (id: string) => {
    return tokens.find(token => token.tokenId === id);
  };
  
  return (
    <AdminLayout title="Token Configurations">
      <div className="mb-6 max-w-[100vw] overflow-hidden px-2">
        <h2 className="text-lg font-semibold mb-1.5">Manage Token Configurations</h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
          Configure which tokens can be burned to redeem specific physical items
        </p>
        <div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Add Configuration
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : configurations.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Token Configurations</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't set up any token configurations yet.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {configurations.map((config) => {
            const physicalItem = getPhysicalItemDetails(config.physicalItemId);
            const token = getTokenDetails(config.tokenId);
            
            return (
              <Card key={config.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {physicalItem?.imageUrl && (
                      <div className="w-12 h-12 rounded overflow-hidden border">
                        <img 
                          src={physicalItem.imageUrl} 
                          alt={physicalItem.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-medium">{physicalItem?.name || "Unknown Item"}</h3>
                      <p className="text-sm text-muted-foreground">
                        {physicalItem?.description ? physicalItem.description.substring(0, 60) + '...' : 'No description'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t border-b py-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Redeemable with:</div>
                      <div className="text-sm font-semibold">
                        {config.burnAmount} tokens
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {token?.symbol || "???"}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {config.tokenId}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditClick(config)}
                    >
                      <PencilIcon className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(config)}
                    >
                      <Trash2Icon className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {/* Create Configuration Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Token Configuration</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="physicalItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Item</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select physical item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {physicalItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token.tokenId} value={token.tokenId}>
                            {token.name} ({token.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
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
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTokenConfigurationMutation.isPending}>
                  {createTokenConfigurationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Configuration"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Configuration Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Token Configuration</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="physicalItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Physical Item</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select physical item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {physicalItems.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token.tokenId} value={token.tokenId}>
                            {token.name} ({token.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
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
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTokenConfigurationMutation.isPending}>
                  {updateTokenConfigurationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Configuration"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Configuration</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete this token configuration? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTokenConfigurationMutation.isPending}
            >
              {deleteTokenConfigurationMutation.isPending ? (
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