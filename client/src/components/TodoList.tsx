import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Trash2, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";

interface TodoItem {
  id: number;
  item: string;
}

interface TodoListProps {
  onTodoChange?: () => void;
}

export function TodoList({ onTodoChange }: TodoListProps) {
  const { user } = useAuth();

  // Fetch todos using React Query (same as dashboard)
  const { data: todos = [], refetch, isLoading } = useQuery({
    queryKey: ['items', user?.uid],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/items?userId=${user?.uid}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user,
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      refetch();
      onTodoChange?.();
    },
  });

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Public method to refresh todos (called from parent)
  const refresh = () => {
    refetch();
  };

  return (
    <div className="w-80 border-r flex flex-col bg-muted/30">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          My Todos
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {todos.length} {todos.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No todos yet</p>
            <p className="text-xs mt-1">Ask the AI to create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="bg-background border rounded-lg p-3 hover:shadow-sm transition-shadow group"
              >
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm break-words">{todo.item}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(todo.id)}
                    disabled={deleteMutation.isPending}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Export a hook to allow parent components to trigger refresh
export function useTodoListRefresh() {
  const { user } = useAuth();
  const { refetch } = useQuery({
    queryKey: ['items', user?.uid],
    enabled: false, // Don't auto-fetch, just allow manual refetch
  });

  return { refreshTodos: refetch };
}
