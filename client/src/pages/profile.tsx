
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${user?.uid}`],
    enabled: !!user,
  });

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
      return apiRequest("PATCH", `/api/users/${user?.uid}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.uid}`] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
  });

  return (
    <div className="container mx-auto py-8">
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
    </div>
  );
}
