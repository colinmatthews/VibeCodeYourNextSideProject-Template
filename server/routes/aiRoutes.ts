import type { Express } from "express";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToCoreMessages } from "ai";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";

export async function registerAIRoutes(app: Express) {
  // AI Chat endpoint following assistant-ui docs exactly
  app.post("/api/ai/chat", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      console.log("AI chat request received");
      
      const { messages } = req.body;
      
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ 
          error: "AI service not configured. Please add OPENAI_API_KEY to your environment variables." 
        });
      }

      console.log("Starting OpenAI stream...");
      const result = streamText({
        model: openai("gpt-4o-mini"),
        messages: convertToCoreMessages(messages),
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
  app.get("/api/ai/status", requireAuth, async (req: AuthenticatedRequest, res) => {
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