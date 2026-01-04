import { Request, Response, NextFunction } from 'express';
import { logSecurity } from '../lib/audit';

export interface AuthenticatedRequest extends Request {
  user?: {
    claims?: {
      sub: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      profile_image_url?: string;
    };
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
}

export interface AuthError {
  code: 'auth/invalid-token' | 'auth/no-token' | 'auth/expired-token' | 'auth/user-not-found';
  message: string;
}

/**
 * Middleware that requires authentication using Replit Auth session
 * Use this for endpoints that need user authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const user = req.user as any;

  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    logSecurity('auth_failed', { reason: 'not_authenticated', path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      error: 'Authentication required',
      code: 'auth/no-token'
    });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > user.expires_at) {
    logSecurity('auth_failed', { reason: 'expired', path: req.path, method: req.method, ip: req.ip });
    return res.status(401).json({
      error: 'Authentication token has expired',
      code: 'auth/expired-token'
    });
  }

  next();
}

/**
 * Optional authentication middleware
 * Use this for endpoints where authentication is optional
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // With Replit Auth, the session is automatically handled
  // Just continue - user info will be available if authenticated
  next();
}

/**
 * Helper to get user ID from request
 */
export function getUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.claims?.sub;
}
