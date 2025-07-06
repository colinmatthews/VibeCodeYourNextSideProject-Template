# AI SDK Integration Scanner Prompt

You are an expert AI integration auditor specializing in React, TypeScript, and AI SDK implementations. Please perform a comprehensive scan of this repository to identify issues and opportunities for AI feature integration based on the following preferred stack and conventions:

## Technology Stack
- **Frontend**: React, TypeScript, AI SDK UI (useChat, useCompletion, useObject)
- **Backend**: Node.js, Express, TypeScript with AI SDK Core
- **AI Integration**: Vercel AI SDK v4.1+, Multi-provider support
- **Streaming**: Server-Sent Events, Real-time UI updates

## Critical Anti-Patterns to Identify

### 1. AI SDK Implementation Violations
- [ ] **Direct fetch() calls to AI providers** - Should use AI SDK Core functions (generateText, streamText)
- [ ] **Manual streaming implementation** - Should use AI SDK's built-in streaming capabilities
- [ ] **Single provider lock-in** - Should use provider-agnostic AI SDK patterns
- [ ] **Missing error handling for AI calls** - Should implement proper AI SDK error boundaries
- [ ] **Hardcoded model references** - Should use configurable model selection

### 2. React AI Hooks Misuse
- [ ] **Manual chat state management** - Should use useChat hook
- [ ] **Custom completion logic** - Should use useCompletion hook
- [ ] **Manual streaming UI updates** - Should leverage AI SDK's built-in UI state management
- [ ] **Missing loading states** - Should use isLoading from AI SDK hooks
- [ ] **Improper message formatting** - Should follow AI SDK message structure

### 3. Server Route Implementation Issues
- [ ] **Missing toDataStreamResponse()** - Should use proper streaming response format
- [ ] **Inconsistent API route structure** - Should follow /api/chat, /api/completion patterns
- [ ] **No provider fallback logic** - Should implement multi-provider redundancy
- [ ] **Missing request validation** - Should validate AI requests before processing
- [ ] **Improper streaming setup** - Should use streamText with proper configuration

### 4. Tool Calling and Function Issues
- [ ] **Manual tool execution logic** - Should use AI SDK's tool() function
- [ ] **Missing tool parameter validation** - Should use Zod schemas for tool parameters
- [ ] **No maxSteps configuration** - Should limit tool calling iterations
- [ ] **Missing tool error handling** - Should handle tool execution failures gracefully
- [ ] **Improper tool result formatting** - Should return properly structured tool results

### 5. Multi-Modal Integration Problems
- [ ] **Missing image generation capabilities** - Should use experimental_generateImage for image features
- [ ] **No structured output support** - Should use experimental_output for object generation
- [ ] **Inconsistent multi-modal handling** - Should properly handle text, image, and structured data
- [ ] **Missing model capability checks** - Should verify model supports required features
- [ ] **No fallback for unsupported features** - Should gracefully handle capability limitations

### 6. Performance and Optimization Issues
- [ ] **No streaming optimization** - Should use streaming for better UX
- [ ] **Missing response caching** - Should cache appropriate AI responses
- [ ] **Inefficient model selection** - Should use optimal models for each task
- [ ] **No request batching** - Should batch multiple AI requests when possible
- [ ] **Missing abort controllers** - Should implement request cancellation

### 7. Security and Configuration Issues
- [ ] **Exposed API keys** - Should use environment variables for all credentials
- [ ] **Missing rate limiting** - Should implement AI request rate limits
- [ ] **No input sanitization** - Should sanitize user inputs to AI models
- [ ] **Missing authentication** - Should protect AI endpoints appropriately
- [ ] **Improper model access control** - Should restrict model access based on user roles

### 8. Error Handling and Resilience
- [ ] **No provider fallback** - Should fallback to alternative providers on failure
- [ ] **Missing retry logic** - Should implement exponential backoff for failed requests
- [ ] **Poor error user experience** - Should show meaningful error messages to users
- [ ] **No monitoring/telemetry** - Should track AI usage and performance
- [ ] **Missing timeout handling** - Should handle long-running AI requests properly

## AI SDK Best Practices

### Required File Structure
- [ ] **AI route handlers**: `src/app/api/chat/route.ts`, `src/app/api/completion/route.ts`
- [ ] **AI components**: `src/components/ai/ChatInterface.tsx`, `src/components/ai/CompletionForm.tsx`
- [ ] **AI utilities**: `src/lib/ai/providers.ts`, `src/lib/ai/tools.ts`
- [ ] **AI configuration**: `src/config/ai.ts`
- [ ] **AI types**: `src/types/ai.ts`

### Provider Configuration Patterns
```typescript
// ✅ Correct: Multi-provider setup with fallback
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const getModel = (provider: 'openai' | 'anthropic' = 'openai') => {
  switch (provider) {
    case 'openai': return openai('gpt-4');
    case 'anthropic': return anthropic('claude-3-sonnet-20240229');
    default: return openai('gpt-4');
  }
};
```

### Streaming Implementation Patterns
```typescript
// ✅ Correct: Proper streaming route
export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = await streamText({
    model: getModel(),
    messages,
    tools: getAvailableTools(),
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
```

### React Hook Usage Patterns
```typescript
// ✅ Correct: Using AI SDK hooks
function ChatInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    onError: (error) => handleAIError(error),
  });

  return (
    <div>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={isLoading} />
      </form>
    </div>
  );
}
```

## Scanning Instructions

1. **Examine AI integration patterns** throughout the codebase
2. **Identify opportunities** for AI feature enhancement
3. **Check provider implementation** for multi-provider support
4. **Validate streaming setup** and real-time UI updates
5. **Review error handling** for AI-specific scenarios
6. **Assess tool calling** implementation and patterns
7. **Verify security measures** for AI endpoints and data

## Report Format

For each issue found, provide:
- **File path and line number(s)**
- **Issue category** (from above list)
- **Severity level** (Critical/High/Medium/Low/Enhancement)
- **Current problematic code** (snippet)
- **Recommended fix** (AI SDK implementation)
- **AI SDK feature utilized** (useChat, streamText, tool(), etc.)
- **Provider compatibility notes** (if applicable)

## Priority Focus Areas

1. **Core AI SDK integration** - Essential for maintainable AI features
2. **Streaming implementation** - Critical for user experience
3. **Multi-provider support** - Important for resilience and flexibility
4. **Error handling and fallbacks** - Essential for production reliability
5. **Security and rate limiting** - Must be addressed for AI endpoints
6. **Performance optimization** - Important for scalable AI features

## Enhancement Opportunities

### AI Feature Suggestions
- [ ] **Smart content generation** - Use generateText for dynamic content
- [ ] **Real-time chat interfaces** - Implement useChat for user interactions
- [ ] **Intelligent form completion** - Use useCompletion for form assistance
- [ ] **Multi-modal content creation** - Add image generation capabilities
- [ ] **Structured data extraction** - Use generateObject for data parsing
- [ ] **Tool-calling workflows** - Implement complex multi-step AI processes

### Integration Opportunities
- [ ] **Search enhancement** - Add AI-powered search suggestions
- [ ] **Content moderation** - Implement AI content filtering
- [ ] **Personalization** - Add AI-driven user experience customization
- [ ] **Analytics insights** - Use AI for data analysis and reporting
- [ ] **Accessibility improvements** - Add AI-powered accessibility features

## Example Issue Report

```
❌ CRITICAL: Direct OpenAI API call instead of AI SDK
File: src/lib/openai.ts:15-25
Severity: High

Current code:
```javascript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: messages,
    stream: true,
  }),
});
```

Recommended fix:
```javascript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

const result = await streamText({
  model: openai('gpt-4'),
  messages,
});

return result.toDataStreamResponse();
```

AI SDK Features Used: streamText, provider abstraction, built-in streaming
Provider Compatibility: Works with OpenAI, Anthropic, Google, and 20+ other providers
Explanation: This violates the AI SDK pattern and creates provider lock-in. The recommended approach provides streaming, error handling, and multi-provider compatibility out of the box.
```

## Model Context Protocol (MCP) Considerations

For advanced implementations, consider:
- [ ] **Dynamic context updates** - Use experimental_createMCPClient for real-time data
- [ ] **Tool discovery** - Implement MCP for dynamic tool availability
- [ ] **Context synchronization** - Keep AI context in sync with application state
- [ ] **External integrations** - Use MCP for third-party service integration

Please scan the repository thoroughly and provide a comprehensive report of all AI integration issues and enhancement opportunities, organized by category and prioritized by impact on user experience and development efficiency. 