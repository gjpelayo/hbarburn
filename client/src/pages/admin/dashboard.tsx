import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Coins, ShoppingCart, Users } from "lucide-react";
import type { PhysicalItem, Token, Redemption } from "@shared/schema";

export default function AdminDashboard() {
  // Load summary data from the API
  const { data: physicalItems = [] } = useQuery<PhysicalItem[]>({
    queryKey: ["/api/admin/physical-items"],
  });
  
  const { data: tokens = [] } = useQuery<Token[]>({
    queryKey: ["/api/admin/tokens"],
  });
  
  const { data: redemptions = [] } = useQuery<Redemption[]>({
    queryKey: ["/api/admin/redemptions"],
  });
  
  // Calculate summary statistics
  const pendingRedemptions = redemptions.filter(r => r.status === "pending").length;
  const completedRedemptions = redemptions.filter(r => r.status === "completed").length;
  const uniqueUsers = new Set(redemptions.map(r => r.accountId)).size;
  
  // Create metrics array for summary cards
  const metrics = [
    {
      title: "Total Physical Items",
      value: physicalItems.length,
      description: "Available for redemption",
      icon: <Package className="h-4 w-4 text-muted-foreground" />,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Supported Tokens",
      value: tokens.length,
      description: "Configurable for burn",
      icon: <Coins className="h-4 w-4 text-muted-foreground" />,
      color: "bg-indigo-100 text-indigo-700",
    },
    {
      title: "Total Redemptions",
      value: redemptions.length,
      description: `${pendingRedemptions} pending, ${completedRedemptions} completed`,
      icon: <ShoppingCart className="h-4 w-4 text-muted-foreground" />,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Unique Users",
      value: uniqueUsers,
      description: "Have made redemptions",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      color: "bg-purple-100 text-purple-700",
    },
  ];
  
  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${metric.color.split(' ')[0]} bg-opacity-10`}>
                {metric.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Redemptions</CardTitle>
          </CardHeader>
          <CardContent>
            {redemptions.length > 0 ? (
              <div className="space-y-4">
                {redemptions.slice(0, 5).map((redemption) => (
                  <div key={redemption.orderId} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">Order #{redemption.orderId.substring(0, 8)}</div>
                        <div className="text-sm text-muted-foreground">
                          Account: {redemption.accountId.substring(0, 8)}...
                        </div>
                      </div>
                      <div>
                        <span 
                          className={`text-xs font-medium rounded-full px-2.5 py-1 
                          ${redemption.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : redemption.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'}`}
                        >
                          {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm mt-1 break-words">
                      <span className="inline-block max-w-full overflow-hidden text-ellipsis">
                        {redemption.tokenId} → {redemption.amount} tokens burned
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No redemptions found.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Physical Items Available</CardTitle>
          </CardHeader>
          <CardContent>
            {physicalItems.length > 0 ? (
              <div className="space-y-4">
                {physicalItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-3 border rounded-lg p-3">
                    {item.imageUrl && (
                      <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden border">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {item.description ? (
                          item.description.length > 40 
                            ? `${item.description.substring(0, 40)}...` 
                            : item.description
                        ) : "No description"}
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap flex-shrink-0">
                      {/* Token cost and symbol would be added from token configurations */}
                      {(item as any).tokenCost && (
                        <>{(item as any).tokenCost} <span className="text-xs text-muted-foreground">{(item as any).tokenSymbol}</span></>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No physical items found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}