import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckIcon, 
  Truck, 
  Search, 
  Clock, 
  ShoppingBag, 
  PackageCheck, 
  Loader2,
  ClipboardCheck,
  ExternalLink 
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import type { Redemption, UpdateRedemption, PhysicalItem } from "@shared/schema";

// Local form schema that mirrors the server-side schema
const updateRedemptionSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "completed", "cancelled"]),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof updateRedemptionSchema>;

export default function RedemptionsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  
  // Load data
  const { data: redemptions = [], isLoading } = useQuery<Redemption[]>({
    queryKey: ["/api/admin/redemptions"],
  });
  
  const { data: physicalItems = [] } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });
  
  // Form for updating redemption status
  const updateForm = useForm<FormValues>({
    resolver: zodResolver(updateRedemptionSchema),
    defaultValues: {
      status: "pending",
      trackingNumber: "",
      notes: "",
    },
  });
  
  // Handle status update dialog
  const handleUpdateClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    updateForm.reset({
      status: redemption.status as any,
      trackingNumber: redemption.trackingNumber || "",
      notes: redemption.notes || "",
    });
    setIsUpdateOpen(true);
  };
  
  // Handle view details dialog
  const handleViewClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setIsViewOpen(true);
  };
  
  // Update redemption status
  const onUpdateSubmit = (values: FormValues) => {
    if (!selectedRedemption) return;
    
    // Create the update data object
    const updateData: UpdateRedemption = {
      status: values.status,
    };
    
    // Only include optional fields if they have values
    if (values.trackingNumber) {
      updateData.trackingNumber = values.trackingNumber;
    }
    
    if (values.notes) {
      updateData.notes = values.notes;
    }
    
    // Use the API endpoint to update the redemption
    fetch(`/api/admin/redemptions/${selectedRedemption.orderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to update redemption');
      }
      return response.json();
    })
    .then(() => {
      toast({
        title: "Redemption updated",
        description: "The redemption status has been updated successfully.",
      });
      setIsUpdateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redemptions"] });
    })
    .catch(error => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    });
  };
  
  // Filter redemptions based on active tab
  const filteredRedemptions = activeTab === "all" 
    ? redemptions 
    : redemptions.filter(r => r.status === activeTab);
  
  // Helper function to get physical item details
  const getPhysicalItemDetails = (id: number) => {
    return physicalItems.find(item => item.id === id);
  };
  
  // Helper function to get status badge display
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Processing</Badge>;
      case "shipped":
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Shipped</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <AdminLayout title="Redemptions">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Manage Redemption Orders</h2>
          <p className="text-sm text-muted-foreground">
            Track and update the status of token redemption orders
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <Card className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {activeTab === "pending" ? (
                  <Clock className="h-6 w-6 text-muted-foreground" />
                ) : activeTab === "completed" ? (
                  <CheckIcon className="h-6 w-6 text-muted-foreground" />
                ) : activeTab === "shipped" ? (
                  <Truck className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold mb-2">No {activeTab !== "all" ? activeTab : ""} Orders</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "all" 
                  ? "There are no redemption orders yet" 
                  : `There are no ${activeTab} orders at the moment`}
              </p>
            </Card>
          ) : (
            <div className="rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Physical Item</TableHead>
                    <TableHead>Token Burned</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRedemptions.map((redemption) => {
                    const physicalItem = getPhysicalItemDetails(redemption.physicalItemId);
                    const createdDate = new Date(redemption.createdAt);
                    
                    return (
                      <TableRow key={redemption.orderId}>
                        <TableCell className="font-medium">
                          {redemption.orderId.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {formatDistanceToNow(createdDate, { addSuffix: true })}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {createdDate.toLocaleString()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{redemption.accountId.substring(0, 8)}...</span>
                        </TableCell>
                        <TableCell>{physicalItem?.name || "Unknown Item"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{redemption.amount}</span>
                            <span className="text-xs text-muted-foreground">{redemption.tokenId.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClick(redemption)}
                              className="h-7 w-7 p-0"
                            >
                              <Search className="h-4 w-4" />
                              <span className="sr-only">View Details</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateClick(redemption)}
                              className="h-7 w-7 p-0"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                              <span className="sr-only">Update Status</span>
                            </Button>
                            {redemption.transactionId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={`https://hashscan.io/testnet/transaction/${redemption.transactionId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:text-primary/80"
                                    >
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                        <span className="sr-only">View Transaction</span>
                                      </Button>
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    View transaction on HashScan
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Update Status Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Redemption Status</DialogTitle>
          </DialogHeader>
          <Form {...updateForm}>
            <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <FormField
                control={updateForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="trackingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracking Number</FormLabel>
                    <FormControl>
                      <input 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g. 1Z999AA10123456784" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={updateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                        placeholder="Add any internal notes about this order" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUpdateOpen(false)} type="button">
                  Cancel
                </Button>
                <Button type="submit">
                  Update Status
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Redemption Details</DialogTitle>
          </DialogHeader>
          
          {selectedRedemption && (
            <div className="space-y-6">
              <div className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">Order Information</h3>
                    <p className="text-sm text-muted-foreground">
                      Created {new Date(selectedRedemption.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedRedemption.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Order ID</div>
                    <div className="font-medium">{selectedRedemption.orderId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Account ID</div>
                    <div className="font-medium">{selectedRedemption.accountId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Token ID</div>
                    <div className="font-medium">{selectedRedemption.tokenId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Amount Burned</div>
                    <div className="font-medium">{selectedRedemption.amount}</div>
                  </div>
                  {selectedRedemption.transactionId && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Transaction ID</div>
                      <div className="font-medium flex items-center">
                        <span className="truncate mr-2">{selectedRedemption.transactionId}</span>
                        <a
                          href={`https://hashscan.io/testnet/transaction/${selectedRedemption.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  )}
                  {selectedRedemption.trackingNumber && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Tracking Number</div>
                      <div className="font-medium">{selectedRedemption.trackingNumber}</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border rounded-md p-4 space-y-4">
                <h3 className="font-medium">Shipping Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Recipient</div>
                    <div className="font-medium">
                      {selectedRedemption.shippingInfo.firstName} {selectedRedemption.shippingInfo.lastName}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Address</div>
                    <div className="font-medium">
                      {selectedRedemption.shippingInfo.address}<br />
                      {selectedRedemption.shippingInfo.address2 && (
                        <>{selectedRedemption.shippingInfo.address2}<br /></>
                      )}
                      {selectedRedemption.shippingInfo.city}, {selectedRedemption.shippingInfo.state} {selectedRedemption.shippingInfo.zip}<br />
                      {selectedRedemption.shippingInfo.country}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedRedemption.shippingInfo.email}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Phone</div>
                    <div className="font-medium">{selectedRedemption.shippingInfo.phone}</div>
                  </div>
                </div>
              </div>
              
              {selectedRedemption.notes && (
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Internal Notes</h3>
                  <p className="text-sm whitespace-pre-line">
                    {selectedRedemption.notes}
                  </p>
                </div>
              )}
              
              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setIsViewOpen(false)}
                >
                  Close
                </Button>
                <Button 
                  variant="default"
                  onClick={() => {
                    setIsViewOpen(false);
                    handleUpdateClick(selectedRedemption);
                  }}
                >
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}