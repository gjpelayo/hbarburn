import { ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
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
  Store
} from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAdmin();
  
  // If user is not logged in, redirect to admin login page
  if (!user) {
    navigate("/admin/auth");
    return null;
  }
  
  // If user is not an admin, redirect to home
  if (!user.isAdmin) {
    navigate("/");
    return null;
  }
  
  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate("/admin/auth");
      },
    });
  };
  
  const navigationItems = [
    { label: "Dashboard", icon: <BarChart3 className="h-4 w-4 mr-2" />, href: "/admin" },
    { label: "Physical Items", icon: <Package className="h-4 w-4 mr-2" />, href: "/admin/physical-items" },
    { label: "Tokens", icon: <Coins className="h-4 w-4 mr-2" />, href: "/admin/tokens" },
    { label: "Token Configs", icon: <Settings className="h-4 w-4 mr-2" />, href: "/admin/token-configurations" },
    { label: "Redemptions", icon: <ShoppingCart className="h-4 w-4 mr-2" />, href: "/admin/redemptions" },
    { label: "Shops", icon: <Store className="h-4 w-4 mr-2" />, href: "/admin/shops" },
    { label: "Payment Methods", icon: <CreditCard className="h-4 w-4 mr-2" />, href: "/admin/payment-methods" },
  ];
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-card shadow-md border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Token Redemption Platform</p>
        </div>
        
        <div className="py-4">
          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  location === item.href 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}>
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="mt-auto p-4 border-t">
          <div className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <div className="bg-primary/10 text-primary p-1.5 rounded-full">
                <span className="font-medium text-xs">{user.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
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
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 px-6 py-4 border-b">
          <h1 className="text-2xl font-bold">{title}</h1>
        </header>
        
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}