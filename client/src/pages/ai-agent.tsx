import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Zap, Clock, Info } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost, apiJson } from "@/lib/queryClient";
import { ChatKit, useChatKit } from "@openai/chatkit-react";

const AIAgent = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'checking' | 'ready' | 'not_configured' | 'error'>('checking');
  const clientSecretRef = useRef<string | null>(null);
  const pendingRequestRef = useRef<Promise<string> | null>(null);

  // Check ChatKit service status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await apiGet('/api/chatkit/status');
        const data = await apiJson<{ status: string; workflowId?: string }>(response);
        setStatus(data.status === 'ready' ? 'ready' : 'not_configured');
      } catch (error) {
        console.error('Failed to check ChatKit status:', error);
        setStatus('error');
      }
    };

    if (user) checkStatus();
  }, [user]);

  // Function to get client secret (for ChatKit API)
  // Use useCallback to prevent re-creation on every render
  const getClientSecret = useCallback(async (currentSecret: string | null): Promise<string> => {
    // If we already have a valid secret, return it
    if (currentSecret) {
      return currentSecret;
    }

    // If we have a cached secret, return it
    if (clientSecretRef.current) {
      return clientSecretRef.current;
    }

    // If there's already a pending request, wait for it
    if (pendingRequestRef.current) {
      return pendingRequestRef.current;
    }

    // Create new request
    const request = (async () => {
      try {
        const response = await apiPost('/api/chatkit/session', {});
        const data = await apiJson<{ clientToken: string }>(response);
        clientSecretRef.current = data.clientToken;
        return data.clientToken;
      } catch (error) {
        console.error('Failed to get client secret:', error);
        pendingRequestRef.current = null;
        throw error;
      } finally {
        pendingRequestRef.current = null;
      }
    })();

    pendingRequestRef.current = request;
    return request;
  }, []);

  // Initialize ChatKit with the hosted API config
  const chatkit = useChatKit({
    api: {
      getClientSecret,
    },
    theme: 'light', // Can be 'light' or 'dark'

    // Client tools: execute in browser, can call localhost APIs
    onClientTool: async ({ name, params }) => {
      console.log('[ChatKit] Client tool called:', name, params);

      try {
        switch (name) {
          case 'getTodos': {
            // Fetch todos from your Express API
            const response = await apiGet('/api/items');
            const todos = await apiJson<Array<{ id: number; item: string; createdAt: string }>>(response);
            return {
              success: true,
              todos: todos.map(t => ({ id: t.id, text: t.item, createdAt: t.createdAt })),
              count: todos.length,
            };
          }

          case 'createTodo': {
            // Create a new todo via your Express API
            const todoText = params.text || params.item;
            if (!todoText) {
              return {
                success: false,
                error: 'Todo text is required',
              };
            }

            const response = await apiPost('/api/items', { item: todoText });
            const created = await apiJson<{ id: number; item: string; createdAt: string }>(response);
            return {
              success: true,
              todo: {
                id: created.id,
                text: created.item,
                createdAt: created.createdAt,
              },
            };
          }

          default:
            throw new Error(`Unknown client tool: ${name}`);
        }
      } catch (error: any) {
        console.error('[ChatKit] Client tool error:', error);
        // Return error in a format the AI can understand
        return {
          success: false,
          error: error.message || 'Failed to execute tool',
        };
      }
    },
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>AI Agent</CardTitle>
              <CardDescription>
                Please log in to chat with the AI Agent powered by OpenAI ChatKit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Sign In to Chat
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <CardTitle>Loading AI Agent</CardTitle>
              <CardDescription>
                Checking configuration...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'not_configured') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <CardTitle>ChatKit Not Configured</CardTitle>
              <CardDescription>
                The AI Agent feature requires OpenAI ChatKit to be configured.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>For developers:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Create an agent in <a href="https://platform.openai.com/agent-builder" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">OpenAI Agent Builder</a></li>
                  <li>Copy your Workflow ID</li>
                  <li>Add to <code className="bg-muted px-1 rounded">.env</code>:</li>
                </ol>
                <code className="block bg-muted p-2 rounded mt-2">
                  OPENAI_CHATKIT_WORKFLOW_ID="wf_your_id_here"
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <CardTitle>Service Unavailable</CardTitle>
              <CardDescription>
                The AI Agent service is temporarily unavailable. Please try again later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="w-full"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 p-3">
        <div className="container mx-auto flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 dark:text-blue-100 font-medium">
              AI Agent powered by OpenAI ChatKit
            </p>
            <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
              This uses OpenAI's hosted agent infrastructure with visual tool configuration.
              Compare with <a href="/ai-chat" className="underline hover:text-blue-900 dark:hover:text-blue-100">AI Chat</a> (custom implementation).
            </p>
          </div>
        </div>
      </div>

      {/* ChatKit Component */}
      <div className="flex-1 overflow-hidden">
        {status === 'ready' ? (
          <div className="h-full w-full">
            <ChatKit control={chatkit.control} className="h-full w-full" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4" />
              <p>Initializing AI Agent...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-3 text-center text-xs text-muted-foreground">
        <p>
          Powered by OpenAI ChatKit. Conversations are managed by OpenAI's infrastructure.
        </p>
      </div>
    </div>
  );
};

export default AIAgent;
