import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormValues = z.infer<typeof loginSchema>;

export default function AdminAuthPage() {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAdmin();
  
  // If user is already logged in, redirect to admin dashboard
  if (user) {
    navigate("/admin");
    return null;
  }
  
  // Create form
  const form = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  
  const onSubmit = (values: FormValues) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        navigate("/admin");
      },
    });
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
            <CardDescription>
              Sign in to manage your token redemption platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="********" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4">
            <p className="text-sm text-muted-foreground">
              Default login: admin / admin123
            </p>
          </CardFooter>
        </Card>
        
        <div className="hidden lg:flex flex-col justify-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Token Redemption Admin</h1>
            <p className="text-muted-foreground">
              Manage physical items, tokens, and redemption configurations. Monitor orders and update their status.
            </p>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Manage Physical Items</h3>
              <p className="text-sm text-muted-foreground">
                Add, edit, and remove physical items available for token redemption.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Configure Tokens</h3>
              <p className="text-sm text-muted-foreground">
                Set up which tokens can be burned to redeem specific physical items.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">Track Redemptions</h3>
              <p className="text-sm text-muted-foreground">
                View and manage all redemption orders. Update order status and verify transactions.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <h3 className="font-semibold">System Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Track token burn statistics and monitor platform performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}