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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Package, PencilIcon, Trash2Icon, PlusIcon, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { PhysicalItem, InsertPhysicalItem } from "@shared/schema";

// Create schema for form validation
const physicalItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
});

export default function PhysicalItemsFixedPage() {
  const { toast } = useToast();
  const { 
    createPhysicalItemMutation, 
    updatePhysicalItemMutation, 
    deletePhysicalItemMutation
  } = useAdmin();

  // UI state
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
    
    deletePhysicalItemMutation.mutate(selectedItem.id, {
      onSuccess: () => {
        toast({
          title: "Item deleted",
          description: "The physical item has been deleted successfully.",
        });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      },
      onError: (error) => {
        toast({
          title: "Error deleting item",
          description: error.message,
          variant: "destructive",
        });
      }
    });
  };
  
  return (
    <AdminLayout title="Physical Items">
      <div className="mb-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
        <strong>Physical Item Management:</strong> This page allows you to manage physical items without token configuration settings.
        Token configurations will be managed separately when the application is deployed to a production environment with Hedera credentials.
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
                  {item.description}
                </p>
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
              Add a new physical item that users can redeem with tokens.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <div className="space-y-4">
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
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          
          <DialogFooter className="mt-6">
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
              Update details for this physical item.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <div className="space-y-4">
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>
          
          <DialogFooter className="mt-6">
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
                
                updatePhysicalItemMutation.mutate(
                  { id: selectedItem.id, data: itemData }, 
                  {
                    onSuccess: () => {
                      toast({
                        title: "Physical item updated",
                        description: "The physical item has been updated successfully.",
                      });
                      setIsEditOpen(false);
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