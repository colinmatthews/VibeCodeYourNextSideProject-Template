import { useState } from "react";
import { useSubscriptions } from "../hooks/useSubscriptions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

// ============================================================================
// TYPES
// ============================================================================

interface AddSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BILLING_CYCLES = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
  { value: "quarterly", label: "Quarterly" },
  { value: "weekly", label: "Weekly" },
];

const CATEGORIES = [
  { value: "ai_tools", label: "AI Tools" },
  { value: "design", label: "Design" },
  { value: "video_editing", label: "Video Editing" },
  { value: "productivity", label: "Productivity" },
  { value: "analytics", label: "Analytics" },
  { value: "marketing", label: "Marketing" },
  { value: "development", label: "Development" },
  { value: "finance", label: "Finance" },
  { value: "entertainment", label: "Entertainment" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

// ============================================================================
// ADD SUBSCRIPTION MODAL
// ============================================================================

export function AddSubscriptionModal({ open, onOpenChange }: AddSubscriptionModalProps) {
  const { createSubscription, isCreating } = useSubscriptions();

  const [formData, setFormData] = useState({
    merchantName: "",
    planName: "",
    amount: "",
    billingCycle: "monthly" as const,
    category: "",
    nextBillingDate: "",
    trialEndDate: "",
    cancellationUrl: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.merchantName || !formData.amount) {
      return;
    }

    createSubscription(
      {
        merchantName: formData.merchantName,
        planName: formData.planName || undefined,
        amount: formData.amount,
        billingCycle: formData.billingCycle,
        category: formData.category || undefined,
        nextBillingDate: formData.nextBillingDate || undefined,
        trialEndDate: formData.trialEndDate || undefined,
        cancellationUrl: formData.cancellationUrl || undefined,
        notes: formData.notes || undefined,
      },
      {
        onSuccess: () => {
          // Reset form and close modal
          setFormData({
            merchantName: "",
            planName: "",
            amount: "",
            billingCycle: "monthly",
            category: "",
            nextBillingDate: "",
            trialEndDate: "",
            cancellationUrl: "",
            notes: "",
          });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>
            Manually add a subscription that wasn't auto-detected
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Merchant Name */}
          <div className="space-y-2">
            <Label htmlFor="merchantName">
              Service Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="merchantName"
              placeholder="Netflix, Spotify, etc."
              value={formData.merchantName}
              onChange={(e) =>
                setFormData({ ...formData, merchantName: e.target.value })
              }
              required
            />
          </div>

          {/* Plan Name */}
          <div className="space-y-2">
            <Label htmlFor="planName">Plan Name (optional)</Label>
            <Input
              id="planName"
              placeholder="Premium, Pro, Basic, etc."
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
            />
          </div>

          {/* Amount & Billing Cycle */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <Select
                value={formData.billingCycle}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, billingCycle: value })
                }
              >
                <SelectTrigger id="billingCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_CYCLES.map((cycle) => (
                    <SelectItem key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Next Billing Date */}
          <div className="space-y-2">
            <Label htmlFor="nextBillingDate">Next Billing Date (optional)</Label>
            <Input
              id="nextBillingDate"
              type="date"
              value={formData.nextBillingDate}
              onChange={(e) =>
                setFormData({ ...formData, nextBillingDate: e.target.value })
              }
            />
          </div>

          {/* Trial End Date */}
          <div className="space-y-2">
            <Label htmlFor="trialEndDate">Trial End Date (optional)</Label>
            <Input
              id="trialEndDate"
              type="date"
              value={formData.trialEndDate}
              onChange={(e) =>
                setFormData({ ...formData, trialEndDate: e.target.value })
              }
            />
          </div>

          {/* Cancellation URL */}
          <div className="space-y-2">
            <Label htmlFor="cancellationUrl">Cancellation URL (optional)</Label>
            <Input
              id="cancellationUrl"
              type="url"
              placeholder="https://..."
              value={formData.cancellationUrl}
              onChange={(e) =>
                setFormData({ ...formData, cancellationUrl: e.target.value })
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Adding..." : "Add Subscription"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
