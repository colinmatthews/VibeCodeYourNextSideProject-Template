import { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  // In production, use service account key
  // In development, Firebase Admin SDK can use Application Default Credentials
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  } else {
    // For development, you can use the Firebase project ID
    initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID
    });
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    email_verified?: boolean;
  };
}

export interface AuthError {
  code: 'auth/invalid-token' | 'auth/no-token' | 'auth/expired-token' | 'auth/user-not-found';
  message: string;
}

/**
 * Middleware to verify Firebase ID tokens and extract user information
 */
export async function verifyFirebaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'auth/no-token'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    if (!idToken) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'auth/no-token'
      });
    }

    // Verify the Firebase ID token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    // Add user information to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };

    next();
  } catch (error: any) {
    console.error('Firebase token verification error:', error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Authentication token has expired',
        code: 'auth/expired-token'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Authentication token has been revoked',
        code: 'auth/invalid-token'
      });
    }
    
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'auth/invalid-token'
      });
    }

    // Generic authentication error
    return res.status(401).json({
      error: 'Authentication failed',
      code: 'auth/invalid-token'
    });
  }
}

/**
 * Middleware that requires authentication
 * Use this for endpoints that need user authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  return verifyFirebaseToken(req, res, next);
}

/**
 * Optional authentication middleware
 * Use this for endpoints where authentication is optional
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await verifyFirebaseToken(req, res, () => {
      // Continue regardless of auth success/failure
      next();
    });
  } catch (error) {
    // Continue without authentication if token verification fails
    next();
  }
}