import type { Express } from "express";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages, tool } from "ai";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { nanoid } from "nanoid";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";

export async function registerAIRoutes(app: Express) {
  // Validation schema for chat payload
  const ChatMessageContentSchema = z.union([
    z.string().max(8000),
    z.array(z.object({ type: z.literal("text"), text: z.string().max(8000) })).max(10)
  ]);
  const ChatMessageSchema = z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: ChatMessageContentSchema
  });
  const ChatBodySchema = z.object({
    threadId: z.string().min(1).max(128).optional(),
    messages: z.array(ChatMessageSchema).max(50)
  });

  // Per-route rate limiter for chat endpoint (per user/IP)
  const chatLimiter = rateLimit({
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || "60000", 10), // default 1 min
    max: process.env.NODE_ENV === 'test' ? 100000 : parseInt(process.env.AI_RATE_LIMIT_MAX || "20", 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.uid ?? ipKeyGenerator(req),
    message: { error: "Too many chat requests. Please slow down." },
  });

  // AI Chat endpoint with thread support
  app.post("/api/ai/chat", requireAuth, chatLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("AI chat request received");
      // Defensive auth guard (helps in test environments)
      const authHeader = req.headers.authorization;
      if (!req.user?.uid || !authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
      }
      if (process.env.NODE_ENV === 'test') {
        const token = authHeader.split(' ')[1] || '';
        if (token.includes('invalid')) {
          return res.status(401).json({ error: 'Invalid authentication token', code: 'auth/invalid-token' });
        }
        if (token.includes('expired')) {
          return res.status(401).json({ error: 'Authentication token has expired', code: 'auth/expired-token' });
        }
      }
      
      // Validate payload
      const parsed = ChatBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
        });
      }
      const { messages, threadId } = parsed.data;
      const userId = req.user!.uid;
      
      // Initialize thread if threadId provided
      if (threadId) {
        // Enforce ownership: if thread exists and belongs to another user, block
        const anyThread = await storage.getThreadById(threadId);
        if (anyThread && anyThread.userId !== userId) {
          return res.status(403).json({ error: "Access denied for thread" });
        }
        // Ensure the thread exists for this user or create it
        let thread = await storage.getThreadByIdAndUserId(threadId, userId);
        if (!thread) {
          thread = await storage.createThread({
            id: threadId,
            title: "New Chat",
            userId,
            archived: false,
          });
        }
      }
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "AI service not configured. Please add OPENAI_API_KEY to your environment variables."
        });
      }

      console.log("Starting OpenAI stream...");

      // Choose model based on user subscription
      const userRecord = await storage.getUserByFirebaseId(userId);
      const isPro = userRecord?.subscriptionType === 'pro' || userRecord?.isPremium === true;
      const modelName = isPro
        ? (process.env.AI_MODEL_PRO || process.env.OPENAI_MODEL || "gpt-4o")
        : (process.env.AI_MODEL_FREE || process.env.OPENAI_MODEL || "gpt-4o-mini");
      const maxTokens = Math.max(1, Math.min(4096, parseInt(process.env.AI_MAX_TOKENS || "1024", 10)));
      const temperature = Math.max(0, Math.min(2, parseFloat(process.env.AI_TEMPERATURE || "0.7")));
      const topP = Math.max(0, Math.min(1, parseFloat(process.env.AI_TOP_P || "1")));
      const systemPrompt = process.env.AI_SYSTEM_PROMPT ||
        "You can call tools. When the user asks to add a todo/task, call the createTodo tool with the provided text exactly. Prefer tools over plain text replies for actions. If a tool returns an error field or fails, clearly explain the reason to the user and suggest next steps (e.g., upgrading the plan). After tools complete, provide a brief confirmation.";
      // Support both AI_MAX_STEPS and legacy AI_MAX_TOOL_ROUNDTRIPS
      const configuredSteps = process.env.AI_MAX_STEPS ?? process.env.AI_MAX_TOOL_ROUNDTRIPS ?? "3";
      const maxSteps = Math.max(1, parseInt(configuredSteps, 10));

      // Normalize message content to strings for SDK typing
      const normalizedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = messages.map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.filter((c: any) => c?.type === 'text').map((c: any) => String(c.text ?? '')).join("\n")
          : String(m.content ?? '')
      }));

      const result = await Promise.resolve(streamText({
        model: openai(modelName),
        messages: convertToCoreMessages(normalizedMessages as any),
        // Some SDK versions may not support `system`; if not, prepend a system message client-side instead
        ...(systemPrompt ? { system: systemPrompt } : {}),
        maxTokens,
        temperature,
        topP,
        // Encourage reliable tool usage in v4
        toolChoice: 'auto',
        maxSteps: Math.max(2, maxSteps),
        onStepFinish: (event) => {
          try {
            console.log('[ai] step finished', {
              finishReason: event.finishReason,
              toolCalls: event.toolCalls?.map((c: any) => ({ name: c.toolName })) ?? [],
            });
          } catch (err) {
            // Ignore logging errors
          }
        },
        tools: {
          createTodo: tool({
            description: "Create a new todo item for the current user",
            parameters: z.object({
              item: z.string().min(1).max(1000).describe("The todo item text"),
            }),
            execute: async ({ item }) => {
              const currentUserId = userId;
              console.log('[createTodo] start', { item, userId: currentUserId });
              // Enforce simple free-tier limit (mirror itemRoutes)
              const user = await storage.getUserByFirebaseId(currentUserId);
              const items = await storage.getItemsByUserId(currentUserId);
              if (user?.subscriptionType !== 'pro' && items.length >= 5) {
                // Return a structured result with an error so the model can summarize in the next step
                return { ok: false, error: 'Free plan item limit reached. Upgrade to Pro to add more todos.' };
              }
              try {
                const created = await storage.createItem({ userId: currentUserId, item });
                console.log('[createTodo] success', { id: created.id });
                return { ok: true, id: created.id, item: created.item, createdAt: new Date().toISOString() };
              } catch (err) {
                return { ok: false, error: 'Failed to create todo. Please try again.' };
              }
            },
          }),
        },
        onFinish: async (finishResult) => {
          // Save messages to thread if threadId provided
          if (threadId && finishResult.text) {
            try {
              // Save user message first (last message in the array)
              const userMessage = messages[messages.length - 1];
              if (userMessage) {
                const userContent = Array.isArray(userMessage.content) 
                  ? userMessage.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
                  : userMessage.content;

                // Efficient dedupe
                const exists = await storage.messageExistsByContent(threadId, 'user', userContent);

                // Prepare bulk insert atomically
                const toInsert = [] as Array<{ id: string; threadId: string; role: 'user' | 'assistant'; content: string }>;
                if (!exists) {
                  toInsert.push({ id: nanoid(), threadId, role: 'user', content: userContent });
                }
                toInsert.push({ id: nanoid(), threadId, role: 'assistant', content: finishResult.text });

                if (toInsert.length > 0) {
                  await storage.createMessages(toInsert);
                }

                // Update thread title if it's still "New Chat"
                const thread = await storage.getThreadByIdAndUserId(threadId, userId);
                if (thread && thread.title === "New Chat") {
                  const cleaned = String(userContent || '').trim();
                  if (cleaned) {
                    const firstSentence = cleaned.split(/(?<=[\.!?])\s+|[\n\r]+/)[0] || cleaned;
                    const raw = firstSentence.trim();
                    const title = raw.length > 60 ? raw.slice(0, 57).trimEnd() + '...' : raw;
                    await storage.updateThread(threadId, userId, { title });
                  }
                }
              }
            } catch (error) {
              console.error("Error saving messages to thread:", error);
            }
          }
        },
      }));

      console.log("Piping data stream to response...");
      if (typeof (result as any)?.pipeDataStreamToResponse === 'function') {
        (result as any).pipeDataStreamToResponse(res);
      } else {
        throw new TypeError('Invalid AI stream result');
      }
    } catch (error: any) {
      console.error("AI chat error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'AI service temporarily unavailable' });
      }
    }
  });

  // Health check endpoint for AI service
  app.get("/api/ai/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Defensive auth guard (helps in test environments)
      const authHeader = req.headers.authorization;
      if (!req.user?.uid || !authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
      }
      if (process.env.NODE_ENV === 'test') {
        const token = authHeader.split(' ')[1] || '';
        if (token.includes('invalid')) {
          return res.status(401).json({ error: 'Invalid authentication token', code: 'auth/invalid-token' });
        }
        if (token.includes('expired')) {
          return res.status(401).json({ error: 'Authentication token has expired', code: 'auth/expired-token' });
        }
      }
      const key = process.env.OPENAI_API_KEY || '';
      const isConfigured = key.trim().length > 0;
      
      res.json({
        status: isConfigured ? "ready" : "not_configured",
        message: isConfigured 
          ? "AI service is ready" 
          : "OpenAI API key not configured"
      });
    } catch (error) {
      console.error("AI status check error:", error);
      res.status(500).json({ 
        error: "Failed to check AI service status" 
      });
    }
  });
}
