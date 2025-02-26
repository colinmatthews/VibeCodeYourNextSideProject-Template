import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { PaymentMethodsList } from "@/components/PaymentMethodsList";
import { QueryClient } from "@tanstack/react-query";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');
console.log('[Stripe] Initializing with key:', import.meta.env.VITE_STRIPE_PUBLIC_KEY ? 'Key present' : 'Key missing');

interface CheckoutFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onError: (error: string) => void;
}

function CheckoutForm({ onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const result = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement)!,
      });

      if (result.error) {
        onError(result.error.message || "Failed to process payment");
        return;
      }

      if (!result.paymentMethod) {
        onError("No payment method created");
        return;
      }

      console.log('[Payment] Created payment method:', result.paymentMethod.id);
      onSuccess(result.paymentMethod.id);
    } catch (err) {
      console.error('[Payment] Error creating payment method:', err);
      onError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-3 border rounded" />
      <Button type="submit" disabled={!stripe || processing} className="w-full">
        {processing ? 'Processing...' : 'Confirm Payment'}
      </Button>
    </form>
  );
}

export default function Pricing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = new QueryClient();

  const { data: userData } = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user?.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      const data = await response.json();
      console.log('[Pricing] User data:', data);
      return data;
    },
    enabled: !!user
  });

  const isPro = userData?.subscriptionType === 'pro';

  const handleSuccess = () => {
    toast({
      title: "Success!",
      description: "Your subscription has been activated.",
    });
  };

  const handleError = (error: string) => {
    toast({
      title: "Error",
      description: error || "Payment failed. Please try again.",
      variant: "destructive",
    });
  };

  const handleSubscriptionCreation = async (paymentMethodId: string) => {
    try {
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      console.log('[Pricing] Creating subscription for user:', user.uid);
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseId: user.uid,
          paymentMethodId: paymentMethodId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();
      console.log('[Pricing] Received response from server:', data);

      if (data.status === 'active') {
        setShowPaymentForm(false);
        toast({
          title: "Success!",
          description: "Your subscription has been activated.",
        });
        queryClient.invalidateQueries({ queryKey: ['user', user.uid] });
      } else if (data.clientSecret) {
        const stripe = await stripePromise;
        if (!stripe) throw new Error('Stripe not initialized');

        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) {
          throw new Error(error.message);
        }

        setShowPaymentForm(false);
        toast({
          title: "Success!",
          description: "Your subscription has been activated.",
        });
        queryClient.invalidateQueries({ queryKey: ['user', user.uid] });
      }
    } catch (error) {
      console.error('[Pricing] Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const handleDowngrade = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch('/api/downgrade-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebaseId: user.uid })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to downgrade subscription');
      }

      toast({
        title: "Success!",
        description: "Your subscription has been downgraded to free plan.",
      });
      queryClient.invalidateQueries({ queryKey: ['user', user.uid] });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to downgrade subscription",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">Choose the plan that's right for you</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-2xl font-bold">$0/month</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Up to 50 items (not enforced in the template)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Basic search
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Email support
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {!isPro && (
              <p className="text-sm text-muted-foreground">You're using this plan</p>
            )}
            {isPro ? (
              <Button
                className="w-full"
                onClick={handleDowngrade}
                variant="outline"
              >
                Downgrade to Free
              </Button>
            ) : (
              <Button
                className="w-full"
                variant="secondary"
                disabled
              >
                Current Plan
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <p className="text-2xl font-bold">$10/month</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Unlimited items
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Advanced search
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Priority support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Custom tags
              </li>
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            {isPro && (
              <p className="text-sm text-muted-foreground">You're using this plan</p>
            )}
            {isPro ? (
              <Button
                className="w-full"
                variant="secondary"
                disabled
              >
                Current Plan
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  if (!user) {
                    setLocation("/login");
                    return;
                  }
                  setShowPaymentForm(true);
                }}
              >
                Upgrade to Pro
              </Button>
            )}

            {showPaymentForm && (
              <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Payment Methods</DialogTitle>
                    <DialogDescription>
                      Select or add a payment method to upgrade to Pro
                    </DialogDescription>
                  </DialogHeader>
                  <Elements stripe={stripePromise}>
                    <PaymentMethodsList
                      onSelect={handleSubscriptionCreation}
                      onError={handleError}
                    />
                  </Elements>
                </DialogContent>
              </Dialog>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}