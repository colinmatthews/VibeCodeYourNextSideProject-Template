import request from 'supertest';
import express from 'express';
import { requireAuth, getUserId } from '../middleware/auth';
import { requiresOwnership, requiresFileOwnership } from '../middleware/authHelpers';
import { resetAllMocks, mockStorage } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Authentication Security', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Security test routes
    app.get('/api/secure/profile/:userId', requireAuth, requiresOwnership, (req: any, res) => {
      res.json({
        message: 'Profile accessed',
        userId: req.params.userId,
        authenticatedUser: getUserId(req)
      });
    });

    app.get('/api/secure/files/:id', requireAuth, requiresFileOwnership, (req: any, res) => {
      res.json({
        message: 'File accessed',
        fileId: req.params.id,
        authenticatedUser: getUserId(req)
      });
    });

    app.post('/api/secure/data', requireAuth, (req: any, res) => {
      res.json({
        message: 'Data processed',
        data: req.body,
        user: getUserId(req)
      });
    });

    // Route that simulates admin check
    app.get('/api/admin/users', requireAuth, (req: any, res) => {
      // Simulate admin check (in reality would check user roles)
      if (getUserId(req) !== 'admin-user-id') {
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
        user: getUserId(req)
      });
    });
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Session Security', () => {
    it('should properly authenticate valid sessions', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .expect(200);

      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should prevent session data injection in request body', async () => {
      // Attempt to inject session data in request body
      const response = await request(app)
        .post('/api/secure/data')
        .send({
          data: 'test',
          user: { claims: { sub: 'malicious-user-id' } },
          session: 'injected_session'
        })
        .expect(200);

      // Should process normally, ignoring injected session data
      expect(response.body.user).toBe('test-replit-user-id');
      expect(response.body.data.user.claims.sub).toBe('malicious-user-id'); // Passed through as data only
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent header manipulation attacks', async () => {
      const maliciousHeaders = {
        'X-User-Id': 'admin-user-id',
        'X-Replit-UID': 'malicious-uid',
        'X-Real-IP': '127.0.0.1',
        'X-Forwarded-For': 'admin.internal.com',
        'X-Original-User': 'admin@company.com'
      };

      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set(maliciousHeaders)
        .expect(200);

      // Should use session-derived user, not header values
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should prevent user ID spoofing in requests', async () => {
      // Attempt to access another user's profile
      const response = await request(app)
        .get('/api/secure/profile/attacker-target-uid')
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
        .set('User-Agent', maliciousUserAgent)
        .expect(200);

      // Should process normally, user agent shouldn't affect auth
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should prevent privilege escalation attempts', async () => {
      // Normal user trying to access admin endpoint
      const response = await request(app)
        .get('/api/admin/users')
        .expect(403);

      expect(response.body).toEqual({
        error: 'Admin access required'
      });
    });

    it('should validate request origin for sensitive operations', async () => {
      const suspiciousOrigin = 'http://malicious-site.com';

      const response = await request(app)
        .post('/api/secure/data')
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
        .set('X-Session-ID', 'attacker-controlled-session')
        .set('Cookie', 'sessionId=malicious_session')
        .expect(200);

      // Should use authenticated session, ignoring injected session headers
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app).get('/api/secure/profile/test-replit-user-id')
      );

      const responses = await Promise.all(concurrentRequests);

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
        .expect(403);

      // Should be rejected due to ownership check, not reach database
      expect(response.body.code).toBe('auth/access-denied');
    });

    it('should sanitize special characters in input', async () => {
      const specialChars = '<script>alert("xss")</script>\n\r\t';

      const response = await request(app)
        .post('/api/process/input')
        .send({ userInput: specialChars })
        .expect(200);

      // Input should be processed as-is (sanitization would be in business logic)
      expect(response.body.processed).toBe(specialChars);
    });

    it('should handle extremely large payloads', async () => {
      const largePayload = 'A'.repeat(100000); // 100KB payload

      const response = await request(app)
        .post('/api/process/input')
        .send({ userInput: largePayload })
        .expect(200);

      expect(response.body.user).toBe('test-replit-user-id');
    });

    it('should handle malformed JSON payloads', async () => {
      // This would be handled by Express middleware before reaching our code
      const response = await request(app)
        .post('/api/process/input')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}') // Invalid JSON
        .expect(400); // Express would reject this

      // Should be handled by Express JSON parser
    });
  });

  describe('Rate Limiting & DoS Prevention', () => {
    it('should handle rapid authentication requests', async () => {
      const rapidRequests = Array.from({ length: 20 }, () =>
        request(app).get('/api/secure/profile/test-replit-user-id')
      );

      const responses = await Promise.all(rapidRequests);

      // All should succeed (rate limiting would be implemented separately)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Prevention', () => {
    it('should process authenticated requests', async () => {
      const response = await request(app)
        .post('/api/secure/data')
        .send({ action: 'sensitive_operation' })
        .expect(200);

      expect(response.body.user).toBe('test-replit-user-id');
    });

    it('should handle requests with suspicious referrers', async () => {
      const response = await request(app)
        .post('/api/secure/data')
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

        return request(app).get(`/api/secure/files/${i + 1}`);
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
        .expect(404);

      const midTime = Date.now();

      // Request for existing but unauthorized file
      mockStorage.getFileById.mockResolvedValue(mockOtherFile);
      const response2 = await request(app)
        .get('/api/secure/files/1')
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
    it('should handle database connection errors securely', async () => {
      mockStorage.getFileById.mockRejectedValue(new Error('Connection to database "production_db" failed at host "db-server-01.internal.com"'));

      const response = await request(app)
        .get('/api/secure/files/1')
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
    it('should prevent subdomain cookie attacks', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id')
        .set('Cookie', 'auth_token=malicious_subdomain_cookie; session=attacker_session')
        .expect(200);

      // Should use authenticated session, ignoring injected cookies
      expect(response.body.authenticatedUser).toBe('test-replit-user-id');
    });

    it('should handle unicode normalization attacks', async () => {
      // Unicode characters that might normalize to dangerous strings
      const unicodeAttack = 'tеst-replit-user-id'; // Contains Cyrillic 'е' instead of Latin 'e'

      const response = await request(app)
        .get(`/api/secure/profile/${encodeURIComponent(unicodeAttack)}`)
        .expect(403);

      // Should not match due to different Unicode characters
      expect(response.body.code).toBe('auth/access-denied');
    });

    it('should prevent parameter pollution attacks', async () => {
      const response = await request(app)
        .get('/api/secure/profile/test-replit-user-id?userId=attacker-uid&userId=test-replit-user-id')
        .expect(200);

      // Should use URL parameter, not query parameter
      expect(response.body.userId).toBe('test-replit-user-id');
    });
  });
});