import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { apiPost, apiJson, getQueryFn } from "@/lib/queryClient";

async function createCheckoutSession(): Promise<{ url: string }> {
  const response = await apiPost('/api/create-checkout-session', {
    mode: 'subscription',
  });
  return apiJson<{ url: string }>(response);
}

async function createPortalSession(): Promise<{ url: string }> {
  const response = await apiPost('/api/create-portal-session', {});
  return apiJson<{ url: string }>(response);
}

function Pricing() {
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Get URL params to handle success/cancel states
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. Welcome to Pro!",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (canceled === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. You can try again anytime.",
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/users/profile'],
    queryFn: getQueryFn<any>({ on401: "returnNull" }),
    enabled: !!user?.id
  });

  // Checkout session mutation
  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      console.log('[Pricing] Redirecting to checkout:', data.url);
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      console.error('[Pricing] Error creating checkout session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
    }
  });

  // Portal session mutation
  const portalMutation = useMutation({
    mutationFn: createPortalSession,
    onSuccess: (data) => {
      console.log('[Pricing] Redirecting to portal:', data.url);
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      console.error('[Pricing] Error creating portal session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    }
  });

  const isPro = userData?.subscriptionType === 'pro';

  const handleUpgrade = () => {
    if (!user?.id) {
      setLocation("/login");
      return;
    }

    console.log('[Pricing] Creating checkout session for user:', user.id);
    checkoutMutation.mutate();
  };

  const handleManageSubscription = () => {
    if (!user?.id) return;

    console.log('[Pricing] Creating portal session for user:', user.id);
    portalMutation.mutate();
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "/forever",
      description: "Perfect for getting started",
      features: [
        "10 files maximum",
        "100MB total storage",
        "10MB per file limit",
        "Basic file management",
        "Secure cloud storage"
      ],
      buttonText: isPro ? "Current Plan" : "Current Plan",
      isCurrentPlan: !isPro,
      onClick: () => {},
      disabled: true
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "/month",
      description: "Everything you need for professional use",
      features: [
        "100 files maximum",
        "1GB total storage",
        "50MB per file limit",
        "Advanced file management",
        "Priority support",
        "Secure cloud storage"
      ],
      buttonText: isPro ? "Manage Subscription" : "Upgrade to Pro",
      isCurrentPlan: isPro,
      onClick: isPro ? handleManageSubscription : handleUpgrade,
      disabled: false
    }
  ];

  if (authLoading || userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Select the perfect plan for your file storage needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan, index) => (
          <Card key={index} className={`relative ${plan.isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
            {plan.isCurrentPlan && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </span>
              </div>
            )}
            
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                {plan.price}
                <span className="text-base font-normal text-muted-foreground">
                  {plan.period}
                </span>
              </div>
              <p className="text-muted-foreground">{plan.description}</p>
            </CardHeader>
            
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            
            <CardFooter>
              <Button
                className="w-full"
                onClick={plan.onClick}
                disabled={plan.disabled || checkoutMutation.isPending || portalMutation.isPending}
                variant={plan.isCurrentPlan ? "outline" : "default"}
              >
                {(checkoutMutation.isPending && !isPro) || (portalMutation.isPending && isPro) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPro ? "Opening Portal..." : "Starting Checkout..."}
                  </>
                ) : (
                  plan.buttonText
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          All plans include secure cloud storage and basic support. 
          Pro plan includes priority support and advanced features.
        </p>
      </div>
    </div>
  );
}

export default Pricing;
