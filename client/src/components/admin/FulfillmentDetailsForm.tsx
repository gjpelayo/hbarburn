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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatusEnum, UpdateRedemption } from '@shared/schema';
import { OrderTrackingTimeline } from '../OrderTrackingTimeline';
import { Redemption } from '@shared/schema';

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
    </div>
  );
};