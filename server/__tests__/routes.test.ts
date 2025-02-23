
import request from 'supertest';
import { createServer } from '../routes';
import express from 'express';
import { storage } from '../storage';
import Stripe from 'stripe';

jest.mock('../storage');
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'test_stripe_customer_id',
        email: 'test@example.com',
      }),
    },
  }));
});

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Sign Up Flow', () => {
    test('POST /api/users/ensure-stripe creates new user and stripe customer when user does not exist', async () => {
      const mockFirebaseId = 'test-firebase-id';
      const mockEmail = 'test@example.com';
      
      (storage.getUserByFirebaseId as jest.Mock).mockResolvedValueOnce(undefined);
      (storage.createUser as jest.Mock).mockResolvedValueOnce({
        id: 1,
        firebaseId: mockFirebaseId,
        email: mockEmail,
        stripeCustomerId: 'test_stripe_customer_id'
      });

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .send({
          firebaseId: mockFirebaseId,
          email: mockEmail
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stripeCustomerId', 'test_stripe_customer_id');
      expect(storage.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseId: mockFirebaseId,
          email: mockEmail,
          stripeCustomerId: 'test_stripe_customer_id'
        })
      );
    });

    test('POST /api/users/ensure-stripe returns existing stripe customer when user exists', async () => {
      const mockFirebaseId = 'existing-firebase-id';
      const mockEmail = 'existing@example.com';
      
      (storage.getUserByFirebaseId as jest.Mock).mockResolvedValueOnce({
        id: 1,
        firebaseId: mockFirebaseId,
        email: mockEmail,
        stripeCustomerId: 'existing_stripe_customer_id'
      });

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .send({
          firebaseId: mockFirebaseId,
          email: mockEmail
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('stripeCustomerId', 'existing_stripe_customer_id');
      expect(storage.createUser).not.toHaveBeenCalled();
    });

    test('POST /api/users/ensure-stripe handles missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .send({});

      expect(response.status).toBe(400);
    });

    test('POST /api/users/ensure-stripe handles stripe errors', async () => {
      const mockFirebaseId = 'test-firebase-id';
      const mockEmail = 'test@example.com';
      
      (storage.getUserByFirebaseId as jest.Mock).mockResolvedValueOnce(undefined);
      const mockStripeError = new Error('Stripe API Error');
      (Stripe as unknown as jest.Mock).mockImplementation(() => ({
        customers: {
          create: jest.fn().mockRejectedValue(mockStripeError)
        }
      }));

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .send({
          firebaseId: mockFirebaseId,
          email: mockEmail
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
