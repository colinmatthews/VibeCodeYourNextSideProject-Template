
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";

import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

function CheckoutForm({ onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
    });

    if (error) {
      onError(error.message);
    } else {
      onSuccess(paymentMethod);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CardElement className="p-3 border rounded" />
      <Button type="submit" disabled={!stripe} className="w-full">
        Confirm Payment
      </Button>
    </form>
  );
}

export default function Pricing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const { data: userData } = useQuery({
    queryKey: ['user', user?.uid],
    queryFn: () => fetch(`/api/users/${user?.uid}`).then(res => res.json()),
    enabled: !!user
  });

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
                <Check className="h-4 w-4" /> Up to 5 contacts
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
            {userData?.subscriptionType === 'free' && (
              <p className="text-sm text-muted-foreground">You're using this plan</p>
            )}
            <Button 
              className="w-full" 
              onClick={() => !user && setLocation("/login")}
            >
              {user ? 'Current Plan' : 'Get Started'}
            </Button>
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
                <Check className="h-4 w-4" /> Unlimited contacts
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
            {userData?.subscriptionType === 'pro' && (
              <p className="text-sm text-muted-foreground">You're using this plan</p>
            )}
            <Button 
              className="w-full" 
              onClick={async () => {
                console.log('[Pricing] Upgrade button clicked');
                if (!user) {
                  console.log('[Pricing] No user found, redirecting to login');
                  setLocation("/login");
                  return;
                }
                
                try {
                  console.log('[Pricing] Creating subscription for user:', user.uid);
                  setShowPaymentForm(true);
                  
                  const handlePayment = async (paymentMethod) => {
                    const response = await fetch('/api/create-subscription', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        firebaseId: user.uid,
                        paymentMethodId: paymentMethod.id
                      })
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to create subscription');
                    }

                    const data = await response.json();
                    console.log('[Pricing] Subscription created:', data);
                    handleSuccess();
                    setShowPaymentForm(false);
                  };

                  return (
                    <Elements stripe={stripePromise}>
                      <CheckoutForm 
                        onSuccess={handlePayment}
                        onError={(msg) => {
                          setShowPaymentForm(false);
                          handleError(msg);
                        }}
                      />
                    </Elements>
                  );

                  const { error } = await stripe.confirmCardPayment(clientSecret);
                  
                  if (error) {
                    throw error;
                  }
                  
                  handleSuccess();
                } catch (error: any) {
                  handleError(error.message);
                }
              }}
            >
              {user ? 'Upgrade' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
