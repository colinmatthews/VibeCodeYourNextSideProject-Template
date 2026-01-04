import type { Express } from "express";
import { AuthenticatedRequest, getUserId } from "../middleware/auth";
import { isAuthenticated } from "../replit_integrations/auth";
import { storage } from "../storage";
import { randomUUID } from "crypto";

const SESSION_COOKIE_NAME = "chatkit_session_id";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
const CHATKIT_API_BASE = process.env.CHATKIT_API_BASE || 'https://api.openai.com';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

/**
 * Helper function to retry failed API calls
 */
async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(`[ChatKit] API call failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function registerChatKitRoutes(app: Express) {
  // Create ChatKit session with user authentication
  app.post("/api/chatkit/session", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      // Get user ID from Replit Auth session
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
      }

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

      // Resolve or generate session ID for continuity
      let sessionId = req.cookies?.[SESSION_COOKIE_NAME];
      if (!sessionId) {
        sessionId = randomUUID();
      }

      // Get user information for metadata (optional)
      const userRecord = await storage.getUserById(userId);

      // Call OpenAI ChatKit API directly to create a session
      // This uses the REST API since the Node.js SDK doesn't have chatkit.sessions.create yet
      // Reference: https://github.com/openai/openai-chatkit-starter-app
      const sessionEndpoint = `${CHATKIT_API_BASE}/v1/chatkit/sessions`;

      console.log('[ChatKit] Creating session for user:', userId);
      const response = await fetchWithRetry(sessionEndpoint, {
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
          user: userId, // Use Replit user ID as the ChatKit user ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[ChatKit] Session creation failed:', {
          userId,
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
      console.log('[ChatKit] Session created successfully for user:', userId);

      // Set session cookie for continuity across page refreshes
      res.cookie(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_COOKIE_MAX_AGE * 1000, // Convert to milliseconds
      });

      // Return the client secret token that the frontend needs
      res.json({
        clientToken: sessionData.client_secret,
        expiresAt: sessionData.expires_at,
        sessionId, // Return session ID for debugging
      });
    } catch (error: any) {
      console.error("[ChatKit] Session creation error:", {
        userId: getUserId(req),
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
      return res.status(500).json({
        error: 'Failed to create ChatKit session',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // Health check for ChatKit service
  app.get("/api/chatkit/status", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
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
