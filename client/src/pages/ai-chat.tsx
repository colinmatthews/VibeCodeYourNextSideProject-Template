import { Thread } from "@/components/assistant-ui/thread";
import { AIRuntimeProvider } from "@/components/AIRuntimeProvider";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Zap, Clock, Menu, PlusCircle, Archive, Trash2, Check, X } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import { apiGet, apiPost, apiRequest, apiJson } from "@/lib/queryClient";
import { useLocation, useRoute } from "wouter";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { CreateTodoToolUI } from "@/components/tools/CreateTodoToolUI";

interface ThreadData {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

const AIChat = () => {
  const { user } = useAuth();
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'not_configured' | 'error'>('checking');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/ai-chat/:threadId");
  const currentThreadId = (match ? (params as any).threadId : null) as string | null;
  const [loading, setLoading] = useState(false);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [messagesThreadId, setMessagesThreadId] = useState<string | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Check AI service status
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await apiGet('/api/ai/status');
        const data = await apiJson<{ status: string }>(response);
        setAiStatus(data.status === 'ready' ? 'ready' : 'not_configured');
      } catch (error) {
        console.error('Failed to check AI status:', error);
        setAiStatus('error');
      }
    };

    if (user) checkAIStatus();
  }, [user]);

  // Fetch threads on mount
  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [user]);

  // Fetch messages when thread changes (clear immediately to avoid stale branches)
  useEffect(() => {
    if (!user) return;
    if (!currentThreadId) {
      setThreadMessages([]);
      setMessagesThreadId(null);
      setEditingThreadId(null);
      setLoadingMessages(false);
      return;
    }
    // Start loading and clear messages
    setLoadingMessages(true);
    setThreadMessages([]);
    setMessagesThreadId(currentThreadId);
    setEditingThreadId(null);
    fetchThreadMessages(currentThreadId);
  }, [user, currentThreadId]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/ai/threads');
      const data = await apiJson<{
        threads: Array<{ remoteId: string; title: string; createdAt: string; updatedAt: string }>;
        archivedThreads: Array<{ remoteId: string; title: string; createdAt: string; updatedAt: string }>;
      }>(response);
      
      const allThreads: ThreadData[] = [
        ...data.threads.map((t) => ({
          id: t.remoteId,
          title: t.title,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          archived: false,
        })),
        ...data.archivedThreads.map((t) => ({
          id: t.remoteId,
          title: t.title,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          archived: true,
        })),
      ];
      // Sort by most recent update
      allThreads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setThreads(allThreads);
      
      // If URL has no threadId, navigate to the first thread (if any)
      if (!currentThreadId && allThreads.length > 0) {
        setLocation(`/ai-chat/${allThreads[0].id}`);
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    try {
      const response = await apiGet(`/api/ai/threads/${threadId}/messages`);
      const data = await apiJson<{
        messages: Array<{
          id: string;
          role: 'user' | 'assistant';
          content: Array<{ text: string }> | string;
          createdAt: string;
        }>;
      }>(response);

      // Convert messages to the format expected by useChat (UIMessage format)
      const formattedMessages = data.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: Array.isArray(msg.content) ? msg.content[0].text : msg.content,
        createdAt: new Date(msg.createdAt)
      }));
      // Sort messages by timestamp to ensure proper order
      formattedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setThreadMessages(formattedMessages);
      setMessagesThreadId(threadId);
    } catch (error) {
      console.error('Failed to fetch thread messages:', error);
      setThreadMessages([]);
      setMessagesThreadId(threadId);
    } finally {
      setLoadingMessages(false);
    }
  };

  // On chat generation finish, refresh the current thread's title and timestamps
  const handleFinish = async () => {
    if (!currentThreadId) return;
    try {
      setRefreshing(true);
      // Fetch just the current thread
      const res = await apiGet(`/api/ai/threads/${currentThreadId}`);
      const t = await apiJson<{ remoteId: string; title: string; status: string; createdAt: string; updatedAt: string }>(res);
      setThreads(prev => {
        const updated = prev.map((th) => th.id === t.remoteId ? {
          id: t.remoteId,
          title: t.title,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt),
          archived: th.archived,
        } : th);
        // Reorder by updatedAt desc so the active thread floats up if needed
        const toTime = (v: Date | string) => (v instanceof Date ? v : new Date(v)).getTime();
        return [...updated].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
      });
    } catch (e) {
      // Non-fatal; UI will converge on next list fetch
    } finally {
      setRefreshing(false);
    }
  };

  const createNewThread = async () => {
    try {
      const response = await apiPost('/api/ai/threads', { title: 'New Chat' });
      const thread = await apiJson<{
        remoteId: string;
        title: string;
        createdAt: string;
        updatedAt: string;
      }>(response);
      
      const newThread = {
        id: thread.remoteId,
        title: thread.title,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
        archived: false
      };
      setThreads(prev => [newThread, ...prev]);
      setLocation(`/ai-chat/${newThread.id}`);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const archiveThread = async (threadId: string) => {
    try {
      await apiRequest('PATCH', `/api/ai/threads/${threadId}`, { archived: true });
      
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, archived: true } : t
      ));
    } catch (error) {
      console.error('Failed to archive thread:', error);
    }
  };

  const unarchiveThread = async (threadId: string) => {
    try {
      await apiRequest('PATCH', `/api/ai/threads/${threadId}`, { archived: false });

      setThreads(prev => prev.map(t =>
        t.id === threadId ? { ...t, archived: false } : t
      ));
    } catch (error) {
      console.error('Failed to restore thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      await apiRequest('DELETE', `/api/ai/threads/${threadId}`);
      
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        if (remainingThreads.length > 0) {
          setLocation(`/ai-chat/${remainingThreads[0].id}`);
        } else {
          setLocation(`/ai-chat`);
        }
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const saveThreadRename = async (threadId: string) => {
    const newTitle = editingTitle.trim();
    if (!newTitle) return;
    try {
      const res = await apiRequest('PATCH', `/api/ai/threads/${threadId}`, { title: newTitle });
      const updated = await apiJson<{ remoteId: string; title: string; status: string; createdAt: string; updatedAt: string }>(res);
      setThreads(prev => {
        const next = prev.map(t => t.id === updated.remoteId ? {
          id: updated.remoteId,
          title: updated.title,
          createdAt: new Date(updated.createdAt),
          updatedAt: new Date(updated.updatedAt),
          archived: t.archived
        } : t);
        next.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return next;
      });
      setEditingThreadId(null);
    } catch (e) {
      console.error('Failed to rename thread:', e);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle>AI Chat Assistant</CardTitle>
              <CardDescription>
                Please log in to start chatting with your AI assistant
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

  if (aiStatus === 'checking') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
              <CardTitle>Loading AI Assistant</CardTitle>
              <CardDescription>
                Checking AI service status...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (aiStatus === 'not_configured') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <CardTitle>AI Service Not Configured</CardTitle>
              <CardDescription>
                The AI chat feature requires an OpenAI API key to be configured. 
                Please contact your administrator to set up the AI service.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>For developers:</strong></p>
                <p>Add your OpenAI API key to the <code>.env</code> file:</p>
                <code className="block bg-muted p-2 rounded">
                  OPENAI_API_KEY="sk-your-api-key-here"
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (aiStatus === 'error') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <CardTitle>AI Service Unavailable</CardTitle>
              <CardDescription>
                The AI chat service is temporarily unavailable. Please try again later.
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
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Thread Sidebar */}
      <div className={`bg-muted/30 border-r transition-all duration-300 flex flex-col ${
        sidebarOpen ? 'w-80' : 'w-0'
      } overflow-hidden`}>
        <div className="p-4 border-b">
          <Button 
            onClick={createNewThread}
            className="w-full"
            size="sm"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {threads.filter(t => !t.archived).map(thread => (
              <ContextMenu.Root key={thread.id}>
                <ContextMenu.Trigger asChild>
                  <div
                    className={`p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                      currentThreadId === thread.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setLocation(`/ai-chat/${thread.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {editingThreadId === thread.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value.slice(0, 120))}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.stopPropagation(); saveThreadRename(thread.id); }
                              if (e.key === 'Escape') { e.stopPropagation(); setEditingThreadId(null); }
                            }}
                            className="border rounded px-2 py-1 text-sm w-full"
                            placeholder="Thread title"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); saveThreadRename(thread.id); }}
                            className="h-6 px-2"
                            aria-label="Save name"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setEditingThreadId(null); }}
                            className="h-6 px-2"
                            aria-label="Cancel rename"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm truncate flex-1" title={thread.title}>
                          {thread.title}
                        </span>
                      )}
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteThread(thread.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </ContextMenu.Trigger>
                <ContextMenu.Content className="rounded-md border bg-popover p-1 text-sm shadow-md">
                  <ContextMenu.Item
                    className="cursor-pointer select-none rounded px-2 py-1.5 hover:bg-muted"
                    onSelect={() => { setEditingThreadId(thread.id); setEditingTitle(thread.title); }}
                  >
                    Rename
                  </ContextMenu.Item>
                  <ContextMenu.Item
                    className="cursor-pointer select-none rounded px-2 py-1.5 hover:bg-muted"
                    onSelect={() => archiveThread(thread.id)}
                  >
                    Archive
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Root>
            ))}
          </div>
          
          {threads.filter(t => t.archived).length > 0 && (
            <>
              <div className="mt-4 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Archived</h3>
              </div>
              <div className="space-y-1">
                {threads.filter(t => t.archived).map(thread => (
                  <ContextMenu.Root key={thread.id}>
                    <ContextMenu.Trigger asChild>
                      <div
                        className={`p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors opacity-60 ${
                          currentThreadId === thread.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => setLocation(`/ai-chat/${thread.id}`)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          {editingThreadId === thread.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value.slice(0, 120))}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.stopPropagation(); saveThreadRename(thread.id); }
                                  if (e.key === 'Escape') { e.stopPropagation(); setEditingThreadId(null); }
                                }}
                                className="border rounded px-2 py-1 text-sm w-full"
                                placeholder="Thread title"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); saveThreadRename(thread.id); }}
                                className="h-6 px-2"
                                aria-label="Save name"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setEditingThreadId(null); }}
                                className="h-6 px-2"
                                aria-label="Cancel rename"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-sm truncate flex-1" title={thread.title}>
                              {thread.title}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteThread(thread.id);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Content className="rounded-md border bg-popover p-1 text-sm shadow-md">
                      <ContextMenu.Item
                        className="cursor-pointer select-none rounded px-2 py-1.5 hover:bg-muted"
                        onSelect={() => { setEditingThreadId(thread.id); setEditingTitle(thread.title); }}
                      >
                        Rename
                      </ContextMenu.Item>
                      <ContextMenu.Item
                        className="cursor-pointer select-none rounded px-2 py-1.5 hover:bg-muted"
                        onSelect={() => unarchiveThread(thread.id)}
                      >
                        Restore
                      </ContextMenu.Item>
                    </ContextMenu.Content>
                  </ContextMenu.Root>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-medium truncate">
                {currentThreadId ? (threads.find(t => t.id === currentThreadId)?.title || "Chat") : "Chat"}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {currentThreadId ? (
            loadingMessages ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 animate-spin" />
                  <p>Loading messages...</p>
                </div>
              </div>
            ) : (
              <AIRuntimeProvider
                key={currentThreadId}
                threadId={currentThreadId}
                initialMessages={messagesThreadId === currentThreadId ? threadMessages : []}
                onFinish={handleFinish}
              >
                <Thread />
                <CreateTodoToolUI />
              </AIRuntimeProvider>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                <p>Create a new chat to get started</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-3 text-center text-xs text-muted-foreground">
          <p>
            AI responses are generated by OpenAI and may not always be accurate. 
            Use responsibly and verify important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
