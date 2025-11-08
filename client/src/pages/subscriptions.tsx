import { useState } from "react";
import { useGmail } from "../hooks/useGmail";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { GmailConnect } from "../components/GmailConnect";
import { CostSummary } from "../components/CostSummary";
import { SubscriptionCard } from "../components/SubscriptionCard";
import { AddSubscriptionModal } from "../components/AddSubscriptionModal";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Loader2, Inbox } from "lucide-react";
import type { Subscription } from "@shared/schema";

// ============================================================================
// SUBSCRIPTIONS PAGE
// ============================================================================

export default function SubscriptionsPage() {
  const { isConnected } = useGmail();
  const { subscriptions, isLoading, deleteSubscription, cancelSubscription } =
    useSubscriptions();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter subscriptions by status
  const filteredSubscriptions =
    statusFilter === "all"
      ? subscriptions
      : subscriptions.filter((sub) => sub.status === statusFilter);

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this subscription?")) {
      deleteSubscription(id);
    }
  };

  const handleCancel = (id: number) => {
    if (
      confirm(
        "Mark this subscription as cancelled? You can still edit it later if needed."
      )
    ) {
      cancelSubscription({ id });
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all your digital subscriptions in one place
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Add Subscription
        </Button>
      </div>

      {/* Gmail Connection Card */}
      <GmailConnect />

      {/* Cost Summary - only show if connected */}
      {isConnected && <CostSummary />}

      {/* Subscriptions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Your Subscriptions</h2>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="trial">Trial</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredSubscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Inbox className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No subscriptions found</h3>
            <p className="text-muted-foreground max-w-sm mb-6">
              {!isConnected
                ? "Connect your Gmail account to automatically detect subscriptions, or add them manually."
                : statusFilter === "all"
                ? "Connect Gmail and scan your inbox to find subscriptions automatically."
                : `No ${statusFilter} subscriptions found.`}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Manually
              </Button>
            </div>
          </div>
        )}

        {/* Subscriptions Grid */}
        {!isLoading && filteredSubscriptions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSubscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onDelete={handleDelete}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
      />
    </div>
  );
}
