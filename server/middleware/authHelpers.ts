import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { storage } from '../storage/index';

/**
 * Middleware to verify that the authenticated user owns the resource
 * specified by the userId parameter
 */
export function requiresOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  // Check userId from various sources (params, query, body)
  const resourceUserId = req.params.userId || 
                        req.params.firebaseId || 
                        req.query.userId?.toString() || 
                        req.body.userId;

  if (!resourceUserId) {
    return res.status(400).json({
      error: 'User ID is required'
    });
  }

  // Verify the authenticated user matches the resource owner
  if (req.user.uid !== resourceUserId) {
    return res.status(403).json({
      error: 'Access denied: You can only access your own resources',
      code: 'auth/access-denied'
    });
  }

  next();
}

/**
 * Middleware to verify ownership of a specific file
 * Checks that the authenticated user owns the file by ID
 */
export async function requiresFileOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  const fileId = Number(req.params.id);
  
  if (isNaN(fileId)) {
    return res.status(400).json({
      error: 'Invalid file ID'
    });
  }

  try {
    const file = await storage.getFileById(fileId);
    
    if (!file) {
      return res.status(404).json({
        error: 'File not found'
      });
    }

    // Verify the authenticated user owns this file
    if (file.userId !== req.user.uid) {
      return res.status(403).json({
        error: 'Access denied: You can only access your own files',
        code: 'auth/access-denied'
      });
    }

    // Add file to request for use in route handler
    (req as any).file = file;
    next();
  } catch (error) {
    console.error('Error checking file ownership:', error);
    return res.status(500).json({
      error: 'Failed to verify file ownership'
    });
  }
}

/**
 * Middleware to verify ownership of a specific item
 * Checks that the authenticated user owns the item by ID
 */
export async function requiresItemOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  const itemId = Number(req.params.id);
  
  if (isNaN(itemId)) {
    return res.status(400).json({
      error: 'Invalid item ID'
    });
  }

  try {
    // Get all items for the user to check ownership
    const userItems = await storage.getItemsByUserId(req.user.uid);
    const item = userItems.find(item => item.id === itemId);
    
    if (!item) {
      return res.status(404).json({
        error: 'Item not found or access denied'
      });
    }

    // Add item to request for use in route handler
    (req as any).item = item;
    next();
  } catch (error) {
    console.error('Error checking item ownership:', error);
    return res.status(500).json({
      error: 'Failed to verify item ownership'
    });
  }
}

/**
 * Helper function to check if user exists and optionally match with authenticated user
 */
export async function requiresUserExists(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  try {
    const user = await storage.getUserByFirebaseId(req.user.uid);
    
    if (!user) {
      return res.status(404).json({
        error: 'User profile not found'
      });
    }

    // Add user to request for use in route handler
    (req as any).userProfile = user;
    next();
  } catch (error) {
    console.error('Error checking user exists:', error);
    return res.status(500).json({
      error: 'Failed to verify user'
    });
  }
}

/**
 * Helper to extract and validate Firebase UID from request
 */
export function extractFirebaseUid(req: AuthenticatedRequest): string | null {
  return req.user?.uid || null;
}

/**
 * Helper to check if authenticated user matches the target user ID
 */
export function isOwner(req: AuthenticatedRequest, targetUserId: string): boolean {
  return req.user?.uid === targetUserId;
}