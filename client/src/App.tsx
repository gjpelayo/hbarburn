import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WalletContextProvider } from "./context/WalletContext";
import { RedemptionContextProvider } from "./context/RedemptionContext";
import { AdminProvider } from "./hooks/use-admin";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import OrderTrackingPage from "@/pages/order-tracking";

// Admin pages
import AdminAuthPage from "@/pages/admin/auth-page";
import AdminDashboard from "@/pages/admin/dashboard";
import PhysicalItemsPage from "@/pages/admin/physical-items";
import TokensPage from "@/pages/admin/tokens";
import TokenConfigurationsPage from "@/pages/admin/token-configurations";
import RedemptionsPage from "@/pages/admin/redemptions";
import ShopsPage from "@/pages/admin/shops";
import PaymentMethodsPage from "@/pages/admin/payment-methods";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/shop/:shopId" component={Shop} />
      <Route path="/track" component={OrderTrackingPage} />
      <Route path="/track/:orderId" component={OrderTrackingPage} />
      
      {/* Admin Routes */}
      <Route path="/admin/auth" component={AdminAuthPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/physical-items" component={PhysicalItemsPage} />
      <Route path="/admin/tokens" component={TokensPage} />
      <Route path="/admin/token-configurations" component={TokenConfigurationsPage} />
      <Route path="/admin/redemptions" component={RedemptionsPage} />
      <Route path="/admin/shops" component={ShopsPage} />
      <Route path="/admin/payment-methods" component={PaymentMethodsPage} />
      
      {/* 404 Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider>
        <WalletContextProvider>
          <RedemptionContextProvider>
            <Router />
            <Toaster />
          </RedemptionContextProvider>
        </WalletContextProvider>
      </AdminProvider>
    </QueryClientProvider>
  );
}

export default App;
