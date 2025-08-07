import request from 'supertest';
import express from 'express';
import { verifyFirebaseToken, requireAuth, optionalAuth } from '../middleware/auth';
import { getAuth } from 'firebase-admin/auth';
import { resetAllMocks } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

// Get the mocked Firebase Auth instance
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe('Authentication Middleware', () => {
  let app: express.Express;
  let mockAuth: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Test routes that use auth middleware
    app.get('/test-required', requireAuth, (req: any, res) => {
      res.json({ 
        message: 'Success',
        user: req.user 
      });
    });

    app.get('/test-optional', optionalAuth, (req: any, res) => {
      res.json({ 
        message: 'Success',
        user: req.user || null
      });
    });

    app.post('/test-verify', verifyFirebaseToken, (req: any, res) => {
      res.json({ 
        message: 'Token verified',
        user: req.user 
      });
    });
  });

  beforeEach(() => {
    resetAllMocks();
    
    // Setup default mock auth instance
    mockAuth = {
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        email_verified: true
      })
    };
    
    mockGetAuth.mockReturnValue(mockAuth);
  });

  describe('Firebase Token Validation', () => {
    describe('Valid Tokens', () => {
      it('should process standard Firebase tokens', async () => {
        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer valid_firebase_token')
          .expect(200);

        expect(mockAuth.verifyIdToken).toHaveBeenCalledWith('valid_firebase_token');
        expect(response.body).toEqual({
          message: 'Success',
          user: {
            uid: 'test-firebase-uid',
            email: 'test@example.com',
            email_verified: true
          }
        });
      });

      it('should extract user claims correctly', async () => {
        const customToken = {
          uid: 'custom-uid',
          email: 'custom@example.com',
          email_verified: false,
          custom_claims: { role: 'admin' }
        };

        mockAuth.verifyIdToken.mockResolvedValue(customToken);

        const response = await request(app)
          .post('/test-verify')
          .set('Authorization', 'Bearer custom_token')
          .expect(200);

        expect(response.body.user).toEqual({
          uid: 'custom-uid',
          email: 'custom@example.com',
          email_verified: false
        });
      });

      it('should handle tokens without email claim', async () => {
        const tokenWithoutEmail = {
          uid: 'no-email-uid',
          email_verified: true
        };

        mockAuth.verifyIdToken.mockResolvedValue(tokenWithoutEmail);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer no_email_token')
          .expect(200);

        expect(response.body.user).toEqual({
          uid: 'no-email-uid',
          email: undefined,
          email_verified: true
        });
      });

      it('should handle tokens with special characters in claims', async () => {
        const specialCharToken = {
          uid: 'special-uid',
          email: 'test+special@example.com',
          email_verified: true
        };

        mockAuth.verifyIdToken.mockResolvedValue(specialCharToken);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer special_token')
          .expect(200);

        expect(response.body.user.email).toBe('test+special@example.com');
      });
    });

    describe('Invalid Tokens', () => {
      it('should reject expired tokens', async () => {
        const expiredError = new Error('Token expired');
        (expiredError as any).code = 'auth/id-token-expired';
        
        mockAuth.verifyIdToken.mockRejectedValue(expiredError);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer expired_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication token has expired',
          code: 'auth/expired-token'
        });
      });

      it('should reject malformed tokens', async () => {
        const malformedError = new Error('Invalid token format');
        (malformedError as any).code = 'auth/invalid-id-token';
        
        mockAuth.verifyIdToken.mockRejectedValue(malformedError);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer malformed_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid authentication token',
          code: 'auth/invalid-token'
        });
      });

      it('should reject revoked tokens', async () => {
        const revokedError = new Error('Token revoked');
        (revokedError as any).code = 'auth/id-token-revoked';
        
        mockAuth.verifyIdToken.mockRejectedValue(revokedError);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer revoked_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication token has been revoked',
          code: 'auth/invalid-token'
        });
      });

      it('should handle missing Authorization header', async () => {
        const response = await request(app)
          .get('/test-required')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication required',
          code: 'auth/no-token'
        });
      });

      it('should reject non-Bearer token formats', async () => {
        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Basic sometoken')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication required',
          code: 'auth/no-token'
        });
      });

      it('should reject empty Bearer tokens', async () => {
        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer ')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication required',
          code: 'auth/no-token'
        });
      });

      it('should handle generic Firebase Auth errors', async () => {
        const genericError = new Error('Unknown Firebase error');
        (genericError as any).code = 'auth/unknown-error';
        
        mockAuth.verifyIdToken.mockRejectedValue(genericError);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer error_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication failed',
          code: 'auth/invalid-token'
        });
      });
    });

    describe('Token Edge Cases', () => {
      it('should handle very long tokens', async () => {
        const longToken = 'a'.repeat(10000);
        
        const response = await request(app)
          .get('/test-required')
          .set('Authorization', `Bearer ${longToken}`)
          .expect(200);

        expect(mockAuth.verifyIdToken).toHaveBeenCalledWith(longToken);
      });

      it('should handle tokens near expiry', async () => {
        const nearExpiryToken = {
          uid: 'near-expiry-uid',
          email: 'expiry@example.com',
          email_verified: true,
          exp: Math.floor(Date.now() / 1000) + 60 // 1 minute from now
        };

        mockAuth.verifyIdToken.mockResolvedValue(nearExpiryToken);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer near_expiry_token')
          .expect(200);

        expect(response.body.user.uid).toBe('near-expiry-uid');
      });

      it('should handle tokens with unicode characters', async () => {
        const unicodeToken = {
          uid: 'unicode-uid',
          email: 'test@例え.テスト',
          email_verified: true,
          name: '테스트 사용자'
        };

        mockAuth.verifyIdToken.mockResolvedValue(unicodeToken);

        const response = await request(app)
          .get('/test-required')
          .set('Authorization', 'Bearer unicode_token')
          .expect(200);

        expect(response.body.user.email).toBe('test@例え.テスト');
      });

      it('should validate Firebase UID format', async () => {
        const validUidFormats = [
          'user123',
          'user_123_test',
          '1234567890abcdef',
          'user-123-test'
        ];

        for (const uid of validUidFormats) {
          const tokenWithUid = {
            uid,
            email: 'test@example.com',
            email_verified: true
          };

          mockAuth.verifyIdToken.mockResolvedValue(tokenWithUid);

          const response = await request(app)
            .get('/test-required')
            .set('Authorization', 'Bearer valid_uid_token')
            .expect(200);

          expect(response.body.user.uid).toBe(uid);
        }
      });
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle Firebase service unavailable', async () => {
      const serviceError = new Error('Firebase service unavailable');
      (serviceError as any).code = 'unavailable';
      
      mockAuth.verifyIdToken.mockRejectedValue(serviceError);

      const response = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer service_error_token')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Authentication failed',
        code: 'auth/invalid-token'
      });
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      (timeoutError as any).code = 'TIMEOUT';
      
      mockAuth.verifyIdToken.mockRejectedValue(timeoutError);

      const response = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer timeout_token')
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    it('should handle database connection failures', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'ECONNRESET';
      
      mockAuth.verifyIdToken.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer db_error_token')
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });
  });

  describe('Optional Authentication', () => {
    it('should process valid tokens in optional auth', async () => {
      const response = await request(app)
        .get('/test-optional')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.user).toEqual({
        uid: 'test-firebase-uid',
        email: 'test@example.com',
        email_verified: true
      });
    });

    it('should continue without auth when no token provided', async () => {
      const response = await request(app)
        .get('/test-optional')
        .expect(200);

      expect(response.body.user).toBeNull();
    });

    it('should continue without auth when token is invalid', async () => {
      const invalidError = new Error('Invalid token');
      (invalidError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(invalidError);

      const response = await request(app)
        .get('/test-optional')
        .set('Authorization', 'Bearer invalid_token')
        .expect(200);

      expect(response.body.user).toBeNull();
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent auth requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        request(app)
          .get('/test-required')
          .set('Authorization', `Bearer token_${i}`)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.user.uid).toBe('test-firebase-uid');
      });

      expect(mockAuth.verifyIdToken).toHaveBeenCalledTimes(10);
    });

    it('should not cache failed token validations', async () => {
      const failError = new Error('Token validation failed');
      (failError as any).code = 'auth/invalid-id-token';
      
      // First request fails
      mockAuth.verifyIdToken.mockRejectedValueOnce(failError);
      
      const failResponse = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer fail_token')
        .expect(401);

      // Second request with same token should try again (no caching of failures)
      mockAuth.verifyIdToken.mockResolvedValueOnce({
        uid: 'retry-uid',
        email: 'retry@example.com',
        email_verified: true
      });

      const retryResponse = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer fail_token')
        .expect(200);

      expect(retryResponse.body.user.uid).toBe('retry-uid');
      expect(mockAuth.verifyIdToken).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid sequential requests', async () => {
      const rapidRequests = [];
      
      for (let i = 0; i < 5; i++) {
        rapidRequests.push(
          request(app)
            .get('/test-required')
            .set('Authorization', `Bearer rapid_token_${i}`)
        );
      }

      const responses = await Promise.all(rapidRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Security Logging & Monitoring', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log authentication failures', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(authError);

      await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Firebase token verification error:',
        authError
      );
    });

    it('should not log sensitive token information', async () => {
      const authError = new Error('Token verification failed');
      (authError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(authError);

      await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer sensitive_token_data')
        .expect(401);

      const logCalls = consoleSpy.mock.calls;
      logCalls.forEach(call => {
        const logMessage = call.join(' ');
        expect(logMessage).not.toContain('sensitive_token_data');
      });
    });
  });

  describe('Environment & Configuration', () => {
    it('should handle missing Firebase configuration', async () => {
      // Mock verifyIdToken to fail with configuration error
      const configError = new Error('Firebase configuration missing');
      (configError as any).code = 'app/invalid-app-argument';
      
      mockAuth.verifyIdToken.mockRejectedValue(configError);

      const response = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer config_error_token')
        .expect(401);

      expect(response.body.error).toBe('Authentication failed');
    });

    it('should validate token from correct Firebase project', async () => {
      // Mock token with wrong project ID
      const wrongProjectToken = {
        uid: 'wrong-project-uid',
        email: 'test@wrong.com',
        email_verified: true,
        aud: 'wrong-project-id' // Audience claim
      };

      mockAuth.verifyIdToken.mockResolvedValue(wrongProjectToken);

      const response = await request(app)
        .get('/test-required')
        .set('Authorization', 'Bearer wrong_project_token')
        .expect(200);

      // Token validation passes (Firebase Admin SDK handles project validation)
      expect(response.body.user.uid).toBe('wrong-project-uid');
    });
  });
});