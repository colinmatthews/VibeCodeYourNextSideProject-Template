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
}

export function PaymentMethodsList({ onSelect }: PaymentMethodsListProps) {
  const { user } = useAuth();
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [setupIntent, setSetupIntent] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['paymentMethods', user?.uid],
    queryFn: async () => {
      const response = await fetch(`/api/payment-methods?userId=${user?.uid}`);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      const text = await response.text();
      try {
        return JSON.parse(text) as { paymentMethods: PaymentMethod[] };
      } catch (e) {
        console.error('Failed to parse response:', text);
        throw new Error('Invalid response format from server');
      }
    },
    enabled: !!user?.uid
  });

  const handleAddPaymentMethod = async () => {
    try {
      const response = await fetch('/api/setup-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user?.uid })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Setup intent error response:', text);
        throw new Error('Failed to create setup intent');
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Invalid JSON response:', text);
        throw new Error('Invalid response format from server');
      }

      setSetupIntent(data.clientSecret);
      setShowAddPaymentMethod(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize payment setup",
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

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user?.uid })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Delete payment method error:', text);
        throw new Error('Failed to delete payment method');
      }

      await queryClient.invalidateQueries({ queryKey: ['paymentMethods', user?.uid] });
      toast({
        title: "Success",
        description: "Payment method removed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove payment method",
        variant: "destructive"
      });
    }
  };

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
              <Elements stripe={stripePromise} options={{ clientSecret: setupIntent }}>
                <AddPaymentMethodForm
                  onSuccess={() => {
                    setShowAddPaymentMethod(false);
                    setSetupIntent(null);
                    queryClient.invalidateQueries({ queryKey: ['paymentMethods', user?.uid] });
                  }}
                />
              </Elements>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setIsProcessing(true);
    try {
      const { error: submitError } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: window.location.href,
        }
      });

      if (submitError) {
        throw new Error(submitError.message);
      }

      toast({
        title: "Success",
        description: "Payment method added successfully"
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment method",
        variant: "destructive"
      });
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
        className="w-full"
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        {isProcessing ? "Processing..." : "Add Payment Method"}
      </Button>
    </form>
  );
}