import request from 'supertest';
import express from 'express';
import { registerPaymentRoutes } from '../routes/paymentRoutes';
import { resetAllMocks, mockStorage, mockStripeInstance } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Payment Workflow', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    await registerPaymentRoutes(app);
  });

  beforeEach(() => {
    resetAllMocks();
    process.env.STRIPE_PRICE_ID_PRO = 'price_test_pro123';
  });

  describe('POST /api/create-checkout-session - Stripe Checkout', () => {
    it('should create checkout session for new user without Stripe customer', async () => {
      // Setup: User exists but no Stripe customer
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: null
      };
      
      mockStorage.getUserById.mockResolvedValue(user);
      mockStorage.updateUser.mockResolvedValue({
        ...user,
        stripeCustomerId: 'cus_test123'
      });

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({
          mode: 'subscription',
          priceId: 'price_test_pro123',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel'
        })
        .expect(200);

      // Verify Stripe customer creation
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          userId: 'test-replit-user-id'
        }
      });

      // Verify user update with Stripe customer ID
      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        stripeCustomerId: 'cus_test123'
      });

      // Verify checkout session creation
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_test123',
        line_items: [
          {
            price: 'price_test_pro123',
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: 'https://example.com/success',
        cancel_url: 'https://example.com/cancel',
        metadata: {
          userId: 'test-replit-user-id'
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        automatic_tax: { enabled: false },
        subscription_data: {
          metadata: {
            userId: 'test-replit-user-id'
          }
        }
      });

      expect(response.body).toEqual({
        sessionId: 'cs_test123',
        url: expect.stringMatching(/^https:\/\/checkout\.stripe\.com\/pay\/cs_test123/)
      });
    });

    it('should create checkout session for existing user with Stripe customer', async () => {
      // Setup: User exists with Stripe customer
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({
          mode: 'payment',
          priceId: 'price_test_one_time',
          successUrl: 'https://example.com/success'
        })
        .expect(200);

      // Verify no new customer creation
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      expect(mockStorage.updateUser).not.toHaveBeenCalled();

      // Verify checkout session creation with existing customer
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing123',
        line_items: [
          {
            price: 'price_test_one_time',
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: 'https://example.com/success',
        cancel_url: expect.any(String), // Default cancel URL
        metadata: {
          userId: 'test-replit-user-id'
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        automatic_tax: { enabled: false }
      });
    });

    it('should use default price ID when none provided', async () => {
      // Setup: User exists with Stripe customer
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({}) // No priceId provided
        .expect(200);

      // Verify default price ID is used
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            {
              price: 'price_test_pro123', // Default price ID
              quantity: 1
            }
          ]
        })
      );
    });

    it('should handle user not found', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({
          priceId: 'price_test_pro123'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    it('should handle missing price ID configuration', async () => {
      // Remove default price ID
      delete process.env.STRIPE_PRICE_ID_PRO;
      
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({}) // No priceId and no default
        .expect(400);

      expect(response.body).toEqual({
        error: 'Price ID not configured'
      });
    });

    it('should handle Stripe errors', async () => {
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);
      
      // Setup Stripe error - use the global Stripe errors  
      const Stripe = require('stripe');
      const stripeError = new Stripe.errors.StripeError('Payment method error');
      mockStripeInstance.checkout.sessions.create.mockRejectedValue(stripeError);

      const response = await request(app)
        .post('/api/create-checkout-session')
        .send({
          priceId: 'price_test_pro123'
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Payment method error'
      });
    });
  });

  describe('POST /api/create-portal-session - Customer Portal', () => {
    it('should create portal session for user with Stripe customer', async () => {
      // Setup: User exists with Stripe customer
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);
      process.env.FRONTEND_URL = 'https://myapp.com';

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(200);

      // Verify portal session creation
      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing123',
        return_url: 'https://myapp.com/'
      });

      expect(response.body).toEqual({
        url: expect.stringMatching(/^https:\/\/billing\.stripe\.com\//)
      });
    });

    it('should use default return URL when FRONTEND_URL not set', async () => {
      // Remove frontend URL
      delete process.env.FRONTEND_URL;
      
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(200);

      // Verify default return URL
      expect(mockStripeInstance.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing123',
        return_url: 'http://localhost:5000/'
      });
    });

    it('should handle user not found', async () => {
      mockStorage.getUserById.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Customer not found or no Stripe customer ID'
      });
    });

    it('should handle user without Stripe customer ID', async () => {
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: null
      };
      
      mockStorage.getUserById.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(404);

      expect(response.body).toEqual({
        error: 'Customer not found or no Stripe customer ID'
      });
    });

    it('should handle Stripe portal errors', async () => {
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);
      
      // Setup Stripe error
      const Stripe = require('stripe');
      const stripeError = new Stripe.errors.StripeError('Customer not found');
      stripeError.type = 'invalid_request_error';
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(stripeError);

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Customer not found',
        type: 'invalid_request_error'
      });
    });

    it('should handle non-Stripe errors', async () => {
      const user = {
        id: 'test-replit-user-id',
        email: 'test@example.com',
        stripeCustomerId: 'cus_existing123'
      };
      
      mockStorage.getUserById.mockResolvedValue(user);
      
      // Setup non-Stripe error
      mockStripeInstance.billingPortal.sessions.create.mockRejectedValue(
        new Error('Network error')
      );

      const response = await request(app)
        .post('/api/create-portal-session')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to create portal session'
      });
    });
  });
});
