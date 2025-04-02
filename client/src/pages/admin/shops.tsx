import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusCircle, Pencil, Trash, RefreshCw } from "lucide-react";

// UI Components
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define the shop type
interface Shop {
  id: number;
  name: string;
  description: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Create the zod schema for the shop form
const shopSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  imageUrl: z.string().url("Must be a valid URL").or(z.string().length(0)).optional(),
  isActive: z.boolean().default(true),
});

type FormValues = z.infer<typeof shopSchema>;

export default function ShopsPage() {
  const { toast } = useToast();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | 'all'>('active');

  // Query to fetch shops
  const { data: shops, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/admin/shops"],
    // Use the default queryFn which correctly handles the response
  });

  // Mutation to create a shop
  const createShopMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest("POST", "/api/admin/shops", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      toast({
        title: "Shop created",
        description: "The shop has been created successfully.",
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create shop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to edit a shop
  const editShopMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: FormValues }) => {
      return await apiRequest("PATCH", `/api/admin/shops/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      toast({
        title: "Shop updated",
        description: "The shop has been updated successfully.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update shop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a shop
  const deleteShopMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/shops/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/shops"] });
      toast({
        title: "Shop deleted",
        description: "The shop has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete shop",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for creating a shop
  const createForm = useForm<FormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      isActive: true,
    },
  });

  // Form for editing a shop
  const editForm = useForm<FormValues>({
    resolver: zodResolver(shopSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
      isActive: true,
    },
  });

  // Handle create submit
  const onCreateSubmit = (values: FormValues) => {
    createShopMutation.mutate(values);
  };

  // Handle edit submit
  const onEditSubmit = (values: FormValues) => {
    if (selectedShop) {
      editShopMutation.mutate({ id: selectedShop.id, data: values });
    }
  };

  // Handle delete confirmation
  const handleDelete = () => {
    if (selectedShop) {
      deleteShopMutation.mutate(selectedShop.id);
    }
  };

  // Set up the edit form when a shop is selected
  const handleEditClick = (shop: Shop) => {
    setSelectedShop(shop);
    editForm.reset({
      name: shop.name,
      description: shop.description,
      imageUrl: shop.imageUrl || "",
      isActive: shop.isActive,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (shop: Shop) => {
    setSelectedShop(shop);
    setIsDeleteDialogOpen(true);
  };

  // If data is loading, show skeletons
  if (isLoading) {
    return (
      <div className="container mx-auto my-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Shops Management</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // If there's an error, show error message
  if (error) {
    return (
      <div className="container mx-auto my-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Shops Management</h1>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600 dark:text-red-400">{error instanceof Error ? error.message : "An unknown error occurred"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter shops based on the selected status
  const filteredShops = useMemo(() => {
    if (!shops) return [];
    
    switch (filterStatus) {
      case 'active':
        return shops.filter(shop => shop.isActive);
      case 'inactive':
        return shops.filter(shop => !shop.isActive);
      case 'all':
      default:
        return shops;
    }
  }, [shops, filterStatus]);

  return (
    <div className="container mx-auto my-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Shops Management</h1>
        <Button onClick={() => {
          createForm.reset();
          setIsCreateDialogOpen(true);
        }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Shop
        </Button>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Label htmlFor="filter-status">Filter:</Label>
          <Select
            value={filterStatus}
            onValueChange={(value) => setFilterStatus(value as 'active' | 'inactive' | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active Shops</SelectItem>
              <SelectItem value="inactive">Inactive Shops</SelectItem>
              <SelectItem value="all">All Shops</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredShops.map((shop: Shop) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            onEdit={() => handleEditClick(shop)}
            onDelete={() => handleDeleteClick(shop)}
          />
        ))}
        {filteredShops.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">
              {filterStatus === 'active' && 'No active shops found.'}
              {filterStatus === 'inactive' && 'No inactive shops found.'}
              {filterStatus === 'all' && 'No shops found.'}
            </p>
          </div>
        )}
      </div>

      {/* Create Shop Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create a New Shop</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new shop collection.
            </DialogDescription>
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
                      <Input placeholder="Enter shop name" {...field} />
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
                        placeholder="Describe what products this shop will contain"
                        className="min-h-[100px]"
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
                      <Input placeholder="Enter image URL (optional)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a URL to an image that represents this shop.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Make this shop visible and available to users
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

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={createShopMutation.isPending}
                >
                  {createShopMutation.isPending && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Create Shop
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Shop Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Shop</DialogTitle>
            <DialogDescription>
              Update the details of this shop.
            </DialogDescription>
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
                      <Input placeholder="Enter shop name" {...field} />
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
                        placeholder="Describe what products this shop will contain"
                        className="min-h-[100px]"
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
                      <Input placeholder="Enter image URL (optional)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a URL to an image that represents this shop.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Make this shop visible and available to users
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

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={editShopMutation.isPending}
                >
                  {editShopMutation.isPending && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shop "{selectedShop?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={deleteShopMutation.isPending}
            >
              {deleteShopMutation.isPending && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Shop Card Component
function ShopCard({ 
  shop, 
  onEdit, 
  onDelete 
}: { 
  shop: Shop; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  return (
    <Card className={!shop.isActive ? "opacity-70" : ""}>
      <CardHeader className="relative pb-2">
        <div className="absolute right-4 top-4 flex space-x-1">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-red-500 hover:text-red-600">
            <Trash className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="mr-16">{shop.name}</CardTitle>
        <CardDescription>
          {new Date(shop.createdAt).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {shop.imageUrl && (
          <div className="mb-4 h-32 w-full overflow-hidden rounded-md">
            <img 
              src={shop.imageUrl} 
              alt={shop.name} 
              className="h-full w-full object-cover object-center" 
              onError={(e) => {
                // On error, set to fallback image
                (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x150?text=No+Image";
              }}
            />
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
          {shop.description}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center pt-2">
        <div className="text-xs font-medium">
          {shop.isActive ? (
            <span className="text-green-500">Active</span>
          ) : (
            <span className="text-gray-500">Inactive</span>
          )}
        </div>
        <a 
          href={`/shop/${shop.id}`} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          View Shop Page
        </a>
      </CardFooter>
    </Card>
  );
}