import type { Express } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";

export async function registerChatKitRoutes(app: Express) {
  // Create ChatKit session with user authentication
  app.post("/api/chatkit/session", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Defensive auth guard
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
      }

      const userId = req.user.uid;

      // Check if OpenAI API key is configured
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({
          error: "AI service not configured. Please add OPENAI_API_KEY to your environment variables."
        });
      }

      // Check if workflow ID is configured
      if (!process.env.OPENAI_CHATKIT_WORKFLOW_ID) {
        return res.status(500).json({
          error: "ChatKit not configured. Please add OPENAI_CHATKIT_WORKFLOW_ID to your environment variables."
        });
      }

      // Get user information for context
      const userRecord = await storage.getUserByFirebaseId(userId);

      // Call OpenAI ChatKit API directly to create a session
      // This uses the REST API since the Node.js SDK doesn't have chatkit.sessions.create yet
      // Reference: https://github.com/openai/openai-chatkit-starter-app
      const apiBase = process.env.CHATKIT_API_BASE || 'https://api.openai.com';
      const sessionEndpoint = `${apiBase}/v1/chatkit/sessions`;

      const response = await fetch(sessionEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'OpenAI-Beta': 'chatkit_beta=v1',
        },
        body: JSON.stringify({
          workflow: {
            id: process.env.OPENAI_CHATKIT_WORKFLOW_ID
          },
          user: userId, // Use Firebase UID as the ChatKit user ID
          // Optional: You can add metadata here if needed
          // metadata: {
          //   email: userRecord?.email,
          //   subscriptionType: userRecord?.subscriptionType || 'free',
          // }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('ChatKit session creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        return res.status(response.status).json({
          error: 'Failed to create ChatKit session',
          details: process.env.NODE_ENV === 'development' ? errorData : undefined,
        });
      }

      const sessionData = await response.json();

      // Return the client secret token that the frontend needs
      res.json({
        clientToken: sessionData.client_secret,
        expiresAt: sessionData.expires_at,
      });
    } catch (error: any) {
      console.error("ChatKit session creation error:", error);
      return res.status(500).json({
        error: 'Failed to create ChatKit session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Health check for ChatKit service
  app.get("/api/chatkit/status", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user?.uid) {
        return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
      }

      const hasApiKey = !!process.env.OPENAI_API_KEY;
      const hasWorkflowId = !!process.env.OPENAI_CHATKIT_WORKFLOW_ID;
      const isConfigured = hasApiKey && hasWorkflowId;

      res.json({
        status: isConfigured ? "ready" : "not_configured",
        message: isConfigured
          ? "ChatKit service is ready"
          : !hasApiKey
            ? "OpenAI API key not configured"
            : "ChatKit workflow ID not configured",
        workflowId: hasWorkflowId ? process.env.OPENAI_CHATKIT_WORKFLOW_ID : undefined
      });
    } catch (error) {
      console.error("ChatKit status check error:", error);
      res.status(500).json({
        error: "Failed to check ChatKit service status"
      });
    }
  });
}
