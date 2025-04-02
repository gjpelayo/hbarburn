import { FC } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, Truck, Package, Clock, XCircle, ShoppingBag, Warehouse } from "lucide-react";
import { FulfillmentUpdate } from '@shared/schema';
import { format } from 'date-fns';

interface OrderTrackingTimelineProps {
  status: string;
  fulfillmentUpdates: FulfillmentUpdate[];
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

// Helper function to get icon based on status
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'confirmed':
      return <Check className="h-4 w-4" />;
    case 'processing':
      return <Warehouse className="h-4 w-4" />;
    case 'shipped':
      return <Truck className="h-4 w-4" />;
    case 'delivered':
      return <Package className="h-4 w-4" />;
    case 'completed':
      return <ShoppingBag className="h-4 w-4" />;
    case 'cancelled':
    case 'refunded':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

// Helper function to get badge variant based on status
const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'pending':
      return "secondary";
    case 'confirmed':
    case 'processing':
      return "default";
    case 'shipped':
    case 'delivered':
    case 'completed':
      return "default";
    case 'cancelled':
    case 'refunded':
      return "destructive";
    default:
      return "outline";
  }
};

// Helper function to format timestamp
const formatTimestamp = (timestamp: string) => {
  try {
    return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
  } catch (e) {
    return timestamp;
  }
};

// Status mapping for user-friendly display
const statusDisplayMap: Record<string, string> = {
  'pending': 'Order Received',
  'confirmed': 'Transaction Confirmed',
  'processing': 'Processing Order',
  'shipped': 'Shipped',
  'delivered': 'Delivered',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'refunded': 'Refunded'
};

export const OrderTrackingTimeline: FC<OrderTrackingTimelineProps> = ({ 
  status, 
  fulfillmentUpdates, 
  trackingNumber, 
  trackingUrl, 
  carrier,
  estimatedDelivery 
}) => {
  // Sort updates by timestamp (newest first for display)
  const sortedUpdates = [...fulfillmentUpdates].sort((a, b) => {
    if (!a.timestamp || !b.timestamp) return 0;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Order Status</span>
          <Badge variant={getStatusVariant(status)}>
            {statusDisplayMap[status] || status}
          </Badge>
        </CardTitle>
        <CardDescription>
          {status === 'shipped' && trackingNumber && (
            <div className="mt-2">
              <p className="text-sm">
                Tracking: {trackingUrl ? (
                  <a 
                    href={trackingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {trackingNumber}
                  </a>
                ) : trackingNumber}
              </p>
              {carrier && <p className="text-sm">Carrier: {carrier}</p>}
              {estimatedDelivery && (
                <p className="text-sm">
                  Estimated Delivery: {formatTimestamp(estimatedDelivery)}
                </p>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {sortedUpdates.map((update, idx) => (
            <div key={idx} className="relative">
              <div className="flex gap-4 items-start">
                <div className="bg-muted p-2 rounded-full">
                  {getStatusIcon(update.status)}
                </div>
                <div className="space-y-1">
                  <p className="font-medium">
                    {statusDisplayMap[update.status] || update.status}
                  </p>
                  {update.message && (
                    <p className="text-sm text-muted-foreground">
                      {update.message}
                    </p>
                  )}
                  {update.timestamp && (
                    <p className="text-xs text-muted-foreground">
                      {formatTimestamp(update.timestamp)}
                    </p>
                  )}
                  {update.performedBy && update.performedBy !== 'system' && (
                    <p className="text-xs text-muted-foreground">
                      By: {update.performedBy}
                    </p>
                  )}
                </div>
              </div>
              {idx < sortedUpdates.length - 1 && (
                <div className="absolute left-[18px] top-8 bottom-0 w-[2px] bg-muted h-6" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
      {status === 'pending' && (
        <CardFooter className="text-sm text-muted-foreground">
          <p>Your order is being processed. We'll update you soon.</p>
        </CardFooter>
      )}
    </Card>
  );
};