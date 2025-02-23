
import { jest } from '@jest/globals';

export const mockStripeCustomer = {
  id: 'test_stripe_customer_id',
  email: 'test@example.com',
  metadata: {
    firebaseId: 'test-firebase-id'
  }
};

export const createMockStripe = () => ({
  customers: {
    create: jest.fn().mockResolvedValue(mockStripeCustomer),
    update: jest.fn().mockResolvedValue(mockStripeCustomer)
  }
});
