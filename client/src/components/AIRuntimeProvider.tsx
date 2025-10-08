import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
  threadId?: string;
  initialMessages?: any[];
  onFinish?: (args: { threadId?: string }) => void;
}

export function AIRuntimeProvider({ children, threadId, initialMessages = [], onFinish }: Props) {
  const runtime = useChatRuntime({
    // @ts-expect-error - ChatInit typing mismatch between zod v3/v4
    body: threadId ? { threadId } : undefined,
    initialMessages: initialMessages,
    onFinish: () => {
      onFinish?.({ threadId });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
