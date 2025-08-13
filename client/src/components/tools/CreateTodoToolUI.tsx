import { makeAssistantToolUI } from "@assistant-ui/react";
import { useEffect, useRef } from "react";
import { queryClient } from "@/lib/queryClient";

type CreateTodoArgs = {
  item: string;
};

type CreateTodoResult = {
  id: number;
  item: string;
  createdAt: string | Date;
};

export const CreateTodoToolUI = makeAssistantToolUI<CreateTodoArgs, CreateTodoResult>({
  toolName: "createTodo",
  render: ({ args, status, result, isError }) => {
    if (status.type === "running") {
      return (
        <div className="rounded border p-3 text-sm">
          Creating todo: <span className="font-medium">{args.item}</span>
        </div>
      );
    }
    if (status.type === "incomplete") {
      const errorText = String((status as any).error?.message || status.reason || 'Unknown error');
      return (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to create todo{isError ? ": " + errorText : ""}
        </div>
      );
    }
    if (!result) return null;
    // When the tool succeeds, invalidate item queries so Dashboard reloads
    const InvalidateOnSuccess = ({ enabled }: { enabled: boolean }) => {
      const ranRef = useRef(false);
      useEffect(() => {
        if (enabled && !ranRef.current) {
          ranRef.current = true;
          try {
            // Invalidate any items queries (key starts with 'items')
            queryClient.invalidateQueries({
              predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'items',
            });
          } catch {}
        }
      }, [enabled]);
      return null;
    };
    // Handle success result with optional error payload (defensive)
    const anyResult = result as any;
    if (anyResult && anyResult.error) {
      return (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to create todo: {String(anyResult.error)}
        </div>
      );
    }
    return (
      <div className="rounded border bg-muted/30 p-3 text-sm">
        <InvalidateOnSuccess enabled={true} />
        <div className="font-medium">Todo created</div>
        <div className="mt-1">{result.item}</div>
      </div>
    );
  },
});
