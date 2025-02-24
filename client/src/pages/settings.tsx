import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card } from '@/components/ui/card';

export default function Settings() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

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
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <Button 
            variant="destructive"
            onClick={() => {
              setLocation('/');
              user.signOut();
            }}
          >
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}