import request from 'supertest';
import express from 'express';
import { registerWebhookRoutes } from '../routes/webhookRoutes';
import { resetAllMocks, mockStorage, mockStripeInstance } from './setup/mocks';

// Import and apply mocks
import './setup/mocks';

describe('Webhook Workflow', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = express();
    // Webhook endpoint needs raw body parsing for signature verification
    app.use('/api/webhook', express.raw({ type: 'application/json' }));
    await registerWebhookRoutes(app);
  });

  beforeAll(() => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
  });

  beforeEach(() => {
    resetAllMocks();
  });

  afterAll(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  // Mock webhook event data based on actual Stripe event structures
  const mockEvents = {
    checkoutSessionCompleted: {
      id: 'evt_test_checkout_completed',
      object: 'event',
      created: 1234567890,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session123',
          object: 'checkout.session',
          mode: 'subscription',
          payment_status: 'paid',
          metadata: {
            userId: 'test-replit-user-id'
          },
          subscription: 'sub_test123'
        }
      }
    },
    
    checkoutSessionExpired: {
      id: 'evt_test_checkout_expired',
      object: 'event',
      created: 1234567890,
      type: 'checkout.session.expired',
      data: {
        object: {
          id: 'cs_test_expired123',
          object: 'checkout.session',
          metadata: {
            userId: 'test-replit-user-id'
          }
        }
      }
    },

    subscriptionCreated: {
      id: 'evt_test_subscription_created',
      object: 'event',
      created: 1234567890,
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test123',
          object: 'subscription',
          status: 'active',
          metadata: {
            userId: 'test-replit-user-id'
          }
        }
      }
    },

    subscriptionUpdated: {
      id: 'evt_test_subscription_updated',
      object: 'event',
      created: 1234567890,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          object: 'subscription',
          status: 'active',
          metadata: {
            userId: 'test-replit-user-id'
          }
        }
      }
    },

    subscriptionDeleted: {
      id: 'evt_test_subscription_deleted',
      object: 'event',
      created: 1234567890,
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test123',
          object: 'subscription',
          status: 'canceled',
          metadata: {
            userId: 'test-replit-user-id'
          }
        }
      }
    },

    invoicePaymentSucceeded: {
      id: 'evt_test_invoice_succeeded',
      object: 'event',
      created: 1234567890,
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test123',
          object: 'invoice',
          subscription: 'sub_test123'
        }
      }
    },

    invoicePaymentFailed: {
      id: 'evt_test_invoice_failed',
      object: 'event',
      created: 1234567890,
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test_failed123',
          object: 'invoice',
          subscription: 'sub_test123'
        }
      }
    }
  };

  // Helper function to create valid webhook signature
  const createWebhookPayload = (event: any) => {
    const payload = JSON.stringify(event);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = `t=${timestamp},v1=test_signature`;
    
    return {
      payload: Buffer.from(payload),
      signature,
      event
    };
  };

  // Mock stripe.webhooks.constructEvent to return our test events
  const mockConstructEvent = (expectedEvent: any) => {
    const stripe = require('stripe');
    const mockStripe = stripe();
    mockStripe.webhooks.constructEvent.mockReturnValue(expectedEvent);
    return mockStripe;
  };

  describe('Webhook Signature Verification', () => {
    it('should reject webhook with missing signature', async () => {
      const { payload } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      
      // Mock constructEvent to throw signature error for missing signature
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new stripe.errors.StripeSignatureVerificationError(
          'No signatures found matching the expected signature for payload',
          '', // header
          '' // payload
        );
      });
      
      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .expect(400);

      expect(response.text).toContain('Webhook Error:');
    });

    it('should reject webhook with invalid signature', async () => {
      const { payload } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      
      // Mock constructEvent to throw signature error
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new stripe.errors.StripeSignatureVerificationError(
          'Invalid signature',
          'invalid-sig', // header
          payload // payload
        );
      });
      
      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', 'invalid_signature')
        .expect(400);

      expect(response.text).toContain('Webhook Error: Invalid signature');
    });

    it('should reject webhook when webhook secret not configured', async () => {
      // Temporarily remove the secret
      const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      
      const { payload, signature } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      
      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(400);

      expect(response.text).toContain('Webhook Error: Webhook secret not configured');
      
      // Restore the secret for other tests
      process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
    });
  });

  describe('checkout.session.completed', () => {
    it('should fulfill subscription checkout session and upgrade user to pro', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      mockConstructEvent(mockEvents.checkoutSessionCompleted);
      
      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'pro'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      // Verify user subscription was updated
      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'pro'
      });

      expect(response.body).toEqual({ received: true });
    });

    it('should handle one-time payment checkout session', async () => {
      const paymentEvent = {
        ...mockEvents.checkoutSessionCompleted,
        data: {
          object: {
            ...mockEvents.checkoutSessionCompleted.data.object,
            mode: 'payment',
            payment_intent: 'pi_test123',
            subscription: null
          }
        }
      };

      const { payload, signature } = createWebhookPayload(paymentEvent);
      mockConstructEvent(paymentEvent);

      // Mock Stripe API call for line items
      mockStripeInstance.checkout.sessions.listLineItems.mockResolvedValue({
        data: [
          {
            price: { product: 'prod_test123' },
            quantity: 1
          }
        ]
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      // Verify line items were retrieved for one-time payment processing
      expect(mockStripeInstance.checkout.sessions.listLineItems).toHaveBeenCalledWith(
        'cs_test_session123',
        { expand: ['data.price.product'] }
      );

      expect(response.body).toEqual({ received: true });
    });

    it('should skip fulfillment if payment not completed', async () => {
      const unpaidEvent = {
        ...mockEvents.checkoutSessionCompleted,
        data: {
          object: {
            ...mockEvents.checkoutSessionCompleted.data.object,
            payment_status: 'unpaid'
          }
        }
      };

      const { payload, signature } = createWebhookPayload(unpaidEvent);
      mockConstructEvent(unpaidEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      // Verify no user update was called
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('should handle missing user ID in metadata', async () => {
      const noMetadataEvent = {
        ...mockEvents.checkoutSessionCompleted,
        data: {
          object: {
            ...mockEvents.checkoutSessionCompleted.data.object,
            metadata: {}
          }
        }
      };

      const { payload, signature } = createWebhookPayload(noMetadataEvent);
      mockConstructEvent(noMetadataEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      // Should complete without error but not update user
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('should handle database errors during fulfillment', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      mockConstructEvent(mockEvents.checkoutSessionCompleted);

      // Mock database error
      mockStorage.updateUser.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to process webhook' });
    });
  });

  describe('checkout.session.expired', () => {
    it('should handle expired checkout session', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.checkoutSessionExpired);
      mockConstructEvent(mockEvents.checkoutSessionExpired);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });
  });

  describe('customer.subscription.created', () => {
    it('should handle subscription creation', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.subscriptionCreated);
      mockConstructEvent(mockEvents.subscriptionCreated);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });
  });

  describe('customer.subscription.updated', () => {
    it('should upgrade user when subscription becomes active', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.subscriptionUpdated);
      mockConstructEvent(mockEvents.subscriptionUpdated);

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'pro'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'pro'
      });

      expect(response.body).toEqual({ received: true });
    });

    it('should downgrade user when subscription is canceled', async () => {
      const canceledEvent = {
        ...mockEvents.subscriptionUpdated,
        data: {
          object: {
            ...mockEvents.subscriptionUpdated.data.object,
            status: 'canceled'
          }
        }
      };

      const { payload, signature } = createWebhookPayload(canceledEvent);
      mockConstructEvent(canceledEvent);

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'free'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'free'
      });

      expect(response.body).toEqual({ received: true });
    });

    it('should downgrade user when subscription is past due', async () => {
      const pastDueEvent = {
        ...mockEvents.subscriptionUpdated,
        data: {
          object: {
            ...mockEvents.subscriptionUpdated.data.object,
            status: 'past_due'
          }
        }
      };

      const { payload, signature } = createWebhookPayload(pastDueEvent);
      mockConstructEvent(pastDueEvent);

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'free'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'free'
      });
    });

    it('should downgrade user when subscription is unpaid', async () => {
      const unpaidEvent = {
        ...mockEvents.subscriptionUpdated,
        data: {
          object: {
            ...mockEvents.subscriptionUpdated.data.object,
            status: 'unpaid'
          }
        }
      };

      const { payload, signature } = createWebhookPayload(unpaidEvent);
      mockConstructEvent(unpaidEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'free'
      });
    });

    it('should handle missing user ID in subscription metadata', async () => {
      const noMetadataEvent = {
        ...mockEvents.subscriptionUpdated,
        data: {
          object: {
            ...mockEvents.subscriptionUpdated.data.object,
            metadata: {}
          }
        }
      };

      const { payload, signature } = createWebhookPayload(noMetadataEvent);
      mockConstructEvent(noMetadataEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('customer.subscription.deleted', () => {
    it('should downgrade user when subscription is deleted', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.subscriptionDeleted);
      mockConstructEvent(mockEvents.subscriptionDeleted);

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'free'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'free'
      });

      expect(response.body).toEqual({ received: true });
    });

    it('should handle missing user ID in deleted subscription', async () => {
      const noMetadataEvent = {
        ...mockEvents.subscriptionDeleted,
        data: {
          object: {
            ...mockEvents.subscriptionDeleted.data.object,
            metadata: {}
          }
        }
      };

      const { payload, signature } = createWebhookPayload(noMetadataEvent);
      mockConstructEvent(noMetadataEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('should ensure user stays on pro plan after successful payment', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.invoicePaymentSucceeded);
      mockConstructEvent(mockEvents.invoicePaymentSucceeded);

      // Mock subscription retrieve
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        metadata: {
          userId: 'test-replit-user-id'
        }
      });

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'pro'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123');
      expect(mockStorage.updateUser).toHaveBeenCalledWith('test-replit-user-id', {
        subscriptionType: 'pro'
      });

      expect(response.body).toEqual({ received: true });
    });

    it('should handle invoice without subscription', async () => {
      const invoiceWithoutSub = {
        ...mockEvents.invoicePaymentSucceeded,
        data: {
          object: {
            ...mockEvents.invoicePaymentSucceeded.data.object,
            subscription: null
          }
        }
      };

      const { payload, signature } = createWebhookPayload(invoiceWithoutSub);
      mockConstructEvent(invoiceWithoutSub);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStripeInstance.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('should handle subscription without user ID', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.invoicePaymentSucceeded);
      mockConstructEvent(mockEvents.invoicePaymentSucceeded);

      // Mock subscription without user ID
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        metadata: {}
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('invoice.payment_failed', () => {
    it('should handle failed invoice payment without downgrading', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.invoicePaymentFailed);
      mockConstructEvent(mockEvents.invoicePaymentFailed);

      // Mock subscription retrieve
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test123',
        metadata: {
          userId: 'test-replit-user-id'
        }
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_test123');
      
      // Should not downgrade user immediately on payment failure
      expect(mockStorage.updateUser).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('should handle failed payment without subscription', async () => {
      const failedInvoiceWithoutSub = {
        ...mockEvents.invoicePaymentFailed,
        data: {
          object: {
            ...mockEvents.invoicePaymentFailed.data.object,
            subscription: null
          }
        }
      };

      const { payload, signature } = createWebhookPayload(failedInvoiceWithoutSub);
      mockConstructEvent(failedInvoiceWithoutSub);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(mockStripeInstance.subscriptions.retrieve).not.toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });
  });

  describe('Unhandled Events', () => {
    it('should handle unknown event types gracefully', async () => {
      const unknownEvent = {
        id: 'evt_unknown',
        object: 'event',
        created: 1234567890,
        type: 'unknown.event.type',
        data: { object: {} }
      };

      const { payload, signature } = createWebhookPayload(unknownEvent);
      mockConstructEvent(unknownEvent);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors during webhook processing', async () => {
      const { payload, signature } = createWebhookPayload(mockEvents.invoicePaymentSucceeded);
      mockConstructEvent(mockEvents.invoicePaymentSucceeded);

      // Mock Stripe API error
      mockStripeInstance.subscriptions.retrieve.mockRejectedValue(
        new Error('Stripe API Error')
      );

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to process webhook' });
    });

    it('should handle general errors during event processing', async () => {
      // Mock constructEvent to succeed but cause an error in processing
      mockConstructEvent({
        ...mockEvents.checkoutSessionCompleted,
        type: 'checkout.session.completed'
      });

      // Mock fulfillment error by causing updateUser to fail
      mockStorage.updateUser.mockRejectedValue(new Error('Processing error'));

      const { payload, signature } = createWebhookPayload(mockEvents.checkoutSessionCompleted);

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', signature)
        .expect(500);

      expect(response.body).toEqual({ error: 'Failed to process webhook' });
    });
  });

  describe('Security and Validation', () => {
    it('should verify webhook signature before processing', async () => {
      const { payload } = createWebhookPayload(mockEvents.checkoutSessionCompleted);
      
      // Mock constructEvent to be called and verify parameters
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.webhooks.constructEvent.mockImplementation((body: any, signature: any, secret: any) => {
        expect(secret).toBe('whsec_test_secret');
        expect(signature).toBeDefined();
        return mockEvents.checkoutSessionCompleted;
      });

      mockStorage.updateUser.mockResolvedValue({
        id: 'test-replit-user-id',
        subscriptionType: 'pro'
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(payload)
        .set('stripe-signature', 't=123,v1=test')
        .expect(200);

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(response.body).toEqual({ received: true });
    });

    it('should handle malformed webhook payload', async () => {
      const invalidPayload = Buffer.from('invalid json');
      
      // Mock constructEvent to throw parsing error
      const stripe = require('stripe');
      const mockStripe = stripe();
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid payload');
      });

      const response = await request(app)
        .post('/api/webhook')
        .send(invalidPayload)
        .set('stripe-signature', 't=123,v1=test')
        .expect(400);

      expect(response.text).toContain('Webhook Error: Invalid payload');
    });
  });
});