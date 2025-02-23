import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/hooks/use-auth";
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { PaymentMethodsList } from "@/components/PaymentMethodsList";

export default function Settings() {
  const [location, setLocation] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();
  const { user: firebaseUser } = useAuth();
  const { user } = useUser();

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>

      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Payment Methods</h2>
        <PaymentMethodsList />
      </Card>

      <Card className="p-6 mt-6">
        <h2 className="text-2xl font-semibold mb-4">Account</h2>
        <div className="space-y-4">
          <div>
            <strong>Email:</strong> {user?.email}
          </div>
          <Button 
            variant="destructive"
            onClick={() => setLocation('/logout')}
          >
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}