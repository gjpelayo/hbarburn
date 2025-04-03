import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WalletContextProvider } from "./context/WalletContext";
import { RedemptionContextProvider } from "./context/RedemptionContext";
import { AdminProvider } from "./hooks/use-admin";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop";
import OrderTrackingPage from "@/pages/order-tracking";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import PhysicalItemsPage from "@/pages/admin/physical-items";
import PhysicalItemsSimplifiedPage from "@/pages/admin/physical-items-simplified";
import TokensPage from "@/pages/admin/tokens";
import TokenConfigurationsPage from "@/pages/admin/token-configurations";
import RedemptionsPage from "@/pages/admin/redemptions";
import ShopsPageNew from "@/pages/admin/shops-new-fixed";
import PaymentMethodsPage from "@/pages/admin/payment-methods";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/shop/:shopId" component={Shop} />
      <Route path="/track" component={OrderTrackingPage} />
      <Route path="/track/:orderId" component={OrderTrackingPage} />
      
      {/* Admin Routes - All protected by ProtectedRoute component */}
      <Route path="/admin">
        {() => (
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/physical-items">
        {() => (
          <ProtectedRoute>
            <PhysicalItemsSimplifiedPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/physical-items-original">
        {() => (
          <ProtectedRoute>
            <PhysicalItemsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/tokens">
        {() => (
          <ProtectedRoute>
            <TokensPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/token-configurations">
        {() => (
          <ProtectedRoute>
            <TokenConfigurationsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/redemptions">
        {() => (
          <ProtectedRoute>
            <RedemptionsPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/shops">
        {() => (
          <ProtectedRoute>
            <ShopsPageNew />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/payment-methods">
        {() => (
          <ProtectedRoute>
            <PaymentMethodsPage />
          </ProtectedRoute>
        )}
      </Route>
      
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