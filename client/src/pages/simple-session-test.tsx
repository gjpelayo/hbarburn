import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function SimpleSessionTest() {
  const [testCookieStatus, setTestCookieStatus] = useState<any>(null);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Test cookie functionality 
  const handleSetTestCookie = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/api/auth/test-cookie");
      const data = await res.json();
      console.log("Set test cookie response:", data);
      await checkTestCookie();
    } catch (error) {
      console.error("Error setting test cookie:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkTestCookie = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/api/auth/check-test-cookie");
      const data = await res.json();
      setTestCookieStatus(data);
    } catch (error) {
      console.error("Error checking test cookie:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check session status
  const checkSessionStatus = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/api/auth/session-status");
      const data = await res.json();
      setSessionStatus(data);
    } catch (error) {
      console.error("Error checking session status:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <h1 className="text-4xl font-bold mb-8">Simple Session Testing</h1>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={checkSessionStatus}
              disabled={loading}
              className="mb-4"
            >
              Check Session Status
            </Button>
            
            {sessionStatus && (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Session Information:</h3>
                <pre className="overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(sessionStatus, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cookie Testing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button 
                onClick={handleSetTestCookie}
                disabled={loading}
              >
                Set Test Cookie
              </Button>
              <Button 
                onClick={checkTestCookie}
                disabled={loading}
              >
                Check Test Cookie
              </Button>
            </div>
            
            {testCookieStatus && (
              <div className="bg-muted p-4 rounded-md">
                <h3 className="text-lg font-medium mb-2">Cookie Status:</h3>
                <p><strong>Cookie Exists:</strong> {testCookieStatus.cookieExists ? 'Yes' : 'No'}</p>
                <p><strong>Cookie Value:</strong> {testCookieStatus.cookieValue || 'N/A'}</p>
                <p><strong>Session ID:</strong> {testCookieStatus.sessionID || 'N/A'}</p>
                
                <h3 className="text-lg font-medium mt-4 mb-2">Cookie Details:</h3>
                <pre className="overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(testCookieStatus, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}