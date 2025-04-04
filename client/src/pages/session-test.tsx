import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

export default function SessionTest() {
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [cookieTest, setCookieTest] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/auth/session-status');
      const data = await response.json();
      console.log('Session status:', data);
      setSessionStatus(data);
      toast({
        title: 'Session Status Checked',
        description: `Authenticated: ${data.authenticated}`,
      });
    } catch (error) {
      console.error('Error checking session:', error);
      toast({
        title: 'Error Checking Session',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const setTestCookie = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/auth/test-cookie');
      const data = await response.json();
      console.log('Set cookie response:', data);
      toast({
        title: 'Test Cookie Set',
        description: data.message,
      });
    } catch (error) {
      console.error('Error setting test cookie:', error);
      toast({
        title: 'Error Setting Cookie',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkTestCookie = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', '/api/auth/check-test-cookie');
      const data = await response.json();
      console.log('Check cookie response:', data);
      setCookieTest(data);
      toast({
        title: 'Cookie Check',
        description: data.cookieExists 
          ? `Cookie found: ${data.cookieValue}` 
          : 'Cookie not found',
        variant: data.cookieExists ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Error checking test cookie:', error);
      toast({
        title: 'Error Checking Cookie',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Report document cookies on load
  useEffect(() => {
    console.log('Document cookies:', document.cookie);
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Session & Cookie Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>Check the current session status from the server</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionStatus ? (
              <div className="space-y-2">
                <p><strong>Authenticated:</strong> {sessionStatus.authenticated ? 'Yes' : 'No'}</p>
                <p><strong>Session ID:</strong> {sessionStatus.sessionID || 'None'}</p>
                <p><strong>User ID:</strong> {sessionStatus.userID || 'None'}</p>
                <p><strong>Account ID:</strong> {sessionStatus.accountId || 'None'}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Click the button below to check session status</p>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={checkSession} disabled={loading}>
              {loading ? 'Checking...' : 'Check Session Status'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookie Test</CardTitle>
            <CardDescription>Test setting and checking a cookie</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">1. Set a test cookie</h4>
                <Button onClick={setTestCookie} variant="outline" disabled={loading}>
                  {loading ? 'Setting...' : 'Set Test Cookie'}
                </Button>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">2. Check if test cookie exists</h4>
                <Button onClick={checkTestCookie} variant="outline" disabled={loading}>
                  {loading ? 'Checking...' : 'Check Test Cookie'}
                </Button>
                
                {cookieTest && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <p><strong>Cookie Exists:</strong> {cookieTest.cookieExists ? 'Yes' : 'No'}</p>
                    {cookieTest.cookieExists && (
                      <p><strong>Value:</strong> {cookieTest.cookieValue}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Document cookies: {document.cookie || '(none)'}
            </p>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Debug Information</h2>
        <div className="bg-muted p-4 rounded-md">
          <pre className="text-xs overflow-auto">
            {JSON.stringify({
              sessionStatus,
              cookieTest,
              documentCookies: document.cookie,
            }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}