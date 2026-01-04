import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useUser } from "@/hooks/useUser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiPost, apiJson } from "@/lib/queryClient";

async function createPortalSession(): Promise<{ url: string }> {
  try {
    const response = await apiPost('/api/create-portal-session', {});
    return apiJson<{ url: string }>(response);
  } catch (error: any) {
    if (error.message && error.message.includes('configuration')) {
      throw new Error('Portal Not Configured: The billing portal needs to be configured in Stripe Dashboard. Please configure it at: Settings > Billing > Customer portal');
    }
    throw error;
  }
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, logout } = useAuth();
  const { user: userData } = useUser();
  const queryClient = useQueryClient();

  // Initialize emailNotifications from user data
  const [emailNotifications, setEmailNotifications] = useState(userData?.emailNotifications ?? false);

  // Sync local state with fetched user data
  useEffect(() => {
    if (userData?.emailNotifications !== undefined) {
      setEmailNotifications(userData.emailNotifications);
    }
  }, [userData?.emailNotifications]);

  const updateEmailPreferences = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user?.id) throw new Error("User not authenticated");
      return apiRequest("PATCH", `/api/users/profile`, {
        emailNotifications: enabled
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
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

  // Portal session mutation
  const portalMutation = useMutation({
    mutationFn: createPortalSession,
    onSuccess: (data) => {
      console.log('[Settings] Redirecting to portal:', data.url);
      window.location.href = data.url;
    },
    onError: (error: Error) => {
      console.error('[Settings] Error opening billing portal:', error);
      
      if (error.message.includes('Portal Not Configured')) {
        toast({
          title: "Portal Not Configured",
          description: "The billing portal needs to be configured in Stripe Dashboard. Please configure it at: Settings > Billing > Customer portal",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to open billing portal",
          variant: "destructive",
        });
      }
    }
  });

  if (isLoading) {
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

  const handleSignOut = () => {
    logout();
  };

  const handleOpenBillingPortal = () => {
    if (!user?.id) return;
    portalMutation.mutate();
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
              <span>{user.email || 'Not set'}</span>
            </div>
            {user.firstName && (
              <div className="flex items-center space-x-2">
                <strong>Name:</strong> 
                <span>{user.firstName} {user.lastName}</span>
              </div>
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
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    'Manage Subscription'
                  )}
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
                disabled={portalMutation.isPending}
                className="w-full sm:w-auto"
              >
                {portalMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening Portal...
                  </>
                ) : (
                  'Open Billing Portal'
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
