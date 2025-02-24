import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card } from '@/components/ui/card';
import { Loader2 } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Success",
        description: "You have been logged out successfully"
      });
      setLocation('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Payment Methods</h2>
        {/* PaymentMethodsList component will be implemented later */}
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-2xl font-semibold mb-4">Account</h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <strong>Email:</strong> 
            <span>{user.email}</span>
          </div>
          <Button 
            variant="destructive"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}