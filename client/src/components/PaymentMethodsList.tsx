
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

export function PaymentMethodsList() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['paymentMethods', user?.uid],
    queryFn: () => fetch(`/api/payment-methods?firebaseId=${user?.uid}`).then(res => res.json()),
    enabled: !!user
  });

  if (isLoading) return <div>Loading payment methods...</div>;
  if (!data?.paymentMethods?.length) return <div>No payment methods found</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {data.paymentMethods.map((method: any) => (
            <li key={method.id} className="flex items-center gap-2">
              <span>•••• {method.card.last4}</span>
              <span className="text-muted-foreground">
                Expires {method.card.exp_month}/{method.card.exp_year}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
