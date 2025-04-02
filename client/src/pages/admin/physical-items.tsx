import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  tokenId: z.string().min(1, "Token ID is required"),
  tokenSymbol: z.string().min(1, "Token symbol is required"),
  tokenCost: z.coerce.number().min(1, "Token cost must be at least 1"),
});

type FormValues = z.infer<typeof physicalItemSchema>;

export default function PhysicalItemsPage() {
  const { toast } = useToast();
  const { createPhysicalItemMutation, updatePhysicalItemMutation, deletePhysicalItemMutation } = useAdmin();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PhysicalItem | null>(null);
  
  // Load physical items data
  const { data: physicalItems = [], isLoading } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });
  
  // Form for creating a new item
  const createForm = useForm<FormValues>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      tokenId: "",
      tokenSymbol: "",
      tokenCost: 1,
    },
  });
  
  // Form for editing an existing item
  const editForm = useForm<FormValues>({
    resolver: zodResolver(physicalItemSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      tokenId: "",
      tokenSymbol: "",
      tokenCost: 1,
    },
  });
  
  // When edit dialog opens, populate form with selected item data
  const handleEditClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      tokenId: item.tokenId,
      tokenSymbol: item.tokenSymbol,
      tokenCost: item.tokenCost,
    });
    setIsEditOpen(true);
  };
  
  // When delete dialog opens, set the selected item
  const handleDeleteClick = (item: PhysicalItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };
  
  // Create a new physical item
  const onCreateSubmit = (values: FormValues) => {
    createPhysicalItemMutation.mutate(values as InsertPhysicalItem, {
      onSuccess: () => {
        toast({
          title: "Physical item created",
          description: "The physical item has been created successfully.",
        });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/physical-items"] });
      },
    });
  };
  
  // Update an existing physical item
  const onEditSubmit = (values: FormValues) => {
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Manage Physical Items</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit or remove physical items available for token redemption
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
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
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span className="text-base">{item.name}</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {item.tokenCost} {item.tokenSymbol}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {item.description.length > 120 
                    ? `${item.description.substring(0, 120)}...` 
                    : item.description}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <div className="text-muted-foreground">
                    Token: {item.tokenId}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditClick(item)}
                    >
                      <PencilIcon className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
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
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
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
                control={createForm.control}
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
                control={createForm.control}
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
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={createForm.control}
                  name="tokenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token ID</FormLabel>
                      <FormControl>
                        <Input placeholder="0.0.1001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="tokenSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="HBAR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="tokenCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Cost</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={createPhysicalItemMutation.isPending}>
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
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Item Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Physical Item</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
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
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="tokenId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="tokenSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Symbol</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="tokenCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Cost</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePhysicalItemMutation.isPending}>
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
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Physical Item</DialogTitle>
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