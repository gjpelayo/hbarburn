import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, ShieldX, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/context/WalletContext";

export default function SessionTest() {
  const { connectWallet, isConnected, accountId, authenticateWithSignature } = useWallet();
  const { user, isLoading, isAdmin, logout } = useAuth();
  const [isSigningMessage, setIsSigningMessage] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [testCookieInfo, setTestCookieInfo] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Test wallet connection and signature-based auth
  const handleWalletConnect = async () => {
    try {
      await connectWallet("walletconnect");
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const handleSignMessage = async () => {
    if (!accountId) {
      console.error("No account ID - connect wallet first");
      return;
    }
    
    try {
      setIsSigningMessage(true);
      await authenticateWithSignature();
      setIsSigningMessage(false);
    } catch (error) {
      console.error("Error signing message:", error);
      setIsSigningMessage(false);
    }
  };

  // Test cookie functionality
  const handleSetTestCookie = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/test-cookie");
      const data = await res.json();
      console.log("Set test cookie response:", data);
      checkTestCookie();
    } catch (error) {
      console.error("Error setting test cookie:", error);
    }
  };

  const checkTestCookie = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/check-test-cookie");
      const data = await res.json();
      setTestCookieInfo(data);
    } catch (error) {
      console.error("Error checking test cookie:", error);
    }
  };

  // Check session status
  const checkSessionStatus = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/session-status");
      const data = await res.json();
      setSessionInfo(data);
    } catch (error) {
      console.error("Error checking session status:", error);
    }
  };

  // Get full debug info
  const getFullDebugInfo = async () => {
    try {
      const res = await apiRequest("GET", "/api/auth/debug");
      const data = await res.json();
      setDebugInfo(data);
    } catch (error) {
      console.error("Error getting debug info:", error);
    }
  };

  // Check these on component mount
  useEffect(() => {
    checkSessionStatus();
    checkTestCookie();
    getFullDebugInfo();
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-8">Session & Authentication Testing</h1>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Session Status</TabsTrigger>
          <TabsTrigger value="wallet">Wallet Auth</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>
        
        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Session Status
                {user ? 
                  <ShieldCheck className="text-green-500" /> : 
                  <ShieldX className="text-red-500" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div>
                  <p><strong>Auth Status:</strong> {user ? 'authenticated' : 'unauthenticated'}</p>
                  <p><strong>Connected Account:</strong> {accountId || 'Not connected'}</p>
                  <p><strong>User ID:</strong> {user?.id || 'Not authenticated'}</p>
                  <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={checkSessionStatus}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Session Info
                  </Button>
                  {user && (
                    <Button variant="destructive" onClick={logout}>Logout</Button>
                  )}
                </div>
                
                {sessionInfo && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Session Details:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(sessionInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-2">
                  <Button onClick={handleWalletConnect} disabled={isConnected}>
                    {isLoading ? 'Connecting...' : isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                  </Button>
                  
                  <Button 
                    onClick={handleSignMessage} 
                    disabled={!accountId || isSigningMessage}
                  >
                    {isSigningMessage ? 'Waiting for signature...' : 'Sign Authentication Message'}
                  </Button>
                </div>
                
                {accountId && (
                  <div className="mt-2">
                    <p><strong>Connected Account:</strong> {accountId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cookies" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cookie Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-2">
                  <Button onClick={handleSetTestCookie}>
                    <Send className="mr-2 h-4 w-4" />
                    Set Test Cookie
                  </Button>
                  <Button onClick={checkTestCookie}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check Test Cookie
                  </Button>
                </div>
                
                {testCookieInfo && (
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Cookie Status:</h3>
                    <p><strong>Test Cookie Exists:</strong> {testCookieInfo.cookieExists ? 'Yes' : 'No'}</p>
                    <p><strong>Test Cookie Value:</strong> {testCookieInfo.cookieValue || 'N/A'}</p>
                    <p><strong>Session ID:</strong> {testCookieInfo.sessionID || 'N/A'}</p>
                    
                    <h3 className="text-lg font-medium mt-4 mb-2">Cookie Headers:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(testCookieInfo.headers?.cookie || 'No cookie header', null, 2)}
                    </pre>
                    
                    <h3 className="text-lg font-medium mt-4 mb-2">All Cookies:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(testCookieInfo.allCookies, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Full Session Debug Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-2">
                  <Button onClick={getFullDebugInfo}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Debug Info
                  </Button>
                </div>
                
                {debugInfo && (
                  <div className="mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Session Status:</h3>
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>Session ID:</strong> {debugInfo.sessionID}</li>
                          <li><strong>Authenticated:</strong> {debugInfo.authenticated ? 'Yes' : 'No'}</li>
                          <li><strong>Has Session User:</strong> {debugInfo.session.hasUser ? 'Yes' : 'No'}</li>
                          <li><strong>Is Logged In:</strong> {debugInfo.session.isLoggedIn ? 'Yes' : 'No'}</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-2">User Information:</h3>
                        {debugInfo.user ? (
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>User ID:</strong> {debugInfo.user.id}</li>
                            <li><strong>Username:</strong> {debugInfo.user.username}</li>
                            <li><strong>Account ID:</strong> {debugInfo.user.accountId}</li>
                            <li><strong>Is Admin:</strong> {debugInfo.user.isAdmin ? 'Yes' : 'No'}</li>
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">No authenticated user</p>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium mt-6 mb-2">Cookie Header:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(debugInfo.headers.cookie || 'No cookie header', null, 2)}
                    </pre>
                    
                    <h3 className="text-lg font-medium mt-4 mb-2">All Cookies:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(debugInfo.cookies, null, 2)}
                    </pre>
                    
                    <h3 className="text-lg font-medium mt-4 mb-2">Session Cookie Settings:</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-auto">
                      {JSON.stringify(debugInfo.session.cookie, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}