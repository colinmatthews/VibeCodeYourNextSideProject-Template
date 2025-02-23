
import { loadStripe } from "@stripe/stripe-js";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardFooter } from "@/components/ui/card";
import { Check } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Pricing() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
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
              onClick={() => user ? handleSuccess() : setLocation("/login")}
            >
              {user ? 'Upgrade' : 'Get Started'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
