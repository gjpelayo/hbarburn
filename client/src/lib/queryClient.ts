import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  console.log(`Making ${method} request to ${url}`, data ? { data } : 'no data');
  
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  const options: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  };
  
  try {
    const res = await fetch(url, options);
    
    console.log(`Response from ${url}: ${res.status}`);
    
    // Get headers safely
    // This is compatible with browsers that don't support iterator on Headers
    const headerObj: Record<string, string> = {};
    const headerKeys = Array.from(res.headers.keys());
    headerKeys.forEach(key => {
      const value = res.headers.get(key);
      if (value) headerObj[key] = value;
    });
    console.log(`Response headers:`, headerObj);
    
    // Check if we have cookies
    console.log('Document cookies:', document.cookie);
                
    await throwIfResNotOk(res);
    const result = await res.json() as T;
    console.log(`Data received from ${url}:`, result);
    return result;
  } catch (error) {
    console.error(`Error in apiRequest to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    console.log(`Making query to ${url}`);
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });
      
      console.log(`Query response from ${url}: ${res.status}`);
      
      // Get headers safely 
      // This is compatible with browsers that don't support iterator on Headers
      const headerObj: Record<string, string> = {};
      const headerKeys = Array.from(res.headers.keys());
      headerKeys.forEach(key => {
        const value = res.headers.get(key);
        if (value) headerObj[key] = value;
      });
      console.log(`Response headers:`, headerObj);
      
      // Check if we have cookies
      console.log('Document cookies in query:', document.cookie);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized response (401) from ${url}, returning null as configured`);
        return null;
      }

      await throwIfResNotOk(res);
      const result = await res.json();
      console.log(`Query data received from ${url}:`, result);
      return result;
    } catch (error) {
      console.error(`Error in query to ${url}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
