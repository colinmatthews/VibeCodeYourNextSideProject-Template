import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getQueryFn, apiGet, apiPost, apiRequest, apiJson } from "../lib/queryClient";
import { useToast } from "./useToast";
import type { Subscription } from "@shared/schema";

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionStats {
  totalSubscriptions: number;
  totalMonthlyCost: string;
  totalAnnualCost: string;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

interface CreateSubscriptionData {
  merchantName: string;
  planName?: string;
  amount: string;
  currency?: string;
  billingCycle: 'monthly' | 'annual' | 'quarterly' | 'weekly';
  category?: string;
  firstBillingDate?: string;
  nextBillingDate?: string;
  trialEndDate?: string;
  status?: 'active' | 'trial' | 'cancelled' | 'paused';
  cancellationUrl?: string;
  notes?: string;
}

interface UpdateSubscriptionData {
  merchantName?: string;
  planName?: string;
  amount?: string;
  currency?: string;
  billingCycle?: 'monthly' | 'annual' | 'quarterly' | 'weekly';
  category?: string;
  nextBillingDate?: string;
  trialEndDate?: string;
  status?: 'active' | 'trial' | 'cancelled' | 'paused';
  cancelledDate?: string;
  accessEndsDate?: string;
  cancellationUrl?: string;
  notes?: string;
}

// ============================================================================
// SUBSCRIPTIONS HOOK
// ============================================================================

export function useSubscriptions(filters?: { status?: string; category?: string }) {
  const { user: firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query string from filters
  const queryString = filters
    ? new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v != null) as [string, string][]
      ).toString()
    : "";

  const queryKey = queryString
    ? [`/api/subscriptions?${queryString}`]
    : ["/api/subscriptions"];

  // Query: List all subscriptions
  const {
    data: subscriptions,
    isLoading,
    refetch,
  } = useQuery<Subscription[]>({
    queryKey,
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser?.uid,
  });

  // Query: Get statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<SubscriptionStats>({
    queryKey: ["/api/subscriptions/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser?.uid,
  });

  // Mutation: Create subscription
  const createSubscription = useMutation({
    mutationFn: async (data: CreateSubscriptionData) => {
      const response = await apiPost("/api/subscriptions", data);
      return await apiJson<Subscription>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription Added",
        description: "Your subscription has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add",
        description: error.message || "Failed to add subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation: Update subscription
  const updateSubscription = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSubscriptionData }) => {
      const response = await apiRequest("PATCH", `/api/subscriptions/${id}`, data);
      return await apiJson<Subscription>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation: Delete subscription
  const deleteSubscription = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/subscriptions/${id}`);
      return await apiJson(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription Deleted",
        description: "Your subscription has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      });
    },
  });

  // Mutation: Cancel subscription
  const cancelSubscription = useMutation({
    mutationFn: async ({ id, accessEndsDate }: { id: number; accessEndsDate?: string }) => {
      const response = await apiPost(`/api/subscriptions/${id}/cancel`, {
        accessEndsDate,
      });
      return await apiJson<Subscription>(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been marked as cancelled",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  return {
    // Data
    subscriptions: subscriptions ?? [],
    stats,

    // Loading states
    isLoading,
    isLoadingStats,

    // Mutations
    createSubscription: createSubscription.mutate,
    updateSubscription: updateSubscription.mutate,
    deleteSubscription: deleteSubscription.mutate,
    cancelSubscription: cancelSubscription.mutate,

    // Mutation states
    isCreating: createSubscription.isPending,
    isUpdating: updateSubscription.isPending,
    isDeleting: deleteSubscription.isPending,
    isCancelling: cancelSubscription.isPending,

    // Refresh
    refetch,
  };
}

// ============================================================================
// SINGLE SUBSCRIPTION HOOK
// ============================================================================

export function useSubscription(id: number) {
  const { user: firebaseUser } = useAuth();

  const { data: subscription, isLoading } = useQuery<Subscription>({
    queryKey: [`/api/subscriptions/${id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser?.uid && !!id,
  });

  return {
    subscription,
    isLoading,
  };
}
