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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const { data: contacts = [], refetch } = useQuery<Contact[]>({
    queryKey: ['contacts', user?.uid],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/contacts?userId=${user?.uid}`);
      console.log("Raw contact response:", response);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!user,
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

  // Placeholder:  Replace this with actual user fetching logic.
  const users = []; // Replace with your actual user data fetching

  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Users</h2>
        <div className="border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firebase ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.isPremium ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.firebaseId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Button onClick={() => setIsNewContactOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Contact
        </Button>
      </div>

      <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Contact</DialogTitle>
          </DialogHeader>
          <ContactForm
            onSubmit={async (data: InsertContact) => {
              console.log("Client: Submitting contact with user ID:", user?.uid);
              await apiRequest("POST", "/api/contacts", { ...data, userId: user?.uid });
              setIsNewContactOpen(false);
              refetch();
              toast({
                title: "Contact created",
                description: "The contact has been successfully created.",
              });
            }}
          />
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