import request from 'supertest';
import express from 'express';
import { requireAuth, optionalAuth, getUserId } from '../middleware/auth';
import { resetAllMocks } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Authentication Middleware', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Test routes that use auth middleware
    app.get('/test-required', requireAuth, (req: any, res) => {
      res.json({
        message: 'Success',
        user: req.user,
        userId: getUserId(req)
      });
    });

    app.get('/test-optional', optionalAuth, (req: any, res) => {
      res.json({
        message: 'Success',
        user: req.user || null,
        userId: getUserId(req)
      });
    });
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Replit Session Authentication', () => {
    describe('Valid Sessions', () => {
      it('should process valid authenticated sessions', async () => {
        const response = await request(app)
          .get('/test-required')
          .expect(200);

        expect(response.body.message).toBe('Success');
        expect(response.body.user).toBeDefined();
        expect(response.body.user.claims.sub).toBe('test-replit-user-id');
        expect(response.body.userId).toBe('test-replit-user-id');
      });

      it('should extract user claims correctly', async () => {
        const response = await request(app)
          .get('/test-required')
          .expect(200);

        expect(response.body.user.claims).toEqual({
          sub: 'test-replit-user-id',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          profile_image_url: 'https://example.com/avatar.png'
        });
      });

      it('should include session expiry information', async () => {
        const response = await request(app)
          .get('/test-required')
          .expect(200);

        expect(response.body.user.expires_at).toBeDefined();
        expect(typeof response.body.user.expires_at).toBe('number');
      });
    });

    describe('getUserId Helper', () => {
      it('should return user ID from claims', async () => {
        const response = await request(app)
          .get('/test-required')
          .expect(200);

        expect(response.body.userId).toBe('test-replit-user-id');
      });
    });
  });

  describe('Optional Authentication', () => {
    it('should process valid sessions in optional auth', async () => {
      const response = await request(app)
        .get('/test-optional')
        .expect(200);

      expect(response.body.message).toBe('Success');
      expect(response.body.user).toBeDefined();
    });

    it('should continue without error when session available', async () => {
      const response = await request(app)
        .get('/test-optional')
        .expect(200);

      expect(response.body.message).toBe('Success');
    });
  });

  describe('Performance & Concurrency', () => {
    it('should handle concurrent auth requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app).get('/test-required')
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.userId).toBe('test-replit-user-id');
      });
    });

    it('should handle rapid sequential requests', async () => {
      const rapidRequests = [];

      for (let i = 0; i < 5; i++) {
        rapidRequests.push(request(app).get('/test-required'));
      }

      const responses = await Promise.all(rapidRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Session Data Extraction', () => {
    it('should extract email from session claims', async () => {
      const response = await request(app)
        .get('/test-required')
        .expect(200);

      expect(response.body.user.claims.email).toBe('test@example.com');
    });

    it('should extract profile information from session claims', async () => {
      const response = await request(app)
        .get('/test-required')
        .expect(200);

      const claims = response.body.user.claims;
      expect(claims.first_name).toBe('Test');
      expect(claims.last_name).toBe('User');
      expect(claims.profile_image_url).toBe('https://example.com/avatar.png');
    });
  });
});
