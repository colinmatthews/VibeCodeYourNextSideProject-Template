import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SearchBar } from "@/components/SearchBar";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
//import { sendContactNotification } from "@/lib/mail"; // Removed as it's not relevant to items

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user: firebaseUser, loading } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const { data: items = [], refetch } = useQuery({
    queryKey: ['items', firebaseUser?.uid], // Changed queryKey
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/items?userId=${firebaseUser?.uid}`); // Changed API endpoint
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!firebaseUser,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`); // Changed API endpoint
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
    (item: { item: string }) => item.item.toLowerCase().includes(search.toLowerCase()), //Simplified filtering
  );

  const handleNewItem = () => {
    if (user?.subscriptionType === 'free' && items.length >= 5) {
      setShowUpgradeDialog(true);
    } else {
      setIsNewItemOpen(true);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser?.uid || !newItem.trim()) return;

    try {
      const response = await apiRequest('POST', '/api/items', {
        userId: firebaseUser.uid,
        item: newItem.trim()
      });

      if (!response.ok) {
        throw new Error('Failed to add item');
      }
    e.preventDefault();
    if (!user?.firebaseId) return;

    try {
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.firebaseId,
          item: newItem
        }),
      });

      const data = await response.json();

      if (response.status === 403) {
        setShowUpgradeDialog(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to add item");
      }

      toast({
        title: "Success",
        description: "Item added successfully",
      });

      setNewItem("");
      setIsNewItemOpen(false);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
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
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <Input
              placeholder="Enter item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
            <div className="flex justify-end">
              <Button type="submit">Add Item</Button>
            </div>
          </form>
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

      {/* Simplified item list -  no longer needs ContactList component */}
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id} className="py-2">
            {item.item}
            <button onClick={() => deleteMutation.mutate(item.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}