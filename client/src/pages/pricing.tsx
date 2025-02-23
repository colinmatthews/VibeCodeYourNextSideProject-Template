
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { handlePayment } from "@/lib/stripe";
import { useToast } from "@/components/ui/use-toast";

export default function Pricing() {
  const { toast } = useToast();
  return (
    <div className="container mx-auto py-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-muted-foreground">Choose the plan that's right for you</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
            <p className="text-2xl font-bold">$0/month</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Up to 50 contacts
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Basic search
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Email support
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Get Started</Button>
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
          <CardFooter>
            <Button 
              className="w-full" 
              variant="default"
              onClick={async () => {
                try {
                  const result = await handlePayment(1000); // $10 in cents
                  if (result.paymentIntent?.status === 'succeeded') {
                    toast({
                      title: "Success!",
                      description: "Your subscription has been activated.",
                    });
                  }
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Payment failed. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Subscribe
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <p className="text-2xl font-bold">Custom</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Everything in Pro
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> API access
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Dedicated support
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Custom integration
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline">Contact Sales</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
