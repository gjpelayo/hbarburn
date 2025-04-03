import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/use-admin";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { OrderTrackingTimeline } from "@/components/OrderTrackingTimeline";
import { FulfillmentDetailsForm } from "@/components/admin/FulfillmentDetailsForm";
import type { Redemption, UpdateRedemption, PhysicalItem } from "@shared/schema";

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
  
  // Handle view details dialog
  const handleViewClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setIsViewOpen(true);
  };
  
  // Handle status update dialog
  const handleUpdateClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setIsUpdateOpen(true);
  };
  
  // Create a mutation for updating a redemption
  const updateRedemptionMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: UpdateRedemption }) => {
      const res = await apiRequest('PATCH', `/api/admin/redemptions/${orderId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Redemption updated",
        description: "The redemption status has been updated successfully.",
      });
      setIsUpdateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/redemptions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handler for updating a redemption
  const handleRedemptionUpdate = (orderId: string, data: UpdateRedemption) => {
    updateRedemptionMutation.mutate({ orderId, data });
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
      
      <div className="mb-4">
        <div className="w-full md:w-64">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pr-10 appearance-none"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
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
      </div>
      
      {/* Update Status Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Redemption Status</DialogTitle>
          </DialogHeader>
          
          {selectedRedemption && (
            <FulfillmentDetailsForm
              redemption={selectedRedemption}
              onUpdate={handleRedemptionUpdate}
              isLoading={updateRedemptionMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Redemption Details</DialogTitle>
          </DialogHeader>
          
          {selectedRedemption && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                </div>
                
                <div className="space-y-6">
                  <OrderTrackingTimeline
                    status={selectedRedemption.status}
                    fulfillmentUpdates={selectedRedemption.fulfillmentUpdates || []}
                    trackingNumber={selectedRedemption.trackingNumber}
                    trackingUrl={selectedRedemption.trackingUrl}
                    carrier={selectedRedemption.carrier}
                    estimatedDelivery={selectedRedemption.estimatedDelivery}
                  />
                  
                  {selectedRedemption.notes && (
                    <div className="border rounded-md p-4">
                      <h3 className="font-medium mb-2">Internal Notes</h3>
                      <p className="text-sm whitespace-pre-line">
                        {selectedRedemption.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
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