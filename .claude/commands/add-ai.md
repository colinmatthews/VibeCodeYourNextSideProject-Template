# /add-ai - Add AI Features with AI SDK

You are a helpful assistant that guides users through adding AI features to their VibeCode Template app using the Vercel AI SDK. This leverages existing authentication, database, and API patterns to integrate AI services with a unified interface.

## What This Command Does

Helps users add AI functionality using existing integrations:
- User authentication system for personalized AI experiences
- Database (Render PostgreSQL) for storing AI conversations and usage
- API routing patterns for AI service integration
- File storage (Firebase) for AI-generated content
- Existing form and UI components

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**AI Feature Type:**
- [ ] What should the AI do?
  - a) Chat assistant/customer support bot
  - b) Content generation (text, blog posts, descriptions)
  - c) Image generation or analysis
  - d) Data analysis and insights
  - e) Writing assistance (editing, summarizing)
  - f) Custom AI for your specific business

**AI Service:**
- [ ] Which AI service do you prefer?
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic Claude (Claude 3, Claude 2)
  - Google Gemini
  - Mistral AI
  - Cohere
  - Multiple providers (AI SDK makes switching easy)

**Integration Location:**
- [ ] Where should the AI feature appear?
  - New dedicated AI page
  - Integration into existing pages
  - Modal/popup interface
  - Chat widget in corner

## Step 2: Implementation Based on User Answers

### Option A: Chat Assistant

If user wants a chat assistant:

1. **Create AI Chat Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const aiConversations = pgTable('ai_conversations', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     title: text('title'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   export const aiMessages = pgTable('ai_messages', {
     id: serial('id').primaryKey(),
     conversationId: integer('conversation_id').references(() => aiConversations.id),
     role: text('role').$type<'user' | 'assistant' | 'system'>().notNull(),
     content: text('content').notNull(),
     tokens: integer('tokens'),
     createdAt: timestamp('created_at').defaultNow(),
   });
   
   export const aiUsage = pgTable('ai_usage', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     feature: text('feature'), // 'chat', 'generation', etc.
     tokens: integer('tokens'),
     cost: integer('cost'), // in cents
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Install AI SDK Dependencies**
   ```bash
   npm install ai @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/google @ai-sdk/mistral
   ```

3. **Create AI Service Integration**
   ```typescript
   // server/services/aiService.ts
   import { createOpenAI } from '@ai-sdk/openai';
   import { createAnthropic } from '@ai-sdk/anthropic';
   import { createGoogleGenerativeAI } from '@ai-sdk/google';
   import { createMistral } from '@ai-sdk/mistral';
   import { generateText, streamText } from 'ai';
   
   // Initialize providers based on environment variables
   const providers = {
     openai: process.env.OPENAI_API_KEY ? createOpenAI({
       apiKey: process.env.OPENAI_API_KEY,
     }) : null,
     anthropic: process.env.ANTHROPIC_API_KEY ? createAnthropic({
       apiKey: process.env.ANTHROPIC_API_KEY,
     }) : null,
     google: process.env.GOOGLE_AI_API_KEY ? createGoogleGenerativeAI({
       apiKey: process.env.GOOGLE_AI_API_KEY,
     }) : null,
     mistral: process.env.MISTRAL_API_KEY ? createMistral({
       apiKey: process.env.MISTRAL_API_KEY,
     }) : null,
   };
   
   export async function generateChatResponse(
     messages: Array<{role: string, content: string}>,
     provider: string = 'openai',
     model?: string
   ) {
     try {
       const selectedProvider = providers[provider as keyof typeof providers];
       if (!selectedProvider) {
         throw new Error(`Provider ${provider} not configured`);
       }
       
       // Default models for each provider
       const defaultModels = {
         openai: 'gpt-4-turbo',
         anthropic: 'claude-3-opus-20240229',
         google: 'gemini-pro',
         mistral: 'mistral-large-latest',
       };
       
       const selectedModel = model || defaultModels[provider as keyof typeof defaultModels];
       
       const { text, usage } = await generateText({
         model: selectedProvider(selectedModel),
         messages: messages,
         maxTokens: 500,
         temperature: 0.7,
       });
       
       return {
         message: text,
         tokens: usage?.totalTokens || 0,
         cost: calculateCost(usage?.totalTokens || 0, provider, selectedModel),
       };
     } catch (error) {
       console.error('AI service error:', error);
       throw new Error('Failed to generate AI response');
     }
   }
   
   export async function streamChatResponse(
     messages: Array<{role: string, content: string}>,
     provider: string = 'openai',
     model?: string
   ) {
     const selectedProvider = providers[provider as keyof typeof providers];
     if (!selectedProvider) {
       throw new Error(`Provider ${provider} not configured`);
     }
     
     const defaultModels = {
       openai: 'gpt-4-turbo',
       anthropic: 'claude-3-opus-20240229',
       google: 'gemini-pro',
       mistral: 'mistral-large-latest',
     };
     
     const selectedModel = model || defaultModels[provider as keyof typeof defaultModels];
     
     return streamText({
       model: selectedProvider(selectedModel),
       messages: messages,
       maxTokens: 500,
       temperature: 0.7,
     });
   }
   
   function calculateCost(tokens: number, provider: string, model: string): number {
     // Simplified pricing calculation - adjust based on actual pricing
     const pricing = {
       openai: {
         'gpt-4-turbo': 0.01, // $0.01 per 1K tokens
         'gpt-3.5-turbo': 0.001, // $0.001 per 1K tokens
       },
       anthropic: {
         'claude-3-opus-20240229': 0.015,
         'claude-3-sonnet-20240229': 0.003,
       },
       google: {
         'gemini-pro': 0.0005,
       },
       mistral: {
         'mistral-large-latest': 0.008,
       },
     };
     
     const rate = pricing[provider]?.[model] || 0.01;
     return Math.round((tokens / 1000) * rate * 100); // in cents
   }
   ```

4. **Create AI Chat API Routes**
   ```typescript
   // server/routes/aiRoutes.ts
   import express from 'express';
   import { generateChatResponse } from '../services/aiService';
   import { aiConversations, aiMessages, aiUsage } from '../../shared/schema';
   import { db } from '../db';
   
   const router = express.Router();
   
   router.post('/chat', async (req, res) => {
     try {
       const { conversationId, message, provider = 'openai', model } = req.body;
       const userId = req.user.firebaseId;
       
       // Check usage limits for free users
       if (!req.user.isPremium) {
         const todayUsage = await getDailyUsage(userId);
         if (todayUsage > 10) { // 10 messages per day for free users
           return res.status(429).json({ error: 'Daily limit reached. Upgrade to Pro for unlimited usage.' });
         }
       }
       
       let conversation;
       if (conversationId) {
         conversation = await getConversation(conversationId);
       } else {
         conversation = await createConversation(userId, message.substring(0, 50));
       }
       
       // Save user message
       await saveMessage(conversation.id, 'user', message);
       
       // Get conversation history
       const messages = await getConversationMessages(conversation.id);
       
       // Generate AI response
       const aiResponse = await generateChatResponse(messages, provider, model);
       
       // Save AI response
       await saveMessage(conversation.id, 'assistant', aiResponse.message, aiResponse.tokens);
       
       // Track usage
       await trackUsage(userId, 'chat', aiResponse.tokens, aiResponse.cost);
       
       res.json({
         conversationId: conversation.id,
         message: aiResponse.message,
         tokens: aiResponse.tokens,
         provider,
         model,
       });
       
     } catch (error) {
       console.error('Chat error:', error);
       res.status(500).json({ error: 'Failed to process chat message' });
     }
   });
   
   // Streaming endpoint for real-time responses
   router.post('/chat/stream', async (req, res) => {
     try {
       const { conversationId, message, provider = 'openai', model } = req.body;
       const userId = req.user.firebaseId;
       
       // Set up SSE headers
       res.setHeader('Content-Type', 'text/event-stream');
       res.setHeader('Cache-Control', 'no-cache');
       res.setHeader('Connection', 'keep-alive');
       
       // Check usage limits
       if (!req.user.isPremium) {
         const todayUsage = await getDailyUsage(userId);
         if (todayUsage > 10) {
           res.write(`data: ${JSON.stringify({ error: 'Daily limit reached' })}\n\n`);
           res.end();
           return;
         }
       }
       
       // Get or create conversation
       let conversation;
       if (conversationId) {
         conversation = await getConversation(conversationId);
       } else {
         conversation = await createConversation(userId, message.substring(0, 50));
       }
       
       // Save user message
       await saveMessage(conversation.id, 'user', message);
       
       // Get conversation history
       const messages = await getConversationMessages(conversation.id);
       
       // Stream AI response
       const { textStream } = await streamChatResponse(messages, provider, model);
       
       let fullResponse = '';
       for await (const text of textStream) {
         fullResponse += text;
         res.write(`data: ${JSON.stringify({ text })}\n\n`);
       }
       
       // Save complete response
       await saveMessage(conversation.id, 'assistant', fullResponse);
       
       res.write(`data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`);
       res.end();
       
     } catch (error) {
       console.error('Stream error:', error);
       res.write(`data: ${JSON.stringify({ error: 'Failed to stream response' })}\n\n`);
       res.end();
     }
   });
   
   router.get('/conversations', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const conversations = await getUserConversations(userId);
       res.json(conversations);
     } catch (error) {
       res.status(500).json({ error: 'Failed to fetch conversations' });
     }
   });
   
   export default router;
   ```

5. **Create Chat Component with Streaming Support**
   ```tsx
   // client/src/components/AIChat.tsx
   import { useState, useEffect, useRef } from 'react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
   import { Send, Bot, User, Sparkles } from 'lucide-react';
   
   interface Message {
     id: string;
     role: 'user' | 'assistant';
     content: string;
     timestamp: string;
   }
   
   export function AIChat() {
     const [messages, setMessages] = useState<Message[]>([]);
     const [input, setInput] = useState('');
     const [isLoading, setIsLoading] = useState(false);
     const [conversationId, setConversationId] = useState<number | null>(null);
     const [provider, setProvider] = useState('openai');
     const [streamingEnabled, setStreamingEnabled] = useState(true);
     const messagesEndRef = useRef<HTMLDivElement>(null);
   
     const scrollToBottom = () => {
       messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
     };
   
     useEffect(() => {
       scrollToBottom();
     }, [messages]);
   
     const sendMessage = async (e: React.FormEvent) => {
       e.preventDefault();
       if (!input.trim() || isLoading) return;
   
       const userMessage = {
         id: Date.now().toString(),
         role: 'user' as const,
         content: input,
         timestamp: new Date().toISOString(),
       };
   
       setMessages(prev => [...prev, userMessage]);
       setInput('');
       setIsLoading(true);
   
       try {
         if (streamingEnabled) {
           // Create a placeholder message for streaming
           const assistantMessage = {
             id: (Date.now() + 1).toString(),
             role: 'assistant' as const,
             content: '',
             timestamp: new Date().toISOString(),
           };
           setMessages(prev => [...prev, assistantMessage]);
   
           // Use EventSource for SSE streaming
           const response = await fetch('/api/chat/stream', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               conversationId,
               message: input,
               provider,
             }),
           });
   
           const reader = response.body?.getReader();
           const decoder = new TextDecoder();
           
           if (reader) {
             while (true) {
               const { done, value } = await reader.read();
               if (done) break;
               
               const chunk = decoder.decode(value);
               const lines = chunk.split('\n');
               
               for (const line of lines) {
                 if (line.startsWith('data: ')) {
                   try {
                     const data = JSON.parse(line.slice(6));
                     if (data.text) {
                       setMessages(prev => {
                         const newMessages = [...prev];
                         const lastMessage = newMessages[newMessages.length - 1];
                         if (lastMessage.role === 'assistant') {
                           lastMessage.content += data.text;
                         }
                         return newMessages;
                       });
                     } else if (data.done) {
                       setConversationId(data.conversationId);
                     } else if (data.error) {
                       throw new Error(data.error);
                     }
                   } catch (e) {
                     // Ignore parse errors
                   }
                 }
               }
             }
           }
         } else {
           // Non-streaming request
           const response = await fetch('/api/chat', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               conversationId,
               message: input,
               provider,
             }),
           });
   
           const data = await response.json();
   
           if (response.ok) {
             setConversationId(data.conversationId);
             
             const assistantMessage = {
               id: (Date.now() + 1).toString(),
               role: 'assistant' as const,
               content: data.message,
               timestamp: new Date().toISOString(),
             };
   
             setMessages(prev => [...prev, assistantMessage]);
           } else {
             throw new Error(data.error || 'Failed to send message');
           }
         }
       } catch (error) {
         console.error('Error sending message:', error);
         const errorMessage = {
           id: (Date.now() + 1).toString(),
           role: 'assistant' as const,
           content: 'Sorry, something went wrong. Please try again.',
           timestamp: new Date().toISOString(),
         };
         setMessages(prev => [...prev, errorMessage]);
       } finally {
         setIsLoading(false);
       }
     };
   
     return (
       <Card className="h-96 flex flex-col">
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Sparkles size={20} />
             AI Assistant
           </CardTitle>
           <div className="flex gap-2 mt-2">
             <Select value={provider} onValueChange={setProvider}>
               <SelectTrigger className="w-32">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="openai">OpenAI</SelectItem>
                 <SelectItem value="anthropic">Claude</SelectItem>
                 <SelectItem value="google">Gemini</SelectItem>
                 <SelectItem value="mistral">Mistral</SelectItem>
               </SelectContent>
             </Select>
             <Button
               variant={streamingEnabled ? "default" : "outline"}
               size="sm"
               onClick={() => setStreamingEnabled(!streamingEnabled)}
             >
               {streamingEnabled ? "Streaming" : "Standard"}
             </Button>
           </div>
         </CardHeader>
         <CardContent className="flex-1 flex flex-col">
           <div className="flex-1 overflow-y-auto space-y-4 mb-4">
             {messages.length === 0 && (
               <div className="text-center text-gray-500 py-8">
                 Start a conversation with your AI assistant!
               </div>
             )}
             
             {messages.map((message) => (
               <div
                 key={message.id}
                 className={`flex gap-3 ${
                   message.role === 'user' ? 'justify-end' : 'justify-start'
                 }`}
               >
                 <div
                   className={`flex gap-2 max-w-[80%] ${
                     message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                   }`}
                 >
                   <div className="flex-shrink-0">
                     {message.role === 'user' ? (
                       <User size={20} className="text-blue-600" />
                     ) : (
                       <Bot size={20} className="text-green-600" />
                     )}
                   </div>
                   <div
                     className={`px-3 py-2 rounded-lg ${
                       message.role === 'user'
                         ? 'bg-blue-600 text-white'
                         : 'bg-gray-100 text-gray-800'
                     }`}
                   >
                     {message.content}
                   </div>
                 </div>
               </div>
             ))}
             
             {isLoading && (
               <div className="flex justify-start">
                 <div className="flex gap-2">
                   <Bot size={20} className="text-green-600" />
                   <div className="bg-gray-100 px-3 py-2 rounded-lg">
                     <div className="flex space-x-1">
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                       <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             
             <div ref={messagesEndRef} />
           </div>
           
           <form onSubmit={sendMessage} className="flex gap-2">
             <Input
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Type your message..."
               disabled={isLoading}
               className="flex-1"
             />
             <Button type="submit" disabled={isLoading || !input.trim()}>
               <Send size={16} />
             </Button>
           </form>
         </CardContent>
       </Card>
     );
   }
   ```

### Option B: Content Generation

If user wants content generation:

1. **Create Content Generation Component**
   ```tsx
   // client/src/components/ContentGenerator.tsx
   import { useState } from 'react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Textarea } from './ui/textarea';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
   
   export function ContentGenerator() {
     const [prompt, setPrompt] = useState('');
     const [contentType, setContentType] = useState('blog-post');
     const [generatedContent, setGeneratedContent] = useState('');
     const [isGenerating, setIsGenerating] = useState(false);
   
     const generateContent = async () => {
       setIsGenerating(true);
       try {
         const response = await fetch('/api/generate-content', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             prompt,
             contentType,
           }),
         });
         
         const data = await response.json();
         setGeneratedContent(data.content);
       } catch (error) {
         console.error('Generation error:', error);
         setGeneratedContent('Error generating content. Please try again.');
       } finally {
         setIsGenerating(false);
       }
     };
   
     return (
       <div className="space-y-6">
         <div>
           <label className="block text-sm font-medium mb-2">Content Type</label>
           <Select value={contentType} onValueChange={setContentType}>
             <SelectTrigger>
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="blog-post">Blog Post</SelectItem>
               <SelectItem value="product-description">Product Description</SelectItem>
               <SelectItem value="email">Email</SelectItem>
               <SelectItem value="social-media">Social Media Post</SelectItem>
               <SelectItem value="ad-copy">Ad Copy</SelectItem>
             </SelectContent>
           </Select>
         </div>
         
         <div>
           <label className="block text-sm font-medium mb-2">Prompt</label>
           <Textarea
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
             placeholder="Describe what you want to create..."
             rows={4}
           />
         </div>
         
         <Button 
           onClick={generateContent} 
           disabled={!prompt.trim() || isGenerating}
           className="w-full"
         >
           {isGenerating ? 'Generating...' : 'Generate Content'}
         </Button>
         
         {generatedContent && (
           <div>
             <label className="block text-sm font-medium mb-2">Generated Content</label>
             <Textarea
               value={generatedContent}
               onChange={(e) => setGeneratedContent(e.target.value)}
               rows={12}
               className="font-mono text-sm"
             />
             <div className="mt-2 flex gap-2">
               <Button 
                 onClick={() => navigator.clipboard.writeText(generatedContent)}
                 variant="outline"
               >
                 Copy to Clipboard
               </Button>
               <Button 
                 onClick={() => {
                   const blob = new Blob([generatedContent], { type: 'text/plain' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `generated-${contentType}.txt`;
                   a.click();
                 }}
                 variant="outline"
               >
                 Download
               </Button>
             </div>
           </div>
         )}
       </div>
     );
   }
   ```

### Option C: Image Generation

If user wants image generation:

1. **Create Image Generation API**
   ```typescript
   // Add to server/services/aiService.ts
   import { generateObject } from 'ai';
   import { z } from 'zod';
   
   export async function generateImage(prompt: string, provider: string = 'openai') {
     try {
       if (provider === 'openai' && providers.openai) {
         // Use OpenAI for image generation
         const openai = createOpenAI({
           apiKey: process.env.OPENAI_API_KEY,
         });
         
         const response = await openai.images.generate({
           model: 'dall-e-3',
           prompt,
           n: 1,
           size: '1024x1024',
           quality: 'standard',
         });
         
         return {
           imageUrl: response.data[0].url,
           revisedPrompt: response.data[0].revised_prompt,
         };
       } else {
         // For other providers, generate image description
         const selectedProvider = providers[provider as keyof typeof providers];
         if (!selectedProvider) {
           throw new Error(`Provider ${provider} not configured`);
         }
         
         const { object } = await generateObject({
           model: selectedProvider('gpt-4'),
           schema: z.object({
             description: z.string(),
             style: z.string(),
             elements: z.array(z.string()),
           }),
           prompt: `Create a detailed image description for: ${prompt}`,
         });
         
         return {
           description: object.description,
           style: object.style,
           elements: object.elements,
         };
       }
     } catch (error) {
       console.error('Image generation error:', error);
       throw new Error('Failed to generate image');
     }
   }
   ```

2. **Create Image Generator Component**
   ```tsx
   // client/src/components/ImageGenerator.tsx
   import { useState } from 'react';
   import { Button } from './ui/button';
   import { Input } from './ui/input';
   import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
   
   export function ImageGenerator() {
     const [prompt, setPrompt] = useState('');
     const [imageUrl, setImageUrl] = useState('');
     const [isGenerating, setIsGenerating] = useState(false);
   
     const generateImage = async () => {
       setIsGenerating(true);
       try {
         const response = await fetch('/api/generate-image', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ prompt }),
         });
         
         const data = await response.json();
         setImageUrl(data.imageUrl);
       } catch (error) {
         console.error('Generation error:', error);
       } finally {
         setIsGenerating(false);
       }
     };
   
     return (
       <Card>
         <CardHeader>
           <CardTitle>AI Image Generator</CardTitle>
         </CardHeader>
         <CardContent className="space-y-4">
           <div className="flex gap-2">
             <Input
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Describe the image you want to create..."
               className="flex-1"
             />
             <Button 
               onClick={generateImage} 
               disabled={!prompt.trim() || isGenerating}
             >
               {isGenerating ? 'Generating...' : 'Generate'}
             </Button>
           </div>
           
           {imageUrl && (
             <div className="space-y-2">
               <img 
                 src={imageUrl} 
                 alt="Generated image" 
                 className="w-full rounded-lg"
               />
               <Button 
                 onClick={() => {
                   const a = document.createElement('a');
                   a.href = imageUrl;
                   a.download = 'generated-image.png';
                   a.click();
                 }}
                 variant="outline"
                 className="w-full"
               >
                 Download Image
               </Button>
             </div>
           )}
         </CardContent>
       </Card>
     );
   }
   ```

## Step 3: Environment Variables

Add AI service API keys:

```env
# Add to .env
OPENAI_API_KEY="sk-your-openai-key"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key"
GOOGLE_AI_API_KEY="your-google-ai-key"
MISTRAL_API_KEY="your-mistral-key"
```

## Step 4: Usage Limits and Pricing

Implement usage tracking:

```typescript
// server/middleware/usageLimit.ts
export function checkUsageLimit(feature: string, freeLimit: number) {
  return async (req: any, res: any, next: any) => {
    const userId = req.user.firebaseId;
    const isPremium = req.user.isPremium;
    
    if (!isPremium) {
      const usage = await getDailyUsage(userId, feature);
      if (usage >= freeLimit) {
        return res.status(429).json({
          error: 'Daily limit reached',
          message: 'Upgrade to Pro for unlimited usage',
          upgradeUrl: '/pricing'
        });
      }
    }
    
    next();
  };
}
```

## Step 5: Testing Instructions

1. **Test AI Integration**
   - [ ] API keys are working
   - [ ] Responses are generated correctly
   - [ ] Error handling works properly
   - [ ] Usage tracking is accurate

2. **Test User Experience**
   - [ ] Interface is intuitive
   - [ ] Loading states work
   - [ ] Content can be saved/copied
   - [ ] Mobile responsive

3. **Test Limits**
   - [ ] Free user limits are enforced
   - [ ] Pro users have unlimited access
   - [ ] Appropriate error messages

## Step 6: Next Steps

After implementation:
- [ ] Add conversation history management
- [ ] Implement AI fine-tuning for your use case
- [ ] Add content moderation/filtering
- [ ] Create usage analytics dashboard
- [ ] Add AI-powered features to existing pages

## Common AI Integration Patterns

**Chat Interface**: Best for customer support, general assistance
**Content Generation**: Perfect for marketing, writing assistance
**Image Generation**: Great for creative projects, marketing materials
**Data Analysis**: Ideal for business insights, report generation

## AI SDK Benefits

- **Unified API**: Switch between providers without changing code
- **Streaming Support**: Real-time responses for better UX
- **Type Safety**: Full TypeScript support
- **Provider Flexibility**: Easy to add new AI providers
- **Built-in Utilities**: generateText, generateObject, streamText
- **Cost Optimization**: Compare pricing across providers

## Remember

- Monitor AI costs carefully (tokens can add up quickly)
- Implement proper rate limiting
- Store conversation history for better user experience
- Use environment variables for API keys
- Consider content moderation for public-facing AI features
- Test thoroughly with different prompts and edge cases
- Provide clear usage limits and upgrade paths
- Take advantage of AI SDK's unified interface for provider switching
- Use streaming for better user experience
- Implement proper error handling for different providers