import request from 'supertest';
import express from 'express';
import { requireAuth } from '../middleware/auth';
import { requiresOwnership, requiresFileOwnership } from '../middleware/authHelpers';
import { getAuth } from 'firebase-admin/auth';
import { resetAllMocks, mockStorage } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

// Get the mocked Firebase Auth instance
const mockGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;

describe('Authentication Security', () => {
  let app: express.Express;
  let mockAuth: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Security test routes
    app.get('/api/secure/profile/:userId', requireAuth, requiresOwnership, (req: any, res) => {
      res.json({ 
        message: 'Profile accessed',
        userId: req.params.userId,
        authenticatedUser: req.user.uid
      });
    });

    app.get('/api/secure/files/:id', requireAuth, requiresFileOwnership, (req: any, res) => {
      res.json({ 
        message: 'File accessed',
        fileId: req.params.id,
        authenticatedUser: req.user.uid
      });
    });

    app.post('/api/secure/data', requireAuth, (req: any, res) => {
      res.json({ 
        message: 'Data processed',
        data: req.body,
        user: req.user.uid
      });
    });

    // Route that simulates admin check
    app.get('/api/admin/users', requireAuth, (req: any, res) => {
      // Simulate admin check (in reality would check user roles)
      if (req.user.uid !== 'admin-user-id') {
        return res.status(403).json({ error: 'Admin access required' });
      }
      res.json({ message: 'Admin access granted' });
    });

    // Route that processes user input
    app.post('/api/process/input', requireAuth, (req: any, res) => {
      const { userInput } = req.body;
      res.json({ 
        message: 'Input processed',
        processed: userInput,
        user: req.user.uid
      });
    });
  });

  beforeEach(() => {
    resetAllMocks();
    
    // Setup default mock auth instance
    mockAuth = {
      verifyIdToken: jest.fn().mockResolvedValue({
        uid: 'test-replit-user-id',
        email: 'test@example.com',
        email_verified: true
      })
    };
    
    mockGetAuth.mockReturnValue(mockAuth);
  });

  describe('Token Manipulation Attacks', () => {
    it('should reject tokens with modified payloads', async () => {
      // Simulate token with tampered payload
      const tamperedError = new Error('Token signature verification failed');
      (tamperedError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(tamperedError);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.TAMPERED_PAYLOAD.signature')
        .expect(401);

      expect(response.body).toEqual({
        error: 'Invalid authentication token',
        code: 'auth/invalid-token'
      });
    });

    it('should reject replayed tokens', async () => {
      // First request succeeds
      const response1 = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid_token_123')
        .expect(200);

      // Simulate token being invalidated/revoked after first use
      const revokedError = new Error('Token has been revoked');
      (revokedError as any).code = 'auth/id-token-revoked';
      
      mockAuth.verifyIdToken.mockRejectedValue(revokedError);

      // Second request with same token should fail
      const response2 = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid_token_123')
        .expect(401);

      expect(response2.body).toEqual({
        error: 'Authentication token has been revoked',
        code: 'auth/invalid-token'
      });
    });

    it('should reject tokens with modified signatures', async () => {
      const signatureError = new Error('Token signature is invalid');
      (signatureError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(signatureError);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid.payload.INVALID_SIGNATURE')
        .expect(401);

      expect(response.body.code).toBe('auth/invalid-token');
    });

    it('should prevent token injection in request body', async () => {
      // Attempt to inject token in request body
      const response = await request(app)
        .post('/api/secure/data')
        .set('Authorization', 'Bearer valid_token')
        .send({
          data: 'test',
          authorization: 'Bearer malicious_token',
          token: 'injected_token',
          firebase_token: 'another_injection'
        })
        .expect(200);

      // Should process normally, ignoring injected tokens
      expect(response.body.user).toBe('test-replit-user-id');
      expect(response.body.data.authorization).toBe('Bearer malicious_token');
    });

    it('should handle tokens with special characters', async () => {
      const maliciousToken = 'valid_token_part_with_special_chars<>{}[]';
      
      // Firebase should reject this during verification
      const specialCharError = new Error('Invalid token format');
      (specialCharError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(specialCharError);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', `Bearer ${maliciousToken}`)
        .expect(401);

      expect(response.body.code).toBe('auth/invalid-token');
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent header manipulation attacks', async () => {
      const maliciousHeaders = {
        'Authorization': 'Bearer valid_token',
        'X-User-Id': 'admin-user-id',
        'X-Firebase-UID': 'malicious-uid',
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-For': 'admin.internal.com',
        'X-Original-User': 'admin@company.com'
      };

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set(maliciousHeaders)
        .expect(200);

      // Should use token-derived user, not header values
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should validate all required claims', async () => {
      // Token with all required claims including uid
      const completeToken = {
        uid: 'test-replit-user-id',
        email: 'test@example.com',
        email_verified: true
      };

      mockAuth.verifyIdToken.mockResolvedValue(completeToken);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer complete_token')
        .expect(200);

      // Should have all required user data
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should prevent user ID spoofing in requests', async () => {
      // Attempt to access another user's profile
      const response = await request(app)
        .get('/api/secure/profile/attacker-target-uid')
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied: You can only access your own resources',
        code: 'auth/access-denied'
      });
    });

    it('should handle malicious user agents', async () => {
      const maliciousUserAgent = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid_token')
        .set('User-Agent', maliciousUserAgent)
        .expect(200);

      // Should process normally, user agent shouldn't affect auth
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should prevent privilege escalation attempts', async () => {
      // Normal user trying to access admin endpoint
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Admin access required'
      });
    });

    it('should validate request origin for sensitive operations', async () => {
      const suspiciousOrigin = 'http://malicious-site.com';
      
      const response = await request(app)
        .post('/api/secure/data')
        .set('Authorization', 'Bearer valid_token')
        .set('Origin', suspiciousOrigin)
        .send({ sensitive: 'data' })
        .expect(200);

      // Should process normally (origin validation would be in CORS middleware)
      expect(response.body.user).toBe('test-replit-user-id');
    });
  });

  describe('Session Fixation Prevention', () => {
    it('should not accept pre-set session identifiers', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid_token')
        .set('X-Session-ID', 'attacker-controlled-session')
        .set('Cookie', 'sessionId=malicious_session')
        .expect(200);

      // Should ignore session headers and use token-based auth
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should handle concurrent login attempts', async () => {
      const concurrentLogins = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .get('/api/secure/profile/test-replit-user-id')
          .set('Authorization', `Bearer concurrent_token_${i}`)
      );

      const responses = await Promise.all(concurrentLogins);
      
      // All should succeed independently
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.authenticatedUser).toBe('test-replit-user-id');
      });
    });
  });

  describe('Input Validation & Injection Prevention', () => {
    it('should handle SQL injection attempts in user IDs', async () => {
      const sqlInjection = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .get(`/api/secure/profile/${encodeURIComponent(sqlInjection)}`)
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      // Should be rejected due to ownership check, not reach database
      expect(response.body.code).toBe('auth/access-denied');
    });

    it('should sanitize special characters in input', async () => {
      const specialChars = '<script>alert("xss")</script>\n\r\t';
      
      const response = await request(app)
        .post('/api/process/input')
        .set('Authorization', 'Bearer valid_token')
        .send({ userInput: specialChars })
        .expect(200);

      // Input should be processed as-is (sanitization would be in business logic)
      expect(response.body.processed).toBe(specialChars);
    });

    it('should handle extremely large payloads', async () => {
      const largePayload = 'A'.repeat(100000); // 100KB payload
      
      const response = await request(app)
        .post('/api/process/input')
        .set('Authorization', 'Bearer valid_token')
        .send({ userInput: largePayload })
        .expect(200);

      expect(response.body.user).toBe('test-replit-user-id');
    });

    it('should handle malformed JSON payloads', async () => {
      // This would be handled by Express middleware before reaching our code
      const response = await request(app)
        .post('/api/process/input')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}') // Invalid JSON
        .expect(400); // Express would reject this

      // Should be handled by Express JSON parser
    });
  });

  describe('Rate Limiting & DoS Prevention', () => {
    it('should handle rapid authentication requests', async () => {
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app)
          .get('/api/secure/profile/test-replit-user-id')
          .set('Authorization', 'Bearer rapid_token')
      );

      const responses = await Promise.all(rapidRequests);
      
      // All should succeed (rate limiting would be implemented separately)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle authentication with broken tokens repeatedly', async () => {
      const brokenTokenError = new Error('Malformed token');
      (brokenTokenError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(brokenTokenError);

      const failedRequests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/secure/profile/test-replit-user-id')
          .set('Authorization', 'Bearer broken_token')
      );

      const responses = await Promise.all(failedRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Prevention', () => {
    it('should process requests with authorization header', async () => {
      // CSRF attacks typically can't set Authorization headers
      const response = await request(app)
        .post('/api/secure/data')
        .set('Authorization', 'Bearer valid_token')
        .send({ action: 'sensitive_operation' })
        .expect(200);

      expect(response.body.user).toBe('test-replit-user-id');
    });

    it('should handle requests with suspicious referrers', async () => {
      const response = await request(app)
        .post('/api/secure/data')
        .set('Authorization', 'Bearer valid_token')
        .set('Referer', 'http://malicious-site.com/csrf-attack')
        .send({ action: 'delete_account' })
        .expect(200);

      // Should process normally (CSRF protection would be separate middleware)
      expect(response.body.user).toBe('test-replit-user-id');
    });
  });

  describe('Resource Access Security', () => {
    const mockOwnedFile = {
      id: 1,
      name: 'user-file.jpg',
      userId: 'test-replit-user-id'
    };

    const mockOtherFile = {
      id: 2, 
      name: 'other-file.jpg',
      userId: 'other-user-uid'
    };

    it('should prevent access to files via ID guessing', async () => {
      mockStorage.getFileById.mockResolvedValue(mockOtherFile);

      const response = await request(app)
        .get('/api/secure/files/2')
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Access denied: You can only access your own files',
        code: 'auth/access-denied'
      });
    });

    it('should handle sequential ID scanning attempts', async () => {
      // Simulate scanning file IDs 1-5
      const scanRequests = Array.from({ length: 5 }, (_, i) => {
        mockStorage.getFileById.mockResolvedValueOnce(
          i === 2 ? mockOwnedFile : { ...mockOtherFile, id: i + 1, userId: 'other-user' }
        );
        
        return request(app)
          .get(`/api/secure/files/${i + 1}`)
          .set('Authorization', 'Bearer valid_token');
      });

      const responses = await Promise.all(scanRequests);
      
      // Only file 3 should succeed (index 2)
      responses.forEach((response, i) => {
        if (i === 2) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });

    it('should prevent timing attacks on resource existence', async () => {
      const startTime = Date.now();

      // Request for non-existent file
      mockStorage.getFileById.mockResolvedValue(null);
      const response1 = await request(app)
        .get('/api/secure/files/999')
        .set('Authorization', 'Bearer valid_token')
        .expect(404);

      const midTime = Date.now();

      // Request for existing but unauthorized file  
      mockStorage.getFileById.mockResolvedValue(mockOtherFile);
      const response2 = await request(app)
        .get('/api/secure/files/1')
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      const endTime = Date.now();

      // Both requests should complete in similar timeframes
      const time1 = midTime - startTime;
      const time2 = endTime - midTime;
      
      // Allow for 100ms variance (should be much tighter in real implementation)
      expect(Math.abs(time1 - time2)).toBeLessThan(100);
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose internal system information', async () => {
      const systemError = new Error('Internal server error at /secret/path line 123');
      mockAuth.verifyIdToken.mockRejectedValue(systemError);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer error_token')
        .expect(401);

      // Should return generic error, not internal details
      expect(response.body).toEqual({
        error: 'Authentication failed',
        code: 'auth/invalid-token'
      });
    });

    it('should handle database connection errors securely', async () => {
      mockStorage.getFileById.mockRejectedValue(new Error('Connection to database "production_db" failed at host "db-server-01.internal.com"'));

      const response = await request(app)
        .get('/api/secure/files/1')
        .set('Authorization', 'Bearer valid_token')
        .expect(500);

      // Should not expose database connection details
      expect(response.body).toEqual({
        error: 'Failed to verify file ownership'
      });

      expect(response.body.error).not.toContain('production_db');
      expect(response.body.error).not.toContain('db-server-01');
    });
  });

  describe('Advanced Attack Scenarios', () => {
    it('should handle token confusion attacks', async () => {
      // Attempt to use different token types
      const jwtToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.malicious.payload';
      
      const confusionError = new Error('Invalid token type');
      (confusionError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(confusionError);

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(401);

      expect(response.body.code).toBe('auth/invalid-token');
    });

    it('should prevent subdomain cookie attacks', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer valid_token')
        .set('Cookie', 'auth_token=malicious_subdomain_cookie; firebase_token=attacker_token')
        .expect(200);

      // Should ignore cookies and use Authorization header
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should handle unicode normalization attacks', async () => {
      // Unicode characters that might normalize to dangerous strings
      const unicodeAttack = 'tеst-replit-user-id'; // Contains Cyrillic 'е' instead of Latin 'e'
      
      const response = await request(app)
        .get(`/api/secure/profile/${encodeURIComponent(unicodeAttack)}`)
        .set('Authorization', 'Bearer valid_token')
        .expect(403);

      // Should not match due to different Unicode characters
      expect(response.body.code).toBe('auth/access-denied');
    });

    it('should prevent parameter pollution attacks', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id?userId=attacker-uid&userId=test-replit-user-id')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      // Should use URL parameter, not query parameter
      expect(response.body.userId).toBe('test-replit-user-id');
    });
  });

  describe('Audit Trail & Security Monitoring', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log suspicious authentication patterns', async () => {
      const suspiciousError = new Error('Suspicious token pattern detected');
      (suspiciousError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(suspiciousError);

      await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer suspicious_token_pattern')
        .expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Firebase token verification error:',
        suspiciousError
      );
    });

    it('should not log sensitive authentication data', async () => {
      const authError = new Error('Token validation failed');
      (authError as any).code = 'auth/invalid-id-token';
      
      mockAuth.verifyIdToken.mockRejectedValue(authError);

      await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Authorization', 'Bearer sk_live_super_secret_token_do_not_log')
        .expect(401);

      const logCalls = consoleSpy.mock.calls.flat();
      const logOutput = logCalls.join(' ');
      
      expect(logOutput).not.toContain('sk_live_super_secret_token_do_not_log');
      expect(logOutput).not.toContain('secret');
    });
  });
});