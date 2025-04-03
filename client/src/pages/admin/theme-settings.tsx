import React from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/context/ThemeContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { TokenThemeSelector } from "@/components/ui/token-theme-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export default function ThemeSettingsPage() {
  const { theme, setTheme, tokenTheme } = useTheme();
  const { data: tokens = [] } = useQuery<any[]>({
    queryKey: ['/api/tokens'],
  });

  // Find the current token for display
  const selectedToken = tokens.find(token => token.tokenId === tokenTheme);

  return (
    <AdminLayout title="Theme Settings">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Theme</CardTitle>
            <CardDescription>
              Customize the appearance of the TokenBurn platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="appearance">
              <TabsList className="mb-4">
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="token-theme">Token Theme</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appearance" className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Color Mode</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Choose between light, dark, or system preference
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <RadioGroup 
                      defaultValue={theme} 
                      onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
                      className="flex items-center space-x-2"
                    >
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="light" id="light" />
                        <Label htmlFor="light">Light</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="dark" id="dark" />
                        <Label htmlFor="dark">Dark</Label>
                      </div>
                      <div className="flex items-center space-x-1">
                        <RadioGroupItem value="system" id="system" />
                        <Label htmlFor="system">System</Label>
                      </div>
                    </RadioGroup>
                    <ThemeToggle />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Preview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Light Mode</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-white p-4 rounded-md border">
                          <div className="h-8 w-20 rounded bg-primary mb-2"></div>
                          <div className="h-4 w-32 rounded bg-muted mb-2"></div>
                          <div className="h-4 w-40 rounded bg-muted"></div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle>Dark Mode</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-black p-4 rounded-md border">
                          <div className="h-8 w-20 rounded bg-primary mb-2"></div>
                          <div className="h-4 w-32 rounded bg-muted mb-2"></div>
                          <div className="h-4 w-40 rounded bg-muted"></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="token-theme" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Token-Based Theming</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select a token to dynamically theme the application based on its identity
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <TokenThemeSelector />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Current Token Theme</h3>
                    
                    {selectedToken ? (
                      <div className="p-6 border rounded-md bg-card">
                        <div className="flex items-center gap-4 mb-4">
                          <div 
                            className="w-12 h-12 rounded-full" 
                            style={{ backgroundColor: 'var(--token-color)' }}
                          ></div>
                          <div>
                            <h4 className="font-medium">{selectedToken.name}</h4>
                            <p className="text-sm text-muted-foreground">{selectedToken.symbol}</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Primary</div>
                            <div 
                              className="h-8 rounded" 
                              style={{ backgroundColor: 'var(--token-color)' }}
                            ></div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Light Variant</div>
                            <div 
                              className="h-8 rounded" 
                              style={{ backgroundColor: 'var(--token-color-light)' }}
                            ></div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Dark Variant</div>
                            <div 
                              className="h-8 rounded" 
                              style={{ backgroundColor: 'var(--token-color-dark)' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border rounded-md bg-card">
                        <p className="text-muted-foreground">Using default theme (no token selected)</p>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Primary</div>
                            <div className="h-8 rounded bg-primary"></div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Light Variant</div>
                            <div className="h-8 rounded bg-primary/25"></div>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-muted-foreground">Dark Variant</div>
                            <div className="h-8 rounded bg-primary/75"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Token Theme Examples</h3>
                    <div className="space-y-2">
                      <div className="p-4 border rounded-md token-primary">
                        <h4 className="font-medium text-white mb-2">Primary Background</h4>
                        <p className="text-sm text-white/90">
                          This background color changes based on the selected token
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-md token-border">
                        <h4 className="font-medium token-text mb-2">Token Text Color</h4>
                        <p className="text-sm">
                          This text color changes based on the selected token
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}