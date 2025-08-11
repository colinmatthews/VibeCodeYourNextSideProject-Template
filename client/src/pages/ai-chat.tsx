import { Thread } from "@/components/assistant-ui/thread";
import { AIRuntimeProvider } from "@/components/AIRuntimeProvider";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Zap, Shield, Clock } from "lucide-react";
import { useState, useEffect } from "react";

const AIChat = () => {
  const { user, getToken } = useAuth();
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'not_configured' | 'error'>('checking');
  const [token, setToken] = useState<string | null>(null);

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

  // No custom runtime needed - using AIRuntimeProvider

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
    <div className="container mx-auto px-4 py-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">AI Chat Assistant</h1>
              <p className="text-muted-foreground">
                Chat with your personal AI assistant
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>

        <div className="flex-1 border rounded-lg overflow-hidden">
          <AIRuntimeProvider token={token || undefined}>
            <Thread />
          </AIRuntimeProvider>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
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