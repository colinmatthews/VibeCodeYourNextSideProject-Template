import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { updateUserPassword } from "@/lib/firebase";
import { useUser } from "@/hooks/useUser";
import { useFiles } from "@/hooks/useFiles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, apiPost, apiJson } from "@/lib/queryClient";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

async function createPortalSession(): Promise<{ url: string }> {
  try {
    const response = await apiPost('/api/create-portal-session', {});
    return apiJson<{ url: string }>(response);
  } catch (error: any) {
    // Handle specific Stripe portal configuration error
    if (error.message && error.message.includes('configuration')) {
      throw new Error('Portal Not Configured: The billing portal needs to be configured in Stripe Dashboard. Please configure it at: Settings > Billing > Customer portal');
    }
    throw error;
  }
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user: firebaseUser, loading } = useAuth();
  const { user: userData } = useUser(); // Renamed to avoid conflict
  const { files, totalSize, totalFiles, deleteFile } = useFiles();
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Initialize emailNotifications from user data
  const [emailNotifications, setEmailNotifications] = useState(userData?.emailNotifications ?? false);

  // Check if user logged in with email/password
  const isEmailUser = firebaseUser?.providerData?.[0]?.providerId === 'password';

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStorageQuota = () => {
    const isPremium = userData?.isPremium || false;
    const maxStorage = isPremium ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free
    const usedPercentage = (totalSize / maxStorage) * 100;
    return { maxStorage, usedPercentage, isPremium };
  };

  const { maxStorage, usedPercentage, isPremium } = getStorageQuota();

  const updateEmailPreferences = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!firebaseUser?.uid) throw new Error("User not authenticated");
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

  const handleOpenBillingPortal = () => {
    if (!firebaseUser?.uid) return;
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
              <p className="text-xs text-muted-foreground">
                💡 All payment methods and billing are securely handled by Stripe.
              </p>
            </div>
          </Card>
        )}

        {/* File Storage Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              File Storage 
              <div className="flex items-center gap-2">
                <Badge variant={isPremium ? "default" : "secondary"}>
                  {isPremium ? "Pro Plan" : "Free Plan"}
                </Badge>
                <Badge variant="outline">
                  {totalFiles} / {isPremium ? 100 : 10} files
                </Badge>
              </div>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>Storage used: {formatFileSize(totalSize)} of {formatFileSize(maxStorage)}</span>
                <span>{usedPercentage.toFixed(1)}% used</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    usedPercentage > 90 ? 'bg-destructive' : 
                    usedPercentage > 70 ? 'bg-yellow-500' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Test Replit Storage Integration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload files to test the new Replit Object Storage integration. Files are securely stored with user isolation.
              </p>
              <FileUpload 
                onUploadComplete={(result) => {
                  console.log('Upload completed:', result);
                  toast({
                    title: "File uploaded successfully",
                    description: `${result.originalName} has been uploaded to Replit Object Storage`,
                  });
                }}
                accept="image/*,application/pdf,.txt,.doc,.docx,.json"
                maxSize={isPremium ? 50 * 1024 * 1024 : 10 * 1024 * 1024}
                multiple={false}
              />
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Your Files</h3>
              {totalFiles > 0 ? (
                <FileList 
                  files={files} 
                  onDelete={deleteFile}
                />
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No files uploaded yet. Try uploading a file above to test the Replit storage integration!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}