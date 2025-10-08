import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useDataStreamRuntime } from "@assistant-ui/react-data-stream";
import { ReactNode } from "react";
import { streamingFetch } from "@/lib/queryClient";

interface Props {
  children: ReactNode;
  threadId?: string;
  initialMessages?: any[];
  onFinish?: (args: { threadId?: string }) => void;
}

export function AIRuntimeProvider({ children, threadId, initialMessages = [], onFinish }: Props) {
  const runtime = useDataStreamRuntime({
    api: "/api/ai/chat",
    body: threadId ? { threadId } : undefined,
    initialMessages: initialMessages,
    onFinish: () => {
      onFinish?.({ threadId });
    },
    headers: async () => {
      const { getAuthHeaders } = await import("@/lib/queryClient");
      return getAuthHeaders();
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
