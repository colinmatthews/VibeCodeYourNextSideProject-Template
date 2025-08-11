import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { useChat } from "@ai-sdk/react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  token?: string;
}

export function AIRuntimeProvider({ children, token }: Props) {
  const chat = useChat({
    api: "/api/ai/chat",
    headers: token ? {
      'Authorization': `Bearer ${token}`,
    } : undefined,
  });

  const runtime = useVercelUseChatRuntime(chat as any);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}