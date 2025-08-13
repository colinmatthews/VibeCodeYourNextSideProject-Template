import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { ReactNode } from "react";
import { streamingFetch } from "@/lib/queryClient";

interface Props {
  children: ReactNode;
  threadId?: string;
  initialMessages?: any[];
  onFinish?: (args: { threadId?: string }) => void;
}

export function AIRuntimeProvider({ children, threadId, initialMessages = [], onFinish }: Props) {
  const chat = useChat({
    api: "/api/ai/chat",
    fetch: streamingFetch,
    body: threadId ? { threadId } : undefined,
    initialMessages: initialMessages,
    onFinish: () => {
      onFinish?.({ threadId });
    },
  });

  const runtime = useVercelUseChatRuntime(chat as any);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
