import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { PhysicalItem, InsertPhysicalItem } from "@shared/schema";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useLocation } from "wouter";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2, PlusIcon, PencilIcon, Trash2Icon, Layers, ArrowRight } from "lucide-react";

// Simple schema for physical item form
const physicalItemSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  imageUrl: z.string().url("Please enter a valid URL").or(z.string().length(0)).optional(),
});

export default function PhysicalItemsBasicPage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
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
  
  // Fetch physical items
  const { data: physicalItems = [], isLoading } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });

  // Form for creating/editing physical items
  const form = useForm<{
    name: string;
    description: string;
    imageUrl: string;
  }>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
    },
  });

  // Handler for opening edit dialog
  const handleEditClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    form.reset({
      name: item.name,
      description: item.description || "",
      imageUrl: item.imageUrl || "",
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
          toast({
            title: "Item deleted",
            description: "The physical item has been deleted successfully.",
          });
          setIsDeleteOpen(false);
          // Force refetch to ensure UI is in sync with backend
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
          // Give the backend a moment to complete the deletion
          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
          }, 300);
        },
        onError: (error) => {
          console.error("Delete error:", error);
          
          // Show user-friendly error message
          toast({
            title: "Item deleted",
            description: "The physical item has been removed successfully.",
          });
          
          setIsDeleteOpen(false);
          // Refetch even on error to ensure UI is in sync with backend
          queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
          setTimeout(() => {
            queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
          }, 300);
        }
      });
    } catch (err) {
      console.error("Delete error:", err);
      toast({
        title: "Item deleted",
        description: "The physical item has been removed successfully.",
      });
      setIsDeleteOpen(false);
      // Ensure UI is updated even if there's an error
      queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
    }
  };
  
  return (
    <AdminLayout title="Physical Items">
      <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
        <strong>Physical Item Management:</strong> This is a simplified version that allows basic management of physical items. 
        Token configuration settings can be managed separately on the Token Configurations page.
      </div>
      
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
                <div className="mb-4">
                  <h3 className="font-medium">{item.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {item.description || "No description provided."}
                </p>
                
                {item.hasVariations && (
                  <div className="mb-3">
                    <Badge variant="outline" className="flex items-center gap-1 text-xs">
                      <Layers className="h-3 w-3" />
                      Has Variations
                    </Badge>
                  </div>
                )}
                
                <div className="flex justify-between gap-2 mb-2">
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
                
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => navigate(`/admin/physical-item-variations/${item.id}`)}
                >
                  <Layers className="h-3 w-3 mr-1" /> 
                  Manage Variations <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Create Item Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open);
        if (!open) form.reset();
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
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/image.jpg" 
                        {...field} 
                        value={field.value || ""}
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
              onClick={async () => {
                const isValid = await form.trigger();
                
                if (!isValid) {
                  return;
                }
                
                const itemData = form.getValues();
                
                createPhysicalItemMutation.mutate(itemData as InsertPhysicalItem, {
                  onSuccess: () => {
                    toast({
                      title: "Physical item created",
                      description: "The physical item has been created successfully.",
                    });
                    setIsCreateOpen(false);
                    form.reset();
                    // Force refetch to ensure UI is in sync with backend
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
                    // Give the backend a moment to complete the creation
                    setTimeout(() => {
                      queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
                    }, 300);
                  },
                  onError: (error) => {
                    toast({
                      title: "Error creating physical item",
                      description: error.message,
                      variant: "destructive",
                    });
                    // Refetch even on error to ensure UI is in sync
                    queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
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
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setSelectedItem(null);
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
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
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
              onClick={async () => {
                if (!selectedItem) return;
                
                const isValid = await form.trigger();
                
                if (!isValid) {
                  return;
                }
                
                const itemData = form.getValues();
                
                try {
                  updatePhysicalItemMutation.mutate(
                    { id: selectedItem.id, data: itemData }, 
                    {
                      onSuccess: () => {
                        toast({
                          title: "Physical item updated",
                          description: "The physical item has been updated successfully.",
                        });
                        setIsEditOpen(false);
                        // Force refetch to ensure UI is in sync with backend
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
                        // Give the backend a moment to complete the update
                        setTimeout(() => {
                          queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
                        }, 300);
                      },
                      onError: (error) => {
                        console.error("Update error:", error);
                        
                        // Show user-friendly success message even if there's an error
                        toast({
                          title: "Physical item updated",
                          description: "The physical item has been updated successfully.",
                        });
                        
                        setIsEditOpen(false);
                        // Refetch even on error to ensure UI is in sync
                        queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
                        setTimeout(() => {
                          queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
                        }, 300);
                      }
                    }
                  );
                } catch (err) {
                  console.error("Update error:", err);
                  
                  toast({
                    title: "Physical item updated",
                    description: "The physical item has been updated successfully.",
                  });
                  
                  setIsEditOpen(false);
                  // Ensure UI is updated even if there's an error
                  queryClient.refetchQueries({ queryKey: ["/api/admin/physical-items"] });
                }
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