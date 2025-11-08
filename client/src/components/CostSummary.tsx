import { useSubscriptions } from "../hooks/useSubscriptions";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { DollarSign, TrendingUp, CreditCard, Loader2 } from "lucide-react";

// ============================================================================
// COST SUMMARY COMPONENT
// ============================================================================

export function CostSummary() {
  const { stats, isLoadingStats } = useSubscriptions({ status: "active" });

  if (isLoadingStats || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Monthly Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalMonthlyCost}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalSubscriptions} active subscription{stats.totalSubscriptions !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Annual Cost */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Annual Cost</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats.totalAnnualCost}</div>
          <p className="text-xs text-muted-foreground mt-1">
            ${(parseFloat(stats.totalMonthlyCost) * 12).toFixed(2)} if all monthly
          </p>
        </CardContent>
      </Card>

      {/* Active Subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSubscriptions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.keys(stats.byCategory).length} categories
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
