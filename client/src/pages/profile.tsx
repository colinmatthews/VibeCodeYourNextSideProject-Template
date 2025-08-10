
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import { useFiles } from "@/hooks/useFiles";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { FileList } from "@/components/FileList";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { User } from "@shared/schema";

export default function Profile() {
  const { user: firebaseUser } = useAuth();
  const { user: userData } = useUser();
  const { files, totalSize, totalFiles, deleteFile } = useFiles();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: userData?.firstName || "",
    lastName: userData?.lastName || "",
    address: userData?.address || "",
    city: userData?.city || "",
    state: userData?.state || "",
    postalCode: userData?.postalCode || "",
  });

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PATCH", "/api/users/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${firebaseUser?.uid}`] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
  });

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

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Profile Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
            <Input
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="City"
              value={formData.city}
              onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            />
            <Input
              placeholder="State"
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            />
            <Input
              placeholder="Postal Code"
              value={formData.postalCode}
              onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={() => updateProfile.mutate(formData)}
            disabled={updateProfile.isPending}
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>

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
            <FileUpload 
              onUploadComplete={(result) => {
                console.log('Upload completed:', result);
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
  );
}
