import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { updateUserPassword } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: firebaseUser, loading } = useAuth();
  const { user: userData } = useUser(); // Renamed to avoid conflict
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Initialize emailNotifications from user data
  const [emailNotifications, setEmailNotifications] = useState(userData?.emailNotifications ?? false);

  // Check if user logged in with email/password
  const isEmailUser = firebaseUser?.providerData?.[0]?.providerId === 'password';

  const updateEmailPreferences = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!firebaseUser?.uid) throw new Error("User not authenticated");
      return apiRequest("PATCH", `/api/users/${firebaseUser.uid}`, {
        emailNotifications: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', firebaseUser?.uid] });
      toast({
        title: "Success",
        description: "Email preferences updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email preferences",
        variant: "destructive"
      });
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!firebaseUser) {
    setLocation('/login');
    return null;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(firebaseUser, currentPassword, newPassword);
      toast({
        title: "Success",
        description: "Password updated successfully"
      });
      // Clear the form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
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

  const handleOpenBillingPortal = async () => {
    if (!firebaseUser?.uid) return;

    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseId: firebaseUser.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific Stripe portal configuration error
        if (errorData.error && errorData.error.includes('configuration')) {
          toast({
            title: "Portal Not Configured",
            description: "The billing portal needs to be configured in Stripe Dashboard. Please configure it at: Settings > Billing > Customer portal",
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe billing portal
      window.location.href = url;
    } catch (error) {
      console.error('[Settings] Error opening billing portal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to open billing portal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <strong>Email:</strong> 
              <span>{firebaseUser.email}</span>
            </div>
            {isEmailUser && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <h3 className="text-xl font-semibold">Change Password</h3>
                <Input
                  type="password"
                  placeholder="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <Button 
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full"
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            )}
            <Button 
              variant="destructive"
              onClick={handleSignOut}
              className="mt-4"
            >
              Sign Out
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Email Preferences</h2>
          <div className="flex items-center space-x-4">
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={(checked) => {
                setEmailNotifications(checked);
                updateEmailPreferences.mutate(checked);
              }}
            />
            <Label htmlFor="email-notifications">
              Receive email notifications when new items are added
            </Label>
          </div>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-medium">
                  Current Plan: {userData?.subscriptionType === 'pro' ? 'Pro' : 'Free'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {userData?.subscriptionType === 'pro' 
                    ? 'You have access to all pro features. Manage your subscription through the billing portal.'
                    : 'Upgrade to pro for unlimited items and premium features'}
                </p>
              </div>
              {userData?.subscriptionType === 'pro' ? (
                <Button
                  variant="outline"
                  onClick={handleOpenBillingPortal}
                >
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={() => setLocation('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {userData?.subscriptionType === 'pro' && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Billing</h2>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your subscription, update payment methods, view billing history, 
                and download invoices through the Stripe customer portal.
              </p>
              <Button 
                variant="outline" 
                onClick={handleOpenBillingPortal}
                className="w-full sm:w-auto"
              >
                Open Billing Portal
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 All payment methods and billing are securely handled by Stripe.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}