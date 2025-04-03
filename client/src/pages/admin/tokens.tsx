import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import AdminLayout from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PencilIcon, Trash2Icon, PlusIcon, Loader2, Coins } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { isValidTokenId } from "@/lib/hedera";
import type { Token, InsertToken } from "@shared/schema";

// Create schema for form validation
const tokenSchema = z.object({
  tokenId: z.string().min(1, "Token ID is required").refine(
    tokenId => isValidTokenId(tokenId),
    { message: "Invalid Hedera token ID format (e.g. 0.0.1001)" }
  ),
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  decimals: z.coerce.number().min(0, "Decimals must be at least 0"),
  redemptionItem: z.string().optional(),
});

type FormValues = z.infer<typeof tokenSchema>;

export default function TokensPage() {
  const { toast } = useToast();
  const { createTokenMutation, updateTokenMutation, deleteTokenMutation } = useAdmin();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  
  // Load tokens data
  const { data: tokens = [], isLoading } = useQuery<Token[]>({
    queryKey: ["/api/admin/tokens"],
  });
  
  // Form for creating a new token
  const createForm = useForm<FormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      tokenId: "",
      name: "",
      symbol: "",
      decimals: 0,
      redemptionItem: "",
    },
  });
  
  // Form for editing an existing token
  const editForm = useForm<FormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      tokenId: "",
      name: "",
      symbol: "",
      decimals: 0,
      redemptionItem: "",
    },
  });
  
  // When edit dialog opens, populate form with selected token data
  const handleEditClick = (token: Token) => {
    setSelectedToken(token);
    editForm.reset({
      tokenId: token.tokenId,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      redemptionItem: token.redemptionItem || "",
    });
    setIsEditOpen(true);
  };
  
  // When delete dialog opens, set the selected token
  const handleDeleteClick = (token: Token) => {
    setSelectedToken(token);
    setIsDeleteOpen(true);
  };
  
  // Create a new token
  const onCreateSubmit = (values: FormValues) => {
    createTokenMutation.mutate(values as InsertToken, {
      onSuccess: () => {
        toast({
          title: "Token created",
          description: "The token has been created successfully.",
        });
        setIsCreateOpen(false);
        createForm.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
      },
    });
  };
  
  // Update an existing token
  const onEditSubmit = (values: FormValues) => {
    if (!selectedToken) return;
    
    updateTokenMutation.mutate(
      { tokenId: selectedToken.tokenId, data: values }, 
      {
        onSuccess: () => {
          toast({
            title: "Token updated",
            description: "The token has been updated successfully.",
          });
          setIsEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
        },
      }
    );
  };
  
  // Delete a token
  const handleDelete = () => {
    if (!selectedToken) return;
    
    deleteTokenMutation.mutate(selectedToken.tokenId, {
      onSuccess: () => {
        toast({
          title: "Token deleted",
          description: "The token has been deleted successfully.",
        });
        setIsDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/tokens"] });
      },
    });
  };
  
  return (
    <AdminLayout title="Tokens">
      <div className="mb-6 max-w-[100vw] overflow-hidden px-2">
        <h2 className="text-lg font-semibold mb-1.5">Manage Tokens</h2>
        <p className="text-sm text-muted-foreground mb-3 max-w-2xl">
          Add, edit or remove tokens that can be burned for physical items
        </p>
        <div>
          <Button onClick={() => setIsCreateOpen(true)} size="sm">
            <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
            Add New Token
          </Button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tokens.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tokens</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't added any tokens yet.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Token
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tokens.map((token) => (
            <Card key={token.tokenId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-semibold text-primary">{token.symbol}</span>
                  </div>
                  <div>
                    <h3 className="font-medium">{token.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {token.tokenId}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Decimals</span>
                    <span>{token.decimals}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span>{(token as any).balance || "0"}</span>
                  </div>
                  <div className="text-sm mt-2">
                    <div className="text-muted-foreground mb-1">Redemption Item</div>
                    <div>{token.redemptionItem || "-"}</div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditClick(token)}
                  >
                    <PencilIcon className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteClick(token)}
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
      
      {/* Create Token Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Token</DialogTitle>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Token" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={createForm.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input placeholder="TKN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={createForm.control}
                name="redemptionItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redemption Item Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Limited Edition Collectible" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTokenMutation.isPending}>
                  {createTokenMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Token"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Token Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Token</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="tokenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Token ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="decimals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimals</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="redemptionItem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redemption Item Description</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTokenMutation.isPending}>
                  {updateTokenMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Token"
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
            <DialogTitle>Delete Token</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Are you sure you want to delete <strong>{selectedToken?.name}</strong> ({selectedToken?.symbol})? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteTokenMutation.isPending}
            >
              {deleteTokenMutation.isPending ? (
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