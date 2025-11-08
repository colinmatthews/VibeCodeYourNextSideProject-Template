import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getQueryFn, apiGet, apiPost, apiJson } from "../lib/queryClient";
import { useToast } from "./useToast";

// ============================================================================
// TYPES
// ============================================================================

interface GmailStatus {
  connected: boolean;
  lastScan: string | null;
}

interface GmailAuthUrl {
  authUrl: string;
}

interface ScanResult {
  success: boolean;
  totalEmails: number;
  processed: number;
  newSubscriptions: number;
}

// ============================================================================
// GMAIL CONNECTION HOOK
// ============================================================================

export function useGmail() {
  const { user: firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query: Get Gmail connection status
  const {
    data: status,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser?.uid,
  });

  // Mutation: Get OAuth URL and redirect
  const connectGmail = useMutation({
    mutationFn: async () => {
      const response = await apiGet("/api/gmail/connect");
      const data = await apiJson<GmailAuthUrl>(response);
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Google OAuth page
      window.location.href = data.authUrl;
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Gmail",
        variant: "destructive",
      });
    },
  });

  // Mutation: Disconnect Gmail
  const disconnectGmail = useMutation({
    mutationFn: async () => {
      const response = await apiPost("/api/gmail/disconnect");
      return await apiJson(response);
    },
    onSuccess: () => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });

      toast({
        title: "Gmail Disconnected",
        description: "Your Gmail account has been disconnected successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect Gmail",
        variant: "destructive",
      });
    },
  });

  // Mutation: Scan inbox for subscriptions
  const scanInbox = useMutation({
    mutationFn: async () => {
      const response = await apiPost("/api/gmail/scan");
      return await apiJson<ScanResult>(response);
    },
    onSuccess: (data) => {
      // Refresh subscriptions list
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });

      toast({
        title: "Scan Complete!",
        description: `Found ${data.newSubscriptions} new subscriptions from ${data.totalEmails} emails`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan Gmail inbox",
        variant: "destructive",
      });
    },
  });

  return {
    // Status
    status,
    isConnected: status?.connected ?? false,
    lastScan: status?.lastScan ? new Date(status.lastScan) : null,
    isLoadingStatus,

    // Mutations
    connectGmail: connectGmail.mutate,
    disconnectGmail: disconnectGmail.mutate,
    scanInbox: scanInbox.mutate,

    // Loading states
    isConnecting: connectGmail.isPending,
    isDisconnecting: disconnectGmail.isPending,
    isScanning: scanInbox.isPending,

    // Refresh
    refetchStatus,
  };
}
