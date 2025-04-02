import React, { ReactNode, useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Coins, 
  Settings, 
  ShoppingCart, 
  LogOut, 
  BarChart3,
  Home,
  CreditCard,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAdmin();
  const { disconnectWallet } = useWallet();
  const [collapsed, setCollapsed] = useState(false);
  
  // Store collapsed state in localStorage
  useEffect(() => {
    const storedState = localStorage.getItem('adminSidebarCollapsed');
    if (storedState !== null) {
      setCollapsed(storedState === 'true');
    }
  }, []);
  
  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('adminSidebarCollapsed', String(newState));
  };
  
  const handleLogout = () => {
    // First disconnect the wallet
    disconnectWallet();
    
    // Then log out from the admin system
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Navigate to the home page after logout
        navigate("/");
      },
      onError: () => {
        // If there's an error with the admin logout, still navigate to home
        // since the wallet has been disconnected
        navigate("/");
      }
    });
  };
  
  const navigationItems = [
    { label: "Dashboard", icon: <BarChart3 className="h-4 w-4" />, href: "/admin" },
    { label: "Physical Items", icon: <Package className="h-4 w-4" />, href: "/admin/physical-items" },
    { label: "Tokens", icon: <Coins className="h-4 w-4" />, href: "/admin/tokens" },
    { label: "Token Configs", icon: <Settings className="h-4 w-4" />, href: "/admin/token-configurations" },
    { label: "Redemptions", icon: <ShoppingCart className="h-4 w-4" />, href: "/admin/redemptions" },
    { label: "Shops", icon: <Store className="h-4 w-4" />, href: "/admin/shops" },
    { label: "Payment Methods", icon: <CreditCard className="h-4 w-4" />, href: "/admin/payment-methods" },
  ];
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`${collapsed ? 'w-[60px]' : 'w-64'} bg-card shadow-md border-r transition-all duration-300 flex flex-col z-10`}
      >
        <div className="flex items-center justify-center p-4 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={toggleSidebar}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="py-4 flex-grow overflow-y-auto">
          <nav className="space-y-1 px-1">
            {navigationItems.map((item) => (
              <div key={item.href}>
                <Link href={item.href}>
                  <div 
                    className={`cursor-pointer justify-center flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                      location === item.href 
                        ? "bg-primary text-primary-foreground" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                    title={item.label}
                  >
                    {React.cloneElement(item.icon as React.ReactElement, { className: "h-5 w-5" })}
                  </div>
                </Link>
              </div>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto py-4 border-t flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary p-1.5 rounded-full" title={user?.username || 'Admin'}>
            <span className="font-medium text-xs">{(user?.username && typeof user.username === 'string') ? user.username.charAt(0).toUpperCase() : 'A'}</span>
          </div>
              
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/")}
            title="Front-end"
          >
            <Home className="h-4 w-4" />
          </Button>
              
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Expanded sidebar overlay */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-0"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Expanded sidebar content */}
      {!collapsed && (
        <div 
          className="absolute left-[60px] top-0 w-56 h-screen bg-card shadow-lg border-r z-20 flex flex-col"
        >
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">Token Platform</p>
          </div>
          
          <div className="py-4 flex-grow overflow-y-auto">
            <nav className="space-y-1 px-2">
              {navigationItems.map((item) => (
                <div key={item.href}>
                  <Link href={item.href}>
                    <div 
                      className={`cursor-pointer flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                        location === item.href 
                          ? "bg-primary text-primary-foreground" 
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <div className="mr-2">
                        {React.cloneElement(item.icon as React.ReactElement, { className: "h-4 w-4" })}
                      </div>
                      {item.label}
                    </div>
                  </Link>
                </div>
              ))}
            </nav>
          </div>
          
          <div className="mt-auto p-4 border-t">
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <div className="bg-primary/10 text-primary p-1.5 rounded-full">
                  <span className="font-medium text-xs">{(user?.username && typeof user.username === 'string') ? user.username.charAt(0).toUpperCase() : 'A'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.username || 'Admin User'}</p>
                  <p className="text-xs text-muted-foreground truncate">Admin</p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate("/")}
                >
                  <Home className="h-4 w-4 mr-1" />
                  Front-end
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 px-6 py-4 border-b flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          {/* We can add additional header controls here if needed */}
        </header>
        
        <main className="flex-1 overflow-auto p-6 bg-muted/30 max-w-full">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}