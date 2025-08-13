import { makeAssistantToolUI } from "@assistant-ui/react";

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
      return (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Failed to create todo{isError ? ": " + String((status as any).error?.message || status.reason) : ""}
        </div>
      );
    }
    if (!result) return null;
    return (
      <div className="rounded border bg-muted/30 p-3 text-sm">
        <div className="font-medium">Todo created</div>
        <div className="mt-1">{result.item}</div>
      </div>
    );
  },
});

