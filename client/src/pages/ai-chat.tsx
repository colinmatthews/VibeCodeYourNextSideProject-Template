import { Thread } from "@/components/assistant-ui/thread";
import { AIRuntimeProvider } from "@/components/AIRuntimeProvider";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Zap, Shield, Clock, Menu, PlusCircle, Archive, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { nanoid } from "nanoid";

interface ThreadData {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  archived: boolean;
}

const AIChat = () => {
  const { user, getToken } = useAuth();
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'not_configured' | 'error'>('checking');
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);

  // Get user token
  useEffect(() => {
    if (user) {
      getToken().then(setToken);
    }
  }, [user, getToken]);

  // Check AI service status
  useEffect(() => {
    const checkAIStatus = async () => {
      if (!token) return;
      
      try {
        const response = await fetch('/api/ai/status', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setAiStatus(data.status === 'ready' ? 'ready' : 'not_configured');
        } else {
          setAiStatus('error');
        }
      } catch (error) {
        console.error('Failed to check AI status:', error);
        setAiStatus('error');
      }
    };

    checkAIStatus();
  }, [token]);

  // Fetch threads on mount
  useEffect(() => {
    if (token) {
      fetchThreads();
    }
  }, [token]);

  // Fetch messages when thread changes
  useEffect(() => {
    if (token && currentThreadId) {
      fetchThreadMessages(currentThreadId);
    } else {
      setThreadMessages([]);
    }
  }, [token, currentThreadId]);

  const fetchThreads = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/ai/threads', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allThreads = [
          ...data.threads.map((t: any) => ({ ...t, id: t.remoteId, archived: false })),
          ...data.archivedThreads.map((t: any) => ({ ...t, id: t.remoteId, archived: true }))
        ];
        setThreads(allThreads);
        
        // Set first thread as current if none selected
        if (!currentThreadId && allThreads.length > 0) {
          setCurrentThreadId(allThreads[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (threadId: string) => {
    if (!token) return;
    
    try {
      const response = await fetch(`/api/ai/threads/${threadId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert messages to the format expected by useChat (UIMessage format)
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content[0].text,
          createdAt: new Date(msg.createdAt)
        }));
        // Sort messages by timestamp to ensure proper order
        formattedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        setThreadMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Failed to fetch thread messages:', error);
      setThreadMessages([]);
    }
  };

  const createNewThread = async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/ai/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Chat' })
      });
      
      if (response.ok) {
        const thread = await response.json();
        const newThread = {
          id: thread.remoteId,
          title: thread.title,
          createdAt: new Date(thread.createdAt),
          updatedAt: new Date(thread.updatedAt),
          archived: false
        };
        setThreads(prev => [newThread, ...prev]);
        setCurrentThreadId(newThread.id);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const archiveThread = async (threadId: string) => {
    if (!token) return;
    
    try {
      await fetch(`/api/ai/threads/${threadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ archived: true })
      });
      
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, archived: true } : t
      ));
    } catch (error) {
      console.error('Failed to archive thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!token) return;
    
    try {
      await fetch(`/api/ai/threads/${threadId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        const remainingThreads = threads.filter(t => t.id !== threadId);
        setCurrentThreadId(remainingThreads.length > 0 ? remainingThreads[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
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
              <div
                key={thread.id}
                className={`p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${
                  currentThreadId === thread.id ? 'bg-muted' : ''
                }`}
                onClick={() => setCurrentThreadId(thread.id)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm truncate flex-1">{thread.title}</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveThread(thread.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Archive className="h-3 w-3" />
                    </Button>
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
            ))}
          </div>
          
          {threads.filter(t => t.archived).length > 0 && (
            <>
              <div className="mt-4 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground">Archived</h3>
              </div>
              <div className="space-y-1">
                {threads.filter(t => t.archived).map(thread => (
                  <div
                    key={thread.id}
                    className={`p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors opacity-60 ${
                      currentThreadId === thread.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setCurrentThreadId(thread.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{thread.title}</span>
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
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">AI Chat Assistant</h1>
                <p className="text-sm text-muted-foreground">
                  {currentThreadId ? `Thread: ${threads.find(t => t.id === currentThreadId)?.title || 'Chat'}` : 'Select or create a thread'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {currentThreadId ? (
            <AIRuntimeProvider 
              key={currentThreadId}
              token={token || undefined} 
              threadId={currentThreadId}
              initialMessages={threadMessages}
            >
              <Thread />
            </AIRuntimeProvider>
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