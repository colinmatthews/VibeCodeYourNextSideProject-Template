import type { Subscription } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, XCircle, ExternalLink } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionCardProps {
  subscription: Subscription;
  onEdit?: (subscription: Subscription) => void;
  onDelete?: (id: number) => void;
  onCancel?: (id: number) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCategoryLabel(category: string | null): string {
  if (!category) return "Other";

  const labels: Record<string, string> = {
    ai_tools: "AI Tools",
    design: "Design",
    video_editing: "Video Editing",
    productivity: "Productivity",
    analytics: "Analytics",
    marketing: "Marketing",
    development: "Development",
    finance: "Finance",
    entertainment: "Entertainment",
    education: "Education",
    other: "Other",
  };

  return labels[category] || category;
}

function getBillingCycleLabel(cycle: string): string {
  const labels: Record<string, string> = {
    monthly: "Monthly",
    annual: "Annual",
    quarterly: "Quarterly",
    weekly: "Weekly",
  };
  return labels[cycle] || cycle;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    active: "default",
    trial: "secondary",
    cancelled: "destructive",
    paused: "outline",
  };
  return variants[status] || "default";
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString();
}

// ============================================================================
// SUBSCRIPTION CARD COMPONENT
// ============================================================================

export function SubscriptionCard({
  subscription,
  onEdit,
  onDelete,
  onCancel,
}: SubscriptionCardProps) {
  const isActive = subscription.status === "active" || subscription.status === "trial";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {subscription.logoUrl ? (
                <img
                  src={subscription.logoUrl}
                  alt={subscription.merchantName}
                  className="h-8 w-8 rounded object-contain"
                />
              ) : (
                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                  {subscription.merchantName.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{subscription.merchantName}</h3>
                {subscription.planName && (
                  <p className="text-xs text-muted-foreground truncate">
                    {subscription.planName}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(subscription)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {subscription.cancellationUrl && (
                <DropdownMenuItem
                  onClick={() => window.open(subscription.cancellationUrl || "", "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Cancel Page
                </DropdownMenuItem>
              )}
              {isActive && onCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancel(subscription.id)}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Mark as Cancelled
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(subscription.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-2">
          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">
              {subscription.currency === "USD" ? "$" : subscription.currency}
              {subscription.amount}
            </span>
            <span className="text-sm text-muted-foreground">
              / {getBillingCycleLabel(subscription.billingCycle)}
            </span>
          </div>

          {/* Status & Category */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusVariant(subscription.status)}>
              {subscription.status}
            </Badge>
            {subscription.category && (
              <Badge variant="outline">{getCategoryLabel(subscription.category)}</Badge>
            )}
            {subscription.confidence && subscription.confidence !== "high" && (
              <Badge variant="secondary" className="text-xs">
                {subscription.confidence} confidence
              </Badge>
            )}
          </div>

          {/* Dates */}
          <div className="text-xs text-muted-foreground space-y-1 pt-1">
            {subscription.trialEndDate && subscription.status === "trial" && (
              <div>
                Trial ends: <span className="font-medium">{formatDate(subscription.trialEndDate)}</span>
              </div>
            )}
            {subscription.nextBillingDate && isActive && (
              <div>
                Next billing: <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
              </div>
            )}
            {subscription.cancelledDate && (
              <div>
                Cancelled: <span className="font-medium">{formatDate(subscription.cancelledDate)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {subscription.notes && (
            <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
              {subscription.notes}
            </p>
          )}
        </div>
      </CardContent>

      {!subscription.isManualEntry && (
        <CardFooter className="bg-muted/50 py-2 text-xs text-muted-foreground">
          Auto-detected from email
        </CardFooter>
      )}
    </Card>
  );
}
