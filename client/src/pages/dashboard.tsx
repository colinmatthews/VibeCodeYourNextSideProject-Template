import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContactList } from "@/components/ContactList";
import { SearchBar } from "@/components/SearchBar";
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
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: items = [], refetch } = useQuery<Contact[]>({
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
        title: "Item deleted",
        description: "The item has been successfully deleted.",
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

  const filteredItems = items.filter(
    (item) =>
      item.firstName.toLowerCase().includes(search.toLowerCase()) ||
      item.lastName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNewItem = () => {
    if (user?.subscriptionType === 'free' && items.length >= 5) {
      setShowUpgradeDialog(true);
    } else {
      setIsNewItemOpen(true);
    }
  };

  const handleItemSubmit = async (data: InsertContact) => {
    await apiRequest("POST", "/api/contacts", { ...data, userId: firebaseUser?.uid });

    // Send email notification if enabled
    if (user?.emailNotifications && firebaseUser.email) {
      await sendContactNotification(
        firebaseUser.email,
        "New item added",
        `A new item has been added to your list:\n\nItem: ${data.firstName} ${data.lastName}`
      );
    }

    setIsNewItemOpen(false);
    refetch();
    toast({
      title: "Item created",
      description: "The item has been successfully created.",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your List</h1>
        <Button onClick={handleNewItem}>
          <Plus className="h-4 w-4 mr-2" /> New Item
        </Button>
      </div>

      <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Item</DialogTitle>
          </DialogHeader>
          <ContactForm onSubmit={handleItemSubmit} />
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Item Limit Reached</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>You've reached the maximum of 5 items on the free plan. Upgrade to Pro for unlimited items!</p>
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>Cancel</Button>
            <Button onClick={() => setLocation("/pricing")}>View Pricing</Button>
          </div>
        </DialogContent>
      </Dialog>

      <SearchBar value={search} onChange={setSearch} />

      <ContactList
        contacts={filteredItems}
        onEdit={(id) => setLocation(`/contacts/edit/${id}`)}
        onDelete={(id) => {
          if (confirm("Are you sure you want to delete this item?")) {
            deleteMutation.mutate(id);
          }
        }}
      />
    </div>
  );
}