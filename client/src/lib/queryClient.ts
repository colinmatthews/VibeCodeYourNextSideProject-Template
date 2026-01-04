import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    return {};
  }
  
  try {
    // Use cached token by default; refresh on 401 at call sites
    const token = await user.getIdToken();
    return {
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {};
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | FormData | undefined,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const headers = {
    ...authHeaders,
    // Don't set Content-Type for FormData - browser will set it with boundary
    ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}),
  };
  
  const res = await fetch(url, {
    method,
    headers,
    body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  if (res.status === 401 && auth.currentUser) {
    // Retry once with a forced refresh
    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      const retryRes = await fetch(url, {
        method,
        headers: {
          ...(data && !(data instanceof FormData) ? { "Content-Type": "application/json" } : {}),
          'Authorization': `Bearer ${freshToken}`
        },
        body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined),
        credentials: "include",
      });
      await throwIfResNotOk(retryRes);
      return retryRes;
    } catch (e) {
      // fallthrough to original error handling below
    }
  }

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

// Streaming-compatible fetch function that includes auth headers
export async function streamingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const authHeaders = await getAuthHeaders();

  const doFetch = async (extraHeaders: Record<string, string>) => {
    const mergedHeaders: Record<string, string> = {
      ...(init?.headers as Record<string, string> | undefined),
      ...extraHeaders,
    };
    return fetch(input as any, {
      ...init,
      headers: mergedHeaders,
      credentials: "include",
    });
  };

  let res = await doFetch(authHeaders);
  if (res.status === 401 && auth.currentUser) {
    try {
      const freshToken = await auth.currentUser.getIdToken(true);
      res = await doFetch({ Authorization: `Bearer ${freshToken}` });
    } catch {}
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(queryKey[0] as string, {
      headers: authHeaders,
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
