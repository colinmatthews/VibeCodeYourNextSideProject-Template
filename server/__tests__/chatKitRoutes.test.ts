import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import { registerChatKitRoutes } from '../routes/chatKitRoutes';
import { storage } from '../storage';

// Mock dependencies
jest.mock('../storage');
jest.mock('../middleware/auth', () => ({
  AuthenticatedRequest: class {},
  getUserId: (req: any) => req.user?.claims?.sub || null
}));
jest.mock('../replit_integrations/auth', () => ({
  isAuthenticated: (req: any, res: any, next: any) => {
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ error: 'Authentication required', code: 'auth/no-token' });
    }
    next();
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ChatKit Routes', () => {
  let app: Express;

  beforeEach(() => {
    // Set required env vars for tests
    process.env.OPENAI_API_KEY = 'test-api-key';
    process.env.OPENAI_CHATKIT_WORKFLOW_ID = 'wf_test123';

    app = express();
    app.use(express.json());
    app.use(cookieParser());

    // Add mock user to requests (Replit Auth session format)
    app.use((req: any, res, next) => {
      req.user = {
        claims: {
          sub: 'test-user-123',
          email: 'test@example.com'
        }
      };
      req.isAuthenticated = () => true;
      next();
    });

    registerChatKitRoutes(app);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/chatkit/session', () => {
    it('should create a ChatKit session successfully', async () => {
      const mockUserRecord = {
        id: 'test-user-123',
        email: 'test@example.com',
      };

      (storage.getUserById as jest.Mock).mockResolvedValue(mockUserRecord);

      const mockSessionResponse = {
        client_secret: 'test-client-secret',
        expires_at: Date.now() + 3600000,
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSessionResponse,
      });

      const response = await request(app)
        .post('/api/chatkit/session')
        .expect(200);

      expect(response.body).toHaveProperty('clientToken', 'test-client-secret');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('sessionId');

      // Verify cookie was set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain('chatkit_session_id');
    });

    it('should return 401 when user is not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use((req: any, res, next) => {
        req.user = null; // No authenticated user
        next();
      });
      registerChatKitRoutes(unauthApp);

      await request(unauthApp)
        .post('/api/chatkit/session')
        .expect(401);
    });

    it('should return 500 when OPENAI_API_KEY is not configured', async () => {
      const oldKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      await request(app)
        .post('/api/chatkit/session')
        .expect(500)
        .expect((res) => {
          expect(res.body.error).toContain('AI service not configured');
        });

      process.env.OPENAI_API_KEY = oldKey;
    });

    it('should return 500 when OPENAI_CHATKIT_WORKFLOW_ID is not configured', async () => {
      const oldWorkflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;
      delete process.env.OPENAI_CHATKIT_WORKFLOW_ID;

      await request(app)
        .post('/api/chatkit/session')
        .expect(500)
        .expect((res) => {
          expect(res.body.error).toContain('ChatKit not configured');
        });

      process.env.OPENAI_CHATKIT_WORKFLOW_ID = oldWorkflowId;
    });

    it('should handle OpenAI API errors gracefully', async () => {
      (storage.getUserById as jest.Mock).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      await request(app)
        .post('/api/chatkit/session')
        .expect(429)
        .expect((res) => {
          expect(res.body.error).toBe('Failed to create ChatKit session');
        });
    });

    it('should retry on network failures', async () => {
      (storage.getUserById as jest.Mock).mockResolvedValue({
        id: 'test-user-123',
        email: 'test@example.com',
      });

      const mockSessionResponse = {
        client_secret: 'test-client-secret',
        expires_at: Date.now() + 3600000,
      };

      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSessionResponse,
        });

      const response = await request(app)
        .post('/api/chatkit/session')
        .expect(200);

      expect(response.body).toHaveProperty('clientToken');
      expect(global.fetch).toHaveBeenCalledTimes(2); // Original + 1 retry
    });
  });

  describe('GET /api/chatkit/status', () => {
    it('should return ready status when properly configured', async () => {
      const oldKey = process.env.OPENAI_API_KEY;
      const oldWorkflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;

      process.env.OPENAI_API_KEY = 'test-key';
      process.env.OPENAI_CHATKIT_WORKFLOW_ID = 'wf_test123';

      const response = await request(app)
        .get('/api/chatkit/status')
        .expect(200);

      expect(response.body.status).toBe('ready');
      expect(response.body.message).toBe('ChatKit service is ready');
      expect(response.body.workflowId).toBe('wf_test123');

      process.env.OPENAI_API_KEY = oldKey;
      process.env.OPENAI_CHATKIT_WORKFLOW_ID = oldWorkflowId;
    });

    it('should return not_configured when API key is missing', async () => {
      const oldKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await request(app)
        .get('/api/chatkit/status')
        .expect(200);

      expect(response.body.status).toBe('not_configured');
      expect(response.body.message).toContain('OpenAI API key not configured');

      process.env.OPENAI_API_KEY = oldKey;
    });

    it('should return not_configured when workflow ID is missing', async () => {
      const oldWorkflowId = process.env.OPENAI_CHATKIT_WORKFLOW_ID;
      delete process.env.OPENAI_CHATKIT_WORKFLOW_ID;

      const response = await request(app)
        .get('/api/chatkit/status')
        .expect(200);

      expect(response.body.status).toBe('not_configured');
      expect(response.body.message).toContain('ChatKit workflow ID not configured');

      process.env.OPENAI_CHATKIT_WORKFLOW_ID = oldWorkflowId;
    });

    it('should return 401 when user is not authenticated', async () => {
      const unauthApp = express();
      unauthApp.use(express.json());
      unauthApp.use((req: any, res, next) => {
        req.user = null;
        next();
      });
      registerChatKitRoutes(unauthApp);

      await request(unauthApp)
        .get('/api/chatkit/status')
        .expect(401);
    });
  });
});
