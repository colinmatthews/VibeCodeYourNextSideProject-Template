import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Zap, Clock, Info } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost, apiPatch, apiDelete, apiJson } from "@/lib/queryClient";
import { ChatKit, useChatKit } from "@openai/chatkit-react";
import { TodoList } from "@/components/TodoList";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const AIChat = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'checking' | 'ready' | 'not_configured' | 'error'>('checking');
  const clientSecretRef = useRef<string | null>(null);
  const pendingRequestRef = useRef<Promise<string> | null>(null);
  const queryClient = useQueryClient();

  // Helper to refresh todos via React Query
  const refreshTodos = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['items', user?.id] });
  }, [queryClient, user?.id]);

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

    // Error handler for detailed error diagnostics
    onError: ({ error }) => {
      console.error('[ChatKit ERROR]', error);
    },

    // Client tools: execute in browser, can call localhost APIs
    onClientTool: async ({ name, params }: { name: string; params: Record<string, any> }) => {
      console.log('[ChatKit] Client tool called:', name, params);

      try {
        switch (name) {
          case 'getTodos': {
            // Fetch todos from your Express API
            const response = await apiGet('/api/items');
            const fetchedTodos = await apiJson<Array<{
              id: number;
              item: string;
              status: string;
              createdAt: string;
              updatedAt: string;
            }>>(response);

            // Refresh the React Query cache
            refreshTodos();

            return {
              success: true,
              todos: fetchedTodos.map(t => ({
                id: t.id,
                text: t.item,
                status: t.status,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
              })),
              count: fetchedTodos.length,
            };
          }

          case 'createTodo': {
            // Create a new todo via your Express API
            // Support both 'text' (standard) and 'item' (legacy) parameter names
            const todoText = params.text ?? params.item;
            if (!todoText) {
              return {
                success: false,
                error: 'Todo text is required',
              };
            }

            const response = await apiPost('/api/items', { item: todoText });
            const created = await apiJson<{
              id: number;
              item: string;
              status: string;
              createdAt: string;
              updatedAt: string;
            }>(response);

            // Refresh the React Query cache to update TodoList
            refreshTodos();

            return {
              success: true,
              todo: {
                id: created.id,
                text: created.item,
                status: created.status,
                createdAt: created.createdAt,
                updatedAt: created.updatedAt,
              },
            };
          }

          case 'updateTodoStatus': {
            // Update todo status via your Express API
            const todoId = Number(params.id); // Parse string to number
            const newStatus = params.status;

            if (!todoId || isNaN(todoId) || !newStatus) {
              return {
                success: false,
                error: 'Valid Todo ID and status are required',
              };
            }

            if (!['open', 'in_progress', 'completed'].includes(newStatus)) {
              return {
                success: false,
                error: 'Invalid status. Must be one of: open, in_progress, completed',
              };
            }

            const response = await apiPatch(`/api/items/${todoId}/status`, { status: newStatus });
            const updated = await apiJson<{
              id: number;
              item: string;
              status: string;
              createdAt: string;
              updatedAt: string;
            }>(response);

            // Refresh the React Query cache to update TodoList
            refreshTodos();

            return {
              success: true,
              todo: {
                id: updated.id,
                text: updated.item,
                status: updated.status,
                updatedAt: updated.updatedAt,
              },
            };
          }

          case 'deleteTodo': {
            // Delete a todo via your Express API
            const todoId = Number(params.id); // Parse string to number

            if (!todoId || isNaN(todoId)) {
              return {
                success: false,
                error: 'Valid Todo ID is required',
              };
            }

            await apiDelete(`/api/items/${todoId}`);

            // Refresh the React Query cache to update TodoList
            refreshTodos();

            return {
              success: true,
              message: 'Todo deleted successfully',
              deletedId: todoId,
            };
          }

          default:
            throw new Error(`Unknown client tool: ${name}`);
        }
      } catch (error: any) {
        console.error('[ChatKit] Client tool error:', error);
        console.error('[ChatKit] Client tool error details:', {
          name,
          params,
          errorMessage: error.message,
          errorStack: error.stack,
          fullError: error,
        });

        // Provide specific error messages for common failure scenarios
        let errorMessage = 'Failed to execute tool';
        if (error.message?.includes('fetch') || error.message?.includes('network')) {
          errorMessage = 'Network error: Unable to connect to server. Please check your connection.';
        } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          errorMessage = 'Authentication error: Please log in again.';
        } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          errorMessage = 'Permission denied: You do not have access to this resource.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Return error in a format the AI can understand
        return {
          success: false,
          error: errorMessage,
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
                onClick={() => setLocation('/login')}
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
      {/* Side-by-side layout: Todo List + Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Todo List Sidebar */}
        <TodoList onTodoChange={refreshTodos} />

        {/* ChatKit Component */}
        <div className="flex-1 flex flex-col overflow-hidden">
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
              Powered by OpenAI ChatKit. Todos update automatically when the AI creates them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
