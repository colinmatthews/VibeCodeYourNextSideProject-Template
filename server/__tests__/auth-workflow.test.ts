import request from 'supertest';
import express from 'express';
import { registerUserRoutes } from '../routes/userRoutes';
import { resetAllMocks, mockStorage, mockStripeInstance, mockPostHogNode } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Authentication Workflow', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerUserRoutes(app);
  });

  beforeEach(() => {
    resetAllMocks();
  });

  // Note: POST /api/login is now handled by Replit Auth redirect flow
  // The old Firebase-based login endpoint has been removed

  describe('POST /api/users/ensure-stripe - Stripe Customer Creation', () => {
    it('should create new user with Stripe customer when user does not exist', async () => {
      // Setup: No existing user
      mockStorage.getUserById.mockResolvedValue(null);
      
      const newUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_test123',
        subscriptionType: 'free'
      };
      
      mockStorage.createUser.mockResolvedValue(newUser);

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .expect(200);

      // Verify Stripe customer creation
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'test-replit-user-id' }
      });

      // Verify user creation with Stripe customer ID (uses upsertUser for new users)
      expect(mockStorage.upsertUser).toHaveBeenCalledWith({
        id: 'test-replit-user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileImageUrl: 'https://example.com/avatar.png',
        address: '',
        city: '',
        state: '',
        postalCode: '',
        isPremium: false,
        stripeCustomerId: 'cus_test123',
        subscriptionType: 'free',
        emailNotifications: false
      });

      expect(response.body).toEqual({
        stripeCustomerId: 'cus_test123'
      });
    });

    it('should return existing Stripe customer ID when user exists', async () => {
      // Setup: Existing user with Stripe customer
      const existingUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .expect(200);

      // Verify no new customer creation
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      expect(mockStorage.upsertUser).not.toHaveBeenCalled();

      expect(response.body).toEqual({
        stripeCustomerId: 'cus_existing123'
      });
    });

    it('should handle Stripe errors', async () => {
      // Setup: Stripe error
      mockStorage.getUserById.mockResolvedValue(null);
      mockStripeInstance.customers.create.mockRejectedValue(new Error('Stripe API Error'));

      const response = await request(app)
        .post('/api/users/ensure-stripe')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to ensure Stripe customer'
      });
    });
  });

  describe('PATCH /api/users/profile - Profile Updates', () => {
    it('should update user profile successfully', async () => {
      // Setup: Existing user
      const existingUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      const updatedUser = {
        ...existingUser,
        firstName: 'Jane',
        emailNotifications: true
      };
      
      mockStorage.getUserById.mockResolvedValue(existingUser);
      mockStorage.updateUser.mockResolvedValue(updatedUser);

      const response = await request(app)
        .patch('/api/users/profile')
        .send({
          firstName: 'Jane',
          emailNotifications: true
        })
        .expect(200);

      // Verify update call
      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        firstName: 'Jane',
        emailNotifications: true
      });

      expect(response.body).toEqual(updatedUser);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .patch('/api/users/profile')
        .send({
          firstName: '', // Invalid - too short
          lastName: 'A'.repeat(100) // Invalid - too long
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle user not found', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/users/profile')
        .send({
          firstName: 'Jane'
        })
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });
  });

  describe('GET /api/users/profile - Profile Retrieval', () => {
    it('should retrieve user profile successfully', async () => {
      // Setup: Existing user
      const existingUser = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionType: 'pro',
        isPremium: true,
        emailNotifications: true
      };
      
      mockStorage.getUserById.mockResolvedValue(existingUser);

      const response = await request(app)
        .get('/api/users/profile')
        .expect(200);

      expect(response.body).toEqual({
        id: 'test-replit-user-id',
        email: 'test@example.com',
        subscriptionType: 'pro',
        firstName: 'John',
        lastName: 'Doe',
        emailNotifications: true,
        isPremium: true
      });
    });

    it('should handle user not found', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/profile')
        .expect(404);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });
  });
});