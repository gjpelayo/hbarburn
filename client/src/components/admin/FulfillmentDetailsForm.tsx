import { FC, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter,
  CardDescription 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrderStatusEnum, UpdateRedemption } from '@shared/schema';
import { OrderTrackingTimeline } from '../OrderTrackingTimeline';
import { Redemption } from '@shared/schema';
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  AlertCircle, 
  Check, 
  CreditCard, 
  DollarSign, 
  Loader2, 
  Package, 
  Truck 
} from "lucide-react";

// Define schema for the form
const fulfillmentFormSchema = z.object({
  status: z.enum(OrderStatusEnum),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional().or(z.string().length(0)),
  carrier: z.string().optional(),
  notes: z.string().optional(),
  estimatedDelivery: z.string().optional(),
  fulfillmentUpdateMessage: z.string().optional(),
});

type FulfillmentFormValues = z.infer<typeof fulfillmentFormSchema>;

interface FulfillmentDetailsFormProps {
  redemption: Redemption;
  onUpdate: (orderId: string, data: UpdateRedemption) => void;
  isLoading: boolean;
}

export const FulfillmentDetailsForm: FC<FulfillmentDetailsFormProps> = ({
  redemption,
  onUpdate,
  isLoading
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [showShippingCostModal, setShowShippingCostModal] = useState(false);
  const { toast } = useToast();

  // Default values for the form
  const defaultValues: Partial<FulfillmentFormValues> = {
    status: redemption.status as any,
    trackingNumber: redemption.trackingNumber || '',
    trackingUrl: redemption.trackingUrl || '',
    carrier: redemption.carrier || '',
    notes: redemption.notes || '',
    estimatedDelivery: redemption.estimatedDelivery || '',
    fulfillmentUpdateMessage: '',
  };

  const form = useForm<FulfillmentFormValues>({
    resolver: zodResolver(fulfillmentFormSchema),
    defaultValues,
  });

  const handleSubmit = (values: FulfillmentFormValues) => {
    // Extract and clean up values
    const {
      status,
      trackingNumber,
      trackingUrl,
      carrier,
      notes,
      estimatedDelivery,
      fulfillmentUpdateMessage
    } = values;

    // Create the update data
    const updateData: UpdateRedemption = {
      status,
      trackingNumber: trackingNumber || null,
      trackingUrl: trackingUrl || null,
      carrier: carrier || null,
      notes: notes || null,
      estimatedDelivery: estimatedDelivery || null,
      fulfillmentUpdate: {
        status,
        message: fulfillmentUpdateMessage || `Status updated to ${status}`,
      }
    };

    onUpdate(redemption.orderId, updateData);
  };

  // Preview current state with updates
  const getPreviewData = () => {
    const formValues = form.getValues();
    
    // Create a preview of the updates
    const previewFulfillmentUpdates = [
      ...(redemption.fulfillmentUpdates || []),
      {
        status: formValues.status,
        timestamp: new Date().toISOString(),
        message: formValues.fulfillmentUpdateMessage || `Status updated to ${formValues.status}`,
        performedBy: 'Preview'
      }
    ];

    return {
      status: formValues.status,
      fulfillmentUpdates: previewFulfillmentUpdates,
      trackingNumber: formValues.trackingNumber || null,
      trackingUrl: formValues.trackingUrl || null,
      carrier: formValues.carrier || null,
      estimatedDelivery: formValues.estimatedDelivery || null
    };
  };

  return (
    <div className="space-y-6">
      {/* Shipping Payment Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Shipping & Fulfillment
          </CardTitle>
          <CardDescription>Process and pay for shipping</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Shipping Cost</p>
                <p className="text-xs text-muted-foreground">
                  Pay to create shipping label and fulfill this order
                </p>
              </div>
              <Button 
                variant="outline" 
                className="border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => {
                  if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
                    setShowShippingCostModal(true);
                  } else {
                    toast({
                      title: "Payment not configured",
                      description: "Please add your Stripe API keys to enable payments.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                Create Shipping Label
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-0 border-t border-blue-100 dark:border-blue-900/50 text-xs text-muted-foreground">
          <div className="flex items-center justify-between w-full">
            <p>Need to add a payment method?</p>
            <Link href="/admin/payment-methods">
              <a className="text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                <CreditCard className="h-3 w-3 mr-1" />
                Manage Payment Methods
              </a>
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Fulfillment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        disabled={isLoading}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select order status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OrderStatusEnum.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedDelivery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Delivery Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Expected delivery date and time
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="trackingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking Number</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Enter tracking number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carrier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carrier</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="Shipping carrier"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trackingUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tracking URL</FormLabel>
                      <FormControl>
                        <Input
                          disabled={isLoading}
                          placeholder="https://..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fulfillmentUpdateMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status Update Message</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        placeholder="Enter details about this status update"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This message will be visible to the customer in their order status history
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        disabled={isLoading}
                        placeholder="Add internal notes about this order (not visible to customer)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      These notes are for internal use only and won't be shared with the customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between mt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Hide Preview" : "Preview Changes"}
                </Button>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                >
                  Update Fulfillment
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {showPreview && (
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Preview</h3>
          <OrderTrackingTimeline {...getPreviewData()} />
        </div>
      )}

      {/* Shipping Payment Modal */}
      <Dialog open={showShippingCostModal} onOpenChange={setShowShippingCostModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Truck className="h-5 w-5 mr-2 text-primary" />
              Create Shipping Label
            </DialogTitle>
            <DialogDescription>
              Pay for shipping to generate a label for this order.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-medium text-sm">Order Details</h3>
              <div className="flex justify-between items-center text-sm">
                <span>Order #:</span>
                <span className="font-medium">{redemption.orderId.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Recipient:</span>
                <span className="font-medium">
                  {redemption.shippingInfo.firstName} {redemption.shippingInfo.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Destination:</span>
                <span className="font-medium">
                  {redemption.shippingInfo.city}, {redemption.shippingInfo.state}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-900">
              <h3 className="font-medium text-sm flex items-center text-blue-800 dark:text-blue-300">
                <DollarSign className="h-4 w-4 mr-1" />
                Shipping Options
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-2 border border-blue-200 dark:border-blue-900 rounded-md bg-white dark:bg-background hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer">
                  <div className="h-4 w-4 mt-0.5 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-600"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm">Standard Shipping</p>
                      <p className="font-bold text-sm">$5.99</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Delivery in 3-5 business days</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 border border-muted rounded-md bg-white dark:bg-background hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer">
                  <div className="h-4 w-4 mt-0.5 rounded-full border-2 border-muted"></div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="font-medium text-sm">Express Shipping</p>
                      <p className="font-medium text-sm">$12.99</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Delivery in 1-2 business days</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm">Subtotal:</span>
                <span className="text-sm">$5.99</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Tax:</span>
                <span className="text-sm">$0.48</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>$6.47</span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex-1 text-xs text-muted-foreground flex items-center">
              <CreditCard className="h-3 w-3 mr-1" />
              Payment via your default payment method
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowShippingCostModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // This would normally process the payment through Stripe
                toast({
                  title: "Stripe API not configured",
                  description: "Shipping label payment would be processed here.",
                  variant: "default",
                });
                setShowShippingCostModal(false);
              }}
            >
              Pay & Create Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};