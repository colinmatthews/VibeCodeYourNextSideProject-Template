import type { Express } from "express";
import { isAuthenticated } from "../replit_integrations/auth";
import { AuthenticatedRequest, getUserId } from "../middleware/auth";
import { storage } from "../storage";
import { nanoid } from "nanoid";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";

interface CreateThreadRequest {
  title?: string;
}

interface UpdateThreadRequest {
  title?: string;
  archived?: boolean;
}

export async function registerThreadRoutes(app: Express) {
  // Validation schemas
  const CreateThreadSchema = z.object({ title: z.string().min(1).max(120).optional() });
  const UpdateThreadSchema = z.object({ title: z.string().min(1).max(120).optional(), archived: z.boolean().optional() });
  const CreateMessageSchema = z.object({
    id: z.string().min(1).max(128).optional(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.union([
      z.string().max(8000),
      z.array(z.object({ type: z.literal("text"), text: z.string().max(8000) })).max(10)
    ])
  });

  // Lightweight per-user/IP limiters
  const threadsLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => getUserId(req) ?? ipKeyGenerator(req)
  });
  const writeLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => getUserId(req) ?? ipKeyGenerator(req)
  });
  // Get all threads for the authenticated user
  app.get("/api/ai/threads", isAuthenticated, threadsLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const activeThreads = await storage.getActiveThreadsByUserId(userId);
      const archivedThreads = await storage.getArchivedThreadsByUserId(userId);

      res.json({
        threads: activeThreads.map(thread => ({
          remoteId: thread.id,
          title: thread.title,
          status: "regular" as const,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        })),
        archivedThreads: archivedThreads.map(thread => ({
          remoteId: thread.id,
          title: thread.title,
          status: "archived" as const,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching threads:", error);
      res.status(500).json({ error: "Failed to fetch threads" });
    }
  });

  // Create a new thread
  app.post("/api/ai/threads", isAuthenticated, writeLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const parsed = CreateThreadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors.map(e => e.message) });
      }
      const { title = "New Chat" } = parsed.data;
      
      const threadId = nanoid();
      
      const thread = await storage.createThread({
        id: threadId,
        title,
        userId,
        archived: false,
      });

      res.json({
        remoteId: thread.id,
        title: thread.title,
        status: "regular" as const,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    } catch (error) {
      console.error("Error creating thread:", error);
      res.status(500).json({ error: "Failed to create thread" });
    }
  });

  // Initialize a thread (assistant-ui requirement)
  app.post("/api/ai/threads/:threadId/initialize", isAuthenticated, writeLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      
      // Check if thread already exists
      let thread = await storage.getThreadByIdAndUserId(threadId, userId);
      
      if (!thread) {
        // Create the thread if it doesn't exist
        thread = await storage.createThread({
          id: threadId,
          title: "New Chat",
          userId,
          archived: false,
        });
      }

      res.json({ remoteId: thread.id });
    } catch (error) {
      console.error("Error initializing thread:", error);
      res.status(500).json({ error: "Failed to initialize thread" });
    }
  });

  // Get a specific thread
  app.get("/api/ai/threads/:threadId", isAuthenticated, threadsLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      
      const thread = await storage.getThreadByIdAndUserId(threadId, userId);
      
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      res.json({
        remoteId: thread.id,
        title: thread.title,
        status: thread.archived ? "archived" : "regular",
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    } catch (error) {
      console.error("Error fetching thread:", error);
      res.status(500).json({ error: "Failed to fetch thread" });
    }
  });

  // Update a thread (rename, archive, etc.)
  app.patch("/api/ai/threads/:threadId", isAuthenticated, writeLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      const parsed = UpdateThreadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors.map(e => e.message) });
      }
      const updateData = parsed.data as UpdateThreadRequest;
      
      const thread = await storage.updateThread(threadId, userId, updateData);
      
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      res.json({
        remoteId: thread.id,
        title: thread.title,
        status: thread.archived ? "archived" : "regular",
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      });
    } catch (error) {
      console.error("Error updating thread:", error);
      res.status(500).json({ error: "Failed to update thread" });
    }
  });

  // Delete a thread
  app.delete("/api/ai/threads/:threadId", isAuthenticated, writeLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      
      // Delete the thread (messages will cascade via FK)
      await storage.deleteThread(threadId, userId);

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting thread:", error);
      res.status(500).json({ error: "Failed to delete thread" });
    }
  });

  // Get messages for a thread
  app.get("/api/ai/threads/:threadId/messages", isAuthenticated, threadsLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      
      // First verify the user owns this thread
      const thread = await storage.getThreadByIdAndUserId(threadId, userId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      const messages = await storage.getMessagesByThreadId(threadId);

      res.json({
        messages: messages.map(message => ({
          id: message.id,
          role: message.role,
          content: [{ type: "text", text: message.content }],
          createdAt: message.createdAt,
        }))
      });
    } catch (error) {
      console.error("Error fetching thread messages:", error);
      res.status(500).json({ error: "Failed to fetch thread messages" });
    }
  });

  // Add a message to a thread
  app.post("/api/ai/threads/:threadId/messages", isAuthenticated, writeLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { threadId } = req.params;
      const parsed = CreateMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.errors.map(e => e.message) });
      }
      const { id, role, content } = parsed.data;
      
      // First verify the user owns this thread
      const thread = await storage.getThreadByIdAndUserId(threadId, userId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      // Extract text content from content array
      const textContent = Array.isArray(content) 
        ? content.filter(c => c.type === "text").map(c => c.text).join("\n")
        : typeof content === "string" 
        ? content 
        : "";

      const message = await storage.createMessage({
        id: id || nanoid(),
        threadId,
        role,
        content: textContent,
      });

      res.json({
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.content }],
        createdAt: message.createdAt,
      });
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });
}
