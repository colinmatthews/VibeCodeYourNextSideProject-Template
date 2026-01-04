import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | FormData | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {
    // Don't set Content-Type for FormData - browser will set it with boundary
    ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}),
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Convenience methods
export async function apiGet(url: string): Promise<Response> {
  return apiRequest('GET', url);
}

export async function apiPost(url: string, data?: unknown | FormData): Promise<Response> {
  return apiRequest('POST', url, data);
}

export async function apiPut(url: string, data?: unknown): Promise<Response> {
  return apiRequest('PUT', url, data);
}

export async function apiPatch(url: string, data?: unknown): Promise<Response> {
  return apiRequest('PATCH', url, data);
}

export async function apiDelete(url: string): Promise<Response> {
  return apiRequest('DELETE', url);
}

// Helper to get JSON response
export async function apiJson<T>(response: Response): Promise<T> {
  return response.json();
}

// Streaming-compatible fetch function that includes cookies
export async function streamingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const mergedHeaders: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  return fetch(input as any, {
    ...init,
    headers: mergedHeaders,
    credentials: "include",
  });
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
