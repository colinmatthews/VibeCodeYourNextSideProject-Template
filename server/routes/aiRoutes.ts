import type { Express } from "express";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";
import { nanoid } from "nanoid";

export async function registerAIRoutes(app: Express) {
  // AI Chat endpoint with thread support
  app.post("/api/ai/chat", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("AI chat request received");
      
      const { messages, threadId } = req.body;
      const userId = req.user!.uid;
      
      // Initialize thread if threadId provided
      if (threadId) {
        // Ensure the thread exists or create it
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
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: convertToCoreMessages(messages),
        onFinish: async (finishResult) => {
          // Save messages to thread if threadId provided
          if (threadId && finishResult.text) {
            try {
              // Get existing messages to avoid duplicates
              const existingMessages = await storage.getMessagesByThreadId(threadId);
              
              // Save user message first (last message in the array)
              const userMessage = messages[messages.length - 1];
              if (userMessage) {
                const userContent = Array.isArray(userMessage.content) 
                  ? userMessage.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n")
                  : userMessage.content;

                // Check if this user message already exists
                const userMessageExists = existingMessages.some(
                  msg => msg.role === 'user' && msg.content === userContent
                );

                if (!userMessageExists) {
                  await storage.createMessage({
                    id: nanoid(),
                    threadId,
                    role: "user",
                    content: userContent,
                  });
                }

                // Always save the assistant response (it's new) 
                await storage.createMessage({
                  id: nanoid(),
                  threadId,
                  role: "assistant",
                  content: finishResult.text,
                });

                // Update thread title if it's still "New Chat"
                const thread = await storage.getThreadByIdAndUserId(threadId, userId);
                if (thread && thread.title === "New Chat") {
                  const title = userContent.slice(0, 50) + (userContent.length > 50 ? "..." : "");
                  await storage.updateThread(threadId, userId, { title });
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
    } catch (error) {
      console.error("AI chat error:", error);
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: "AI service temporarily unavailable" 
        });
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