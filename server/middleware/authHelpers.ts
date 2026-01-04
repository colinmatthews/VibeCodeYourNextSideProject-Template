import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, getUserId } from './auth';
import { storage } from '../storage/index';
import { logSecurity } from '../lib/audit';

/**
 * Middleware to verify that the authenticated user owns the resource
 * specified by the userId parameter
 */
export function requiresOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const userId = getUserId(req);
  
  if (!userId) {
    logSecurity('access_denied', { reason: 'no_user', path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  // Check userId from various sources (params, query, body)
  const resourceUserId = req.params.userId || 
                        req.params.id || 
                        req.query.userId?.toString() || 
                        req.body.userId;

  if (!resourceUserId) {
    logSecurity('access_denied', { reason: 'missing_user_id', path: req.path, method: req.method, userId });
    return res.status(400).json({
      error: 'User ID is required'
    });
  }

  // Verify the authenticated user matches the resource owner
  if (userId !== resourceUserId) {
    logSecurity('access_denied', { reason: 'mismatch_user', path: req.path, method: req.method, userId, resourceUserId });
    return res.status(403).json({
      error: 'Access denied: You can only access your own resources',
      code: 'auth/access-denied'
    });
  }

  next();
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
  const userId = getUserId(req);
  
  if (!userId) {
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
    const userItems = await storage.getItemsByUserId(userId);
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
  const userId = getUserId(req);
  
  if (!userId) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  try {
    const user = await storage.getUserById(userId);
    
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
 * Helper to extract user ID from request
 */
export function extractUserId(req: AuthenticatedRequest): string | null {
  return getUserId(req) || null;
}

/**
 * Helper to check if authenticated user matches the target user ID
 */
export function isOwner(req: AuthenticatedRequest, targetUserId: string): boolean {
  return getUserId(req) === targetUserId;
}
