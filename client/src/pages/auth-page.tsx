import { useLocation } from "wouter";
import { useAdmin } from "@/hooks/use-admin";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, LogIn } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(3, {
    message: "Username must be at least 3 characters",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters",
  }),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation } = useAdmin();
  
  // Redirect if user is already logged in
  if (user) {
    navigate("/admin");
    return null;
  }
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate(values, {
      onSuccess: () => {
        navigate("/admin");
      }
    });
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Login to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="admin" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Login
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <div className="hidden lg:flex flex-col justify-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Token Redemption Platform</h1>
            <p className="text-muted-foreground">
              Manage your token redemption platform. Configure physical items, token requirements, and track redemptions.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Manage Items</h3>
              <p className="text-sm text-muted-foreground">
                Create and configure physical items that can be redeemed with tokens.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Token Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Set up which tokens can be used to redeem physical items.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Redemption Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Track and manage token redemptions from users.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Shop Management</h3>
              <p className="text-sm text-muted-foreground">
                Create shops to showcase your redeemable physical items.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}