import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Trash2, Clock, PlayCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type TodoStatus = "open" | "in_progress" | "completed";

interface TodoItem {
  id: number;
  item: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG = {
  open: {
    label: "Open",
    icon: Circle,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    nextStatus: "in_progress" as TodoStatus,
  },
  in_progress: {
    label: "In Progress",
    icon: PlayCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    nextStatus: "completed" as TodoStatus,
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    nextStatus: "open" as TodoStatus,
  },
};

interface TodoListProps {
  onTodoChange?: () => void;
}

// Helper to format relative time
const formatRelativeTime = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
};

export function TodoList({ onTodoChange }: TodoListProps) {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState<TodoStatus | "all">("all");

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

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TodoStatus }) => {
      await apiRequest("PATCH", `/api/items/${id}/status`, { status });
    },
    onSuccess: () => {
      refetch();
      onTodoChange?.();
    },
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

  const handleStatusToggle = (id: number, currentStatus: TodoStatus) => {
    const nextStatus = STATUS_CONFIG[currentStatus].nextStatus;
    updateStatusMutation.mutate({ id, status: nextStatus });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  // Public method to refresh todos (called from parent)
  const refresh = () => {
    refetch();
  };

  // Filter todos based on selected status
  const filteredTodos = filterStatus === "all"
    ? todos
    : todos.filter((todo: TodoItem) => todo.status === filterStatus);

  return (
    <div className="w-80 border-r flex flex-col bg-muted/30">
      <div className="p-4 border-b space-y-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            My Todos
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {filteredTodos.length} of {todos.length} {todos.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1 text-xs">
          <Button
            variant={filterStatus === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("all")}
            className="h-7 px-2"
          >
            All
          </Button>
          <Button
            variant={filterStatus === "open" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("open")}
            className="h-7 px-2"
          >
            Open
          </Button>
          <Button
            variant={filterStatus === "in_progress" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("in_progress")}
            className="h-7 px-2"
          >
            Active
          </Button>
          <Button
            variant={filterStatus === "completed" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterStatus("completed")}
            className="h-7 px-2"
          >
            Done
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No {filterStatus !== "all" ? filterStatus : ""} todos</p>
            <p className="text-xs mt-1">Ask the AI to create one!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTodos.map((todo: TodoItem) => {
              const statusConfig = STATUS_CONFIG[todo.status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={todo.id}
                  className={cn(
                    "bg-background border rounded-lg p-3 hover:shadow-sm transition-shadow group",
                    statusConfig.bgColor
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusToggle(todo.id, todo.status)}
                      disabled={updateStatusMutation.isPending}
                      className="h-6 w-6 p-0 hover:bg-transparent"
                      title={`Click to mark as ${statusConfig.nextStatus.replace('_', ' ')}`}
                    >
                      <StatusIcon className={cn("h-4 w-4 flex-shrink-0", statusConfig.color)} />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm break-words",
                        todo.status === "completed" && "line-through text-muted-foreground"
                      )}>
                        {todo.item}{" "}
                        <span className="text-xs text-muted-foreground/60 font-normal">
                          (#{todo.id})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(todo.updatedAt)}
                      </p>
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
              );
            })}
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
