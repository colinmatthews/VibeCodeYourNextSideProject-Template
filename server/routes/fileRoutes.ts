import type { Express } from "express";
import { storage } from "../storage/index";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requiresOwnership, requiresFileOwnership } from "../middleware/authHelpers";

export async function registerFileRoutes(app: Express) {
  app.get("/api/files", requireAuth, requiresOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const files = await storage.getFilesByUserId(userId);
      res.json(files || []);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // File is already attached to request by requiresFileOwnership middleware
      const file = (req as any).file;
      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.post("/api/files", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, originalName, path, url, size, type } = req.body;
      const userId = req.user!.uid;
      
      console.log("[Files] Received file data:", { name, originalName, path, size, type, userId });

      if (!name || !originalName || !path || !url || !size || !type) {
        console.error("[Files] Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = await storage.getUserByFirebaseId(userId);
      if (!user) {
        console.error("[Files] User not found");
        return res.status(404).json({ error: "User not found" });
      }

      console.log("[Files] User data:", {
        email: user?.email,
        subscriptionType: user?.subscriptionType
      });

      const userFiles = await storage.getFilesByUserId(userId);
      console.log("[Files] Current files count:", userFiles.length);

      const maxFiles = user?.subscriptionType?.includes('pro') ? 100 : 10;
      if (userFiles.length >= maxFiles) {
        console.log("[Files] File limit reached");
        return res.status(403).json({
          error: `File limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`,
        });
      }

      const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
      const maxSize = user?.subscriptionType?.includes('pro') ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free
      if (totalSize + size > maxSize) {
        console.log("[Files] Storage limit reached");
        return res.status(403).json({
          error: `Storage limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxSize / (1024 * 1024))}MB total storage.`,
        });
      }

      const fileRecord = await storage.createFile({
        userId,
        name,
        originalName,
        path,
        url,
        size,
        type,
      });
      console.log("[Files] File record created:", fileRecord);

      res.json(fileRecord);
    } catch (error) {
      console.error("[Files] Error creating file record:", error);
      res.status(400).json({
        error: "Invalid file data",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/files/:id", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid file ID" });
      }
      
      // File is already verified to exist and be owned by user via middleware
      const file = (req as any).file;
      
      await storage.deleteFile(id);
      res.json({ message: "File deleted successfully", filePath: file.path });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });
}