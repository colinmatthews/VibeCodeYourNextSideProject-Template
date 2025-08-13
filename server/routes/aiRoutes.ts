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
    max: parseInt(process.env.AI_RATE_LIMIT_MAX || "20", 10),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => req.user?.uid ?? ipKeyGenerator(req),
    message: { error: "Too many chat requests. Please slow down." },
  });

  // AI Chat endpoint with thread support
  app.post("/api/ai/chat", requireAuth, chatLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("AI chat request received");
      
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
        "You can call tools. When the user asks to add a todo/task, call the createTodo tool with the provided text exactly. Prefer tools over plain text replies for actions. After tools complete, provide a brief confirmation.";
      const maxToolRoundtrips = Math.max(0, Math.min(5, parseInt(process.env.AI_MAX_TOOL_ROUNDTRIPS || "2", 10)));

      const result = streamText({
        model: openai(modelName),
        messages: convertToCoreMessages(messages),
        // Some SDK versions may not support `system`; if not, prepend a system message client-side instead
        ...(systemPrompt ? { system: systemPrompt } : {}),
        maxTokens,
        temperature,
        topP,
        // Encourage reliable tool usage
        toolChoice: 'auto',
        maxToolRoundtrips,
        tools: {
          createTodo: tool({
            description: "Create a new todo item for the current user",
            parameters: z.object({
              item: z.string().min(1).max(1000).describe("The todo item text"),
            }),
            execute: async ({ item }) => {
              const currentUserId = userId;
              // Enforce simple free-tier limit (mirror itemRoutes)
              const user = await storage.getUserByFirebaseId(currentUserId);
              const items = await storage.getItemsByUserId(currentUserId);
              if (!user?.subscriptionType?.includes('pro') && items.length >= 5) {
                throw new Error('Item limit reached. Please upgrade to Pro plan.');
              }
              const created = await storage.createItem({ userId: currentUserId, item });
              return { id: created.id, item: created.item, createdAt: created.id ? new Date() : new Date() };
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
      });

      console.log("Piping data stream to response...");
      result.pipeDataStreamToResponse(res);
    } catch (error: any) {
      console.error("AI chat error:", error);
      if (!res.headersSent) {
        const status =
          error?.status === 429 ? 429 :
          error?.status === 503 ? 503 :
          error?.code === 'ETIMEDOUT' ? 408 : 500;
        const message =
          status === 429 ? 'Rate limited by AI provider' :
          status === 503 ? 'AI provider unavailable' :
          status === 408 ? 'AI request timed out' :
          'AI service temporarily unavailable';
        return res.status(status).json({ error: message });
      }
    }
  });

  // Health check endpoint for AI service
  app.get("/api/ai/status", requireAuth, async (_req: AuthenticatedRequest, res) => {
    try {
      const isConfigured = !!process.env.OPENAI_API_KEY;
      
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
