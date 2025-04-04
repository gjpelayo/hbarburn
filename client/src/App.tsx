import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { WalletContextProvider } from "./context/WalletContext";
import { RedemptionContextProvider } from "./context/RedemptionContext";
import { AdminProvider } from "./hooks/use-admin";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Shop from "@/pages/shop-fixed";
import OrderTrackingPage from "@/pages/order-tracking";
import AuthPage from "@/pages/auth-page";
import SessionTest from "@/pages/session-test";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import PhysicalItemsPage from "@/pages/admin/physical-items";
import PhysicalItemsFixedPage from "@/pages/admin/physical-items-fixed";
import PhysicalItemsBasicPage from "@/pages/admin/physical-items-basic";
import PhysicalItemsNewPage from "@/pages/admin/physical-items-new";
import PhysicalItemVariationsPage from "@/pages/admin/physical-item-variations";
import TokensPage from "@/pages/admin/tokens";
// Token configurations are now handled in the physical items page
import RedemptionsPage from "@/pages/admin/redemptions";
import ShopsPageNew from "@/pages/admin/shops-new-fixed";
import ShopItemsPage from "@/pages/admin/shop-items-fixed";
import PaymentMethodsPage from "@/pages/admin/payment-methods";
import ThemeSettingsPage from "@/pages/admin/theme-settings";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/shop/:shopId" component={Shop} />
      <Route path="/track" component={OrderTrackingPage} />
      <Route path="/track/:orderId" component={OrderTrackingPage} />
      <Route path="/session-test" component={SessionTest} />
      
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
            <PhysicalItemsBasicPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/physical-items-fixed">
        {() => (
          <ProtectedRoute>
            <PhysicalItemsFixedPage />
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
      <Route path="/admin/physical-items-new">
        {() => (
          <ProtectedRoute>
            <PhysicalItemsNewPage />
          </ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/physical-item-variations/:itemId">
        {() => (
          <ProtectedRoute>
            <PhysicalItemVariationsPage />
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
      {/* Token configurations route removed as it's now integrated with physical items */}
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
      <Route path="/admin/shops/:shopId/items">
        {() => (
          <ProtectedRoute>
            <ShopItemsPage />
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
      <Route path="/admin/theme-settings">
        {() => (
          <ProtectedRoute>
            <ThemeSettingsPage />
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
        <ThemeProvider>
          <WalletContextProvider>
            <RedemptionContextProvider>
              <Router />
              <Toaster />
            </RedemptionContextProvider>
          </WalletContextProvider>
        </ThemeProvider>
      </AdminProvider>
    </QueryClientProvider>
  );
}

export default App;