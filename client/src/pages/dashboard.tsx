import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { SearchBar } from "@/components/SearchBar";
import { Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/useUser";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { user: userData } = useUser();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isNewItemOpen, setIsNewItemOpen] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  // Handle checkout success from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const sessionId = urlParams.get('session_id');

    if (success === 'true' && sessionId) {
      toast({
        title: "Welcome to Pro!",
        description: "Your subscription is now active. Enjoy unlimited items and all Pro features!",
      });
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

  const { data: items = [], refetch } = useQuery({
    queryKey: ['items', user?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/items`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Item deleted",
        description: "The item has been successfully deleted.",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (item: string) => {
      await apiRequest('POST', '/api/items', {
        item: item.trim()
      });
    },
    onSuccess: () => {
      refetch();
      setNewItem('');
      setIsNewItemOpen(false);
      toast({
        title: "Success",
        description: "Item added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  });


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const filteredItems = items.filter(
    (item: { item: string; id: number }) => item.item.toLowerCase().includes(search.toLowerCase()),
  );

  const handleNewItem = () => {
    if (userData?.subscriptionType === 'free' && items.length >= 5) {
      setShowUpgradeDialog(true);
    } else {
      setIsNewItemOpen(true);
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newItem.trim()) return;

    try {
      await addItemMutation.mutateAsync(newItem);
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

      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.item}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
