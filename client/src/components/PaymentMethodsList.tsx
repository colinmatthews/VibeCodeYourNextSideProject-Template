import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

interface PaymentMethodsListProps {
  onSelect?: (paymentMethodId: string) => void;
  onError?: (message: string) => void;
}

function AddPaymentMethodForm({ onSuccess, onError }: { onSuccess: () => void; onError: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Success",
        description: "Payment method added successfully"
      });

      queryClient.invalidateQueries({ queryKey: ['paymentMethods', user?.uid] });
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add payment method";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full mt-4"
      >
        {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        {isProcessing ? "Processing..." : "Add Payment Method"}
      </Button>
    </form>
  );
}

export function PaymentMethodsList({ onSelect, onError }: PaymentMethodsListProps) {
  const { user } = useAuth();
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [setupIntent, setSetupIntent] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['paymentMethods', user?.uid],
    queryFn: async () => {
      console.log("[PaymentMethods] Fetching payment methods for user:", user?.uid);
      const response = await fetch(`/api/payment-methods?firebaseId=${user?.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      const data = await response.json();
      return data as { paymentMethods: PaymentMethod[] };
    },
    enabled: !!user?.uid
  });

  const handleAddPaymentMethod = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "Please sign in to add a payment method",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firebaseId: user.uid })
      });

      if (!response.ok) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = await response.json();
      setSetupIntent(clientSecret);
      setShowAddPaymentMethod(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initialize payment setup";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      onError?.(message);
    }
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firebaseId: user?.uid })
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      await queryClient.invalidateQueries({ queryKey: ['paymentMethods', user?.uid] });
      toast({
        title: "Success",
        description: "Payment method removed successfully"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove payment method";
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {data?.paymentMethods?.map((method) => (
            <li key={method.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center gap-2">
                <span>•••• {method.card.last4}</span>
                <span className="text-muted-foreground">
                  Expires {method.card.exp_month}/{method.card.exp_year}
                </span>
              </div>
              <div className="flex gap-2">
                {onSelect && (
                  <Button
                    size="sm"
                    onClick={() => onSelect(method.id)}
                  >
                    Select
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePaymentMethod(method.id)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Button
          onClick={handleAddPaymentMethod}
          className="w-full"
        >
          Add Payment Method
        </Button>

        <Dialog open={showAddPaymentMethod} onOpenChange={setShowAddPaymentMethod}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            {setupIntent && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: setupIntent,
                  appearance: {
                    theme: 'stripe',
                  },
                }}
              >
                <AddPaymentMethodForm
                  onSuccess={() => {
                    setShowAddPaymentMethod(false);
                    setSetupIntent(null);
                  }}
                  onError={onError || (() => {})}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}