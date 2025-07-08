import type { Express } from "express";
import multer from "multer";
import { storage } from "../storage/index";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requiresOwnership, requiresFileOwnership } from "../middleware/authHelpers";
import { firebaseStorage } from "../lib/firebaseStorage";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

export async function registerFileRoutes(app: Express) {
  app.get("/api/files", requireAuth, async (req: AuthenticatedRequest, res) => {
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

  // New upload endpoint - handles multipart file uploads
  app.post("/api/files/upload", requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      console.log("[Files] Received file upload:", { 
        originalName: file.originalname, 
        size: file.size, 
        type: file.mimetype,
        userId 
      });

      // Check user exists and get subscription info
      const user = await storage.getUserByFirebaseId(userId);
      if (!user) {
        console.error("[Files] User not found");
        return res.status(404).json({ error: "User not found" });
      }

      // Check file limits
      const userFiles = await storage.getFilesByUserId(userId);
      const maxFiles = user?.subscriptionType?.includes('pro') ? 100 : 10;
      const maxFileSize = user?.subscriptionType?.includes('pro') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pro, 10MB free
      const maxTotalSize = user?.subscriptionType?.includes('pro') ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free

      if (userFiles.length >= maxFiles) {
        return res.status(403).json({
          error: `File limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`,
        });
      }

      if (file.size > maxFileSize) {
        return res.status(413).json({
          error: `File too large. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxFileSize / (1024 * 1024))}MB per file.`,
        });
      }

      const totalSize = userFiles.reduce((sum, f) => sum + f.size, 0);
      if (totalSize + file.size > maxTotalSize) {
        return res.status(413).json({
          error: `Storage limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxTotalSize / (1024 * 1024))}MB total storage.`,
        });
      }

      // Upload to Firebase Storage
      const uploadResult = await firebaseStorage.uploadFile(file, userId);
      
      // Save metadata to database
      const fileRecord = await storage.createFile({
        userId,
        name: uploadResult.name,
        originalName: uploadResult.originalName,
        path: uploadResult.path,
        url: uploadResult.url,
        size: uploadResult.size,
        type: uploadResult.type,
      });

      console.log("[Files] File uploaded and record created:", fileRecord);
      res.json(fileRecord);
    } catch (error) {
      console.error("[Files] Error uploading file:", error);
      res.status(500).json({
        error: "Failed to upload file",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Legacy endpoint for metadata-only file creation (kept for compatibility)
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

  // Download endpoint - streams file from Firebase Storage
  app.get("/api/files/:id/download", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const file = (req as any).file;
      
      // Check if file exists in Firebase Storage
      const fileExists = await firebaseStorage.fileExists(file.path);
      if (!fileExists) {
        return res.status(404).json({ error: "File not found in storage" });
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.type);
      
      // Stream the file from Firebase Storage
      const downloadStream = firebaseStorage.createDownloadStream(file.path);
      
      downloadStream.on('error', (error) => {
        console.error('Download stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
      });

      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Failed to download file" });
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
      
      // Delete from Firebase Storage first
      try {
        await firebaseStorage.deleteFile(file.path);
        console.log(`[Files] Deleted file from Firebase Storage: ${file.path}`);
      } catch (error) {
        console.error(`[Files] Error deleting file from Firebase Storage: ${file.path}`, error);
        // Continue with database deletion even if Firebase deletion fails
      }
      
      // Delete from database
      await storage.deleteFile(id);
      console.log(`[Files] Deleted file record from database: ${id}`);
      
      res.json({ message: "File deleted successfully", filePath: file.path });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });
}