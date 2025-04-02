import { useEffect, useState } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  AlertCircle, 
  ArrowLeft, 
  Loader2, 
  PackageCheck 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Redemption, ShippingInfo } from '@shared/schema';
import { OrderTrackingTimeline } from '@/components/OrderTrackingTimeline';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

export default function OrderTrackingPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/track/:orderId');
  const [searchOrderId, setSearchOrderId] = useState('');
  
  const orderId = params?.orderId || '';
  
  useEffect(() => {
    // If orderId is provided in the URL, populate the search field
    if (orderId) {
      setSearchOrderId(orderId);
    }
  }, [orderId]);

  // Query for redemption data
  const { data: redemption, isLoading, error } = useQuery<Redemption>({
    queryKey: ['/api/redemptions', orderId],
    queryFn: async () => {
      const res = await fetch(`/api/redemptions/${orderId}`);
      if (!res.ok) {
        throw new Error('Order not found');
      }
      return res.json();
    },
    enabled: !!orderId, // Only run query if orderId is provided
  });

  // Handler for searching orders
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchOrderId) {
      setLocation(`/track/${searchOrderId}`);
    }
  };

  // Function to safely access shipping info (handle unknown type)
  const getShippingInfo = (): ShippingInfo | null => {
    if (!redemption || !redemption.shippingInfo) return null;
    
    try {
      const info = redemption.shippingInfo as unknown as ShippingInfo;
      // Basic validation to check if it's a shipping info object
      if (info.firstName && info.lastName && info.address) {
        return info;
      }
    } catch (e) {
      console.error("Error parsing shipping info:", e);
    }
    
    return null;
  };

  const shippingInfo = getShippingInfo();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <h1 className="text-3xl font-bold tracking-tight">Order Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your token redemption order
          </p>
        </div>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Find Your Order</CardTitle>
            <CardDescription>
              Enter your order ID to track your redemption status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="orderId" className="sr-only">
                  Order ID
                </Label>
                <Input
                  id="orderId"
                  placeholder="Enter your order ID (e.g., ORD-AB123XYZ)"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                />
              </div>
              <Button type="submit">Track Order</Button>
            </form>
          </CardContent>
        </Card>
        
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading order details...</span>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load order details'}
            </AlertDescription>
          </Alert>
        )}
        
        {redemption && (
          <div className="space-y-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-semibold">Order {redemption.orderId}</h2>
                <p className="text-muted-foreground">
                  Placed on {new Date(redemption.createdAt).toLocaleDateString()}
                </p>
              </div>
              {redemption.status === 'completed' && (
                <div className="flex items-center text-green-600">
                  <PackageCheck className="mr-2 h-5 w-5" />
                  <span className="font-medium">Completed</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <OrderTrackingTimeline
                status={redemption.status}
                fulfillmentUpdates={redemption.fulfillmentUpdates || []}
                trackingNumber={redemption.trackingNumber}
                trackingUrl={redemption.trackingUrl}
                carrier={redemption.carrier}
                estimatedDelivery={redemption.estimatedDelivery}
              />
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-semibold">Token Burned</h3>
                      <p>
                        {redemption.amount} {redemption.tokenId}
                      </p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold">Transaction</h3>
                      <p className="break-all">
                        {redemption.transactionId || 'Transaction pending'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {shippingInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        <p className="font-medium">
                          {shippingInfo.firstName} {shippingInfo.lastName}
                        </p>
                        <p>{shippingInfo.address}</p>
                        {shippingInfo.address2 && <p>{shippingInfo.address2}</p>}
                        <p>
                          {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zip}
                        </p>
                        <p>{shippingInfo.country}</p>
                        <p className="mt-2">{shippingInfo.email}</p>
                        <p>{shippingInfo.phone}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <Button asChild variant="outline">
                <Link href="/">
                  Continue Shopping
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}