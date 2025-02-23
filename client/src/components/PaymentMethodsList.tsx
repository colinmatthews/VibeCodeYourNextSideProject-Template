
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function AddPaymentMethodForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setProcessing(true);
    try {
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
      });

      if (error) {
        onError(error.message);
        return;
      }

      await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseId: user.uid,
          paymentMethodId: paymentMethod.id
        })
      });

      onSuccess();
    } catch (err) {
      onError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-3 border rounded" />
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? 'Processing...' : 'Add Payment Method'}
      </Button>
    </form>
  );
}

export function PaymentMethodsList() {
  const { user } = useAuth();
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['paymentMethods', user?.uid],
    queryFn: () => fetch(`/api/payment-methods?firebaseId=${user?.uid}`).then(res => res.json()),
    enabled: !!user
  });

  if (isLoading) return <div>Loading payment methods...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {data?.paymentMethods?.map((method) => (
            <li key={method.id} className="flex items-center gap-2">
              <span>•••• {method.card.last4}</span>
              <span className="text-muted-foreground">
                Expires {method.card.exp_month}/{method.card.exp_year}
              </span>
            </li>
          ))}
        </ul>
        
        <Button onClick={() => setShowAddPaymentMethod(true)}>
          Add Payment Method
        </Button>

        <Dialog open={showAddPaymentMethod} onOpenChange={setShowAddPaymentMethod}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <Elements stripe={stripePromise}>
              <AddPaymentMethodForm
                onSuccess={() => {
                  setShowAddPaymentMethod(false);
                  queryClient.invalidateQueries(['paymentMethods', user?.uid]);
                }}
                onError={(error) => {
                  console.error('Error adding payment method:', error);
                }}
              />
            </Elements>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
