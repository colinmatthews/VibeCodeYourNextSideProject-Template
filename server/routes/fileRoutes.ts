import type { Express } from "express";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { storage } from "../storage/index";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requiresOwnership, requiresFileOwnership } from "../middleware/authHelpers";
import { firebaseStorage } from "../lib/firebaseStorage";
import { handleError, errors } from "../lib/errors";

// Validation schemas
const fileIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

const createFileSchema = z.object({
  name: z.string().min(1).max(255),
  originalName: z.string().min(1).max(255),
  path: z.string().min(1).max(1000),
  url: z.string().url().max(2000),
  size: z.number().int().min(1).max(50 * 1024 * 1024), // 50MB max
  type: z.string().min(1).max(100)
});

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

    // Add file extension validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.json', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
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
      handleError(error, res);
    }
  });

  app.get("/api/files/:id", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate file ID parameter
      const { id } = fileIdSchema.parse(req.params);
      
      // File is already attached to request by requiresFileOwnership middleware
      const file = (req as any).file;
      res.json(file);
    } catch (error) {
      handleError(error, res);
    }
  });

  // New upload endpoint - handles multipart file uploads
  app.post("/api/files/upload", requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const file = req.file;

      if (!file) {
        throw errors.validation("No file provided");
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
        throw errors.notFound("User");
      }

      // Check file limits
      const userFiles = await storage.getFilesByUserId(userId);
      const maxFiles = user?.subscriptionType?.includes('pro') ? 100 : 10;
      const maxFileSize = user?.subscriptionType?.includes('pro') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pro, 10MB free
      const maxTotalSize = user?.subscriptionType?.includes('pro') ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free

      if (userFiles.length >= maxFiles) {
        throw errors.forbidden(`File limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`);
      }

      if (file.size > maxFileSize) {
        throw errors.tooLarge(`File too large. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxFileSize / (1024 * 1024))}MB per file.`);
      }

      const totalSize = userFiles.reduce((sum, f) => sum + f.size, 0);
      if (totalSize + file.size > maxTotalSize) {
        throw errors.tooLarge(`Storage limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxTotalSize / (1024 * 1024))}MB total storage.`);
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
      handleError(error, res);
    }
  });

  // Legacy endpoint for metadata-only file creation (kept for compatibility)
  app.post("/api/files", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const validatedData = createFileSchema.parse(req.body);
      const { name, originalName, path, url, size, type } = validatedData;
      const userId = req.user!.uid;
      
      console.log("[Files] Received file data:", { name, originalName, path, size, type, userId });

      const user = await storage.getUserByFirebaseId(userId);
      if (!user) {
        console.error("[Files] User not found");
        throw errors.notFound("User");
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
        throw errors.forbidden(`File limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${maxFiles} files.`);
      }

      const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
      const maxSize = user?.subscriptionType?.includes('pro') ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free
      if (totalSize + size > maxSize) {
        console.log("[Files] Storage limit reached");
        throw errors.forbidden(`Storage limit reached. ${user?.subscriptionType?.includes('pro') ? 'Pro' : 'Free'} plan allows up to ${Math.round(maxSize / (1024 * 1024))}MB total storage.`);
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
      handleError(error, res);
    }
  });

  // Download endpoint - streams file from Firebase Storage
  app.get("/api/files/:id/download", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate file ID parameter
      const { id } = fileIdSchema.parse(req.params);
      const file = (req as any).file;
      
      // Check if file exists in Firebase Storage
      const fileExists = await firebaseStorage.fileExists(file.path);
      if (!fileExists) {
        throw errors.notFound("File in storage");
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.type);
      
      // Stream the file from Firebase Storage
      const downloadStream = firebaseStorage.createDownloadStream(file.path);
      
      downloadStream.on('error', (error) => {
        console.error('Download stream error:', error);
        if (!res.headersSent) {
          handleError(error, res);
        }
      });

      downloadStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      handleError(error, res);
    }
  });

  app.delete("/api/files/:id", requireAuth, requiresFileOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate file ID parameter
      const { id } = fileIdSchema.parse(req.params);
      
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
      handleError(error, res);
    }
  });
}