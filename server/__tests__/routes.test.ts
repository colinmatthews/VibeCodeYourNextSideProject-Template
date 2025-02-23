
import request from 'supertest';
import { createServer } from '../routes';
import express from 'express';
import { storage } from '../storage';

describe('API Routes', () => {
  let app: express.Express;
  let server: any;

  beforeAll(async () => {
    app = express();
    server = await createServer(app);
  });

  afterAll(() => {
    server.close();
  });

  describe('User Routes', () => {
    test('POST /api/users/ensure-stripe creates stripe customer', async () => {
      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .send({
          firebaseId: 'test-firebase-id',
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stripeCustomerId');
    });
  });

  describe('Contact Routes', () => {
    test('GET /api/contacts returns contacts for user', async () => {
      const response = await request(app)
        .get('/api/contacts')
        .query({ userId: 'test-user-id' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
