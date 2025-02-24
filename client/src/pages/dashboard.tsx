import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContactList } from "@/components/ContactList";
import { SearchBar } from "@/components/SearchBar";
import { PaymentForm } from "@/components/PaymentForm";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Contact, InsertContact } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactForm } from "@/components/ContactForm";
import { useUser } from "@/hooks/useUser";
import { sendContactNotification } from "@/lib/mail";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user: firebaseUser, loading } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: contacts = [], refetch } = useQuery<Contact[]>({
    queryKey: ['contacts', firebaseUser?.uid],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contacts?userId=${firebaseUser?.uid}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!firebaseUser,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully deleted.",
      });
    },
  });

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!firebaseUser) {
    setLocation("/login");
    return null;
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNewContact = () => {
    if (user?.plan === 'free' && contacts.length >= 5) {
      setShowUpgradeDialog(true);
    } else {
      setIsNewContactOpen(true);
    }
  };

  const handleContactSubmit = async (data: InsertContact) => {
    console.log("Client: Submitting contact with user ID:", firebaseUser?.uid);
    await apiRequest("POST", "/api/contacts", { ...data, userId: firebaseUser?.uid });

    // Send email notification if enabled
    if (user?.emailNotifications && firebaseUser.email) {
      await sendContactNotification(
        firebaseUser.email,
        "New contact added",
        `A new contact has been added to your contacts:\n\nName: ${data.firstName} ${data.lastName}\nEmail: ${data.email}\nPhone: ${data.phone}`
      );
    }

    setIsNewContactOpen(false);
    refetch();
    toast({
      title: "Contact created",
      description: "The contact has been successfully created.",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Button onClick={handleNewContact}>
          <Plus className="h-4 w-4 mr-2" /> New Contact
        </Button>
      </div>

      <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm onSubmit={handleContactSubmit} />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You've reached the maximum of 5 contacts on the free plan. Upgrade to Pro for unlimited contacts!</p>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button onClick={() => setLocation("/pricing")}>View Pricing</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SearchBar value={search} onChange={setSearch} />

      <ContactList
        contacts={filteredContacts}
        onEdit={(id) => setLocation(`/contacts/edit/${id}`)}
        onDelete={(id) => {
          if (confirm("Are you sure you want to delete this contact?")) {
            deleteMutation.mutate(id);
          }
        }}
      />
    </div>
  );
}