import { Readable } from 'stream';

// Mock Replit Auth session user
export const mockReplitUser = {
  id: 'test-replit-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profileImageUrl: 'https://example.com/avatar.png'
};

// Mock authenticated request with Replit Auth session
export const createAuthenticatedRequest = (overrides = {}) => ({
  isAuthenticated: () => true,
  user: {
    claims: {
      sub: mockReplitUser.id,
      email: mockReplitUser.email,
      first_name: mockReplitUser.firstName,
      last_name: mockReplitUser.lastName,
      profile_image: mockReplitUser.profileImageUrl
    }
  },
  ...overrides
});

// Mock unauthenticated request
export const createUnauthenticatedRequest = () => ({
  isAuthenticated: () => false,
  user: null
});

// SendGrid mock is now in jest.setup.js for proper timing
// Export these responses for test use
export const mockSendGridResponse = [
  {
    statusCode: 202,
    body: '',
    headers: {
      'x-message-id': 'abc123.filter001.12345.67890',
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '99',
      'x-ratelimit-reset': '1641234600',
      'access-control-allow-origin': 'https://sendgrid.api-docs.io',
      'access-control-allow-methods': 'POST',
      'server': 'nginx'
    }
  }
];

export const mockSendGridRateLimitResponse = [
  {
    statusCode: 429,
    body: '{"errors":[{"message":"Rate limit exceeded","field":null,"help":null}]}',
    headers: {
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1641234600',
      'retry-after': '60'
    }
  }
];

// Access SendGrid mock from global setup
export const mockSendGrid = (global as any).mockSendGrid;

// Mock PostHog Node
export const mockPostHogNode = {
  PostHog: jest.fn().mockImplementation(() => ({
    identify: jest.fn(),
    capture: jest.fn(),
    shutdown: jest.fn()
  }))
};

// Import the storage mock from the global jest setup
// Note: this will be the same mock instance that routes will use
export const mockStorage = require('../../storage/index').storage;

// Import the Stripe mock from jest.setup.js (will be same instance as routes)
const StripeClass = require('stripe');
export const mockStripeInstance = new StripeClass();

// Apply mocks
jest.mock('posthog-node', () => mockPostHogNode);

// Export reset function for test cleanup
export const resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset mock implementations to defaults
  if (mockStorage.getUserById) mockStorage.getUserById.mockResolvedValue(null);
  if (mockStorage.getUserByEmail) mockStorage.getUserByEmail.mockResolvedValue(null);
  if (mockStorage.getItemsByUserId) mockStorage.getItemsByUserId.mockResolvedValue([]);
  if (mockStorage.createUser) mockStorage.createUser.mockResolvedValue({ id: 'test-replit-user-id' });
  if (mockStorage.updateUser) mockStorage.updateUser.mockResolvedValue({ id: 'test-replit-user-id' });
  if (mockStorage.upsertUser) mockStorage.upsertUser.mockResolvedValue({ id: 'test-replit-user-id' });
  if (mockStorage.createItem) mockStorage.createItem.mockResolvedValue({ id: 1, item: 'test', userId: 'test-replit-user-id' });
  if (mockStorage.updateItemStatus) mockStorage.updateItemStatus.mockResolvedValue({ id: 1, item: 'test', userId: 'test-replit-user-id', status: 'completed' });
  if (mockStorage.deleteItem) mockStorage.deleteItem.mockResolvedValue(undefined);

  // Reset SendGrid mock defaults
  if ((global as any).mockMailServiceInstance) {
    (global as any).mockMailServiceInstance.send.mockResolvedValue(mockSendGridResponse);
    (global as any).mockMailServiceInstance.setApiKey.mockClear();
    (global as any).mockMailServiceInstance.send.mockClear();
  }

  // Reset Stripe mock defaults
  mockStripeInstance.customers.create.mockResolvedValue({
    id: 'cus_test123',
    email: 'test@example.com',
    metadata: { userId: 'test-replit-user-id' },
    created: 1641234567,
    currency: 'usd',
    default_source: null,
    delinquent: false,
    description: null,
    discount: null,
    invoice_prefix: 'ABC123',
    livemode: false,
    name: null,
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none'
  });
  mockStripeInstance.checkout.sessions.create.mockResolvedValue({
    id: 'cs_test123',
    url: 'https://checkout.stripe.com/pay/cs_test123#fidkdWxOYHwnPyd1blpxblppbHNgWjA0VEpQYkpmSGw3MFVLMlZcYWduQXJSTVdCfHxkYEhwZFNtNWBVcUJGVTN%3D',
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: null,
    amount_subtotal: 2000,
    amount_total: 2000,
    automatic_tax: { enabled: false, status: null },
    billing_address_collection: null,
    cancel_url: 'https://example.com/cancel',
    client_reference_id: null,
    consent: null,
    consent_collection: null,
    created: 1641234567,
    currency: 'usd',
    custom_text: { shipping_address: null, submit: null },
    customer: null,
    customer_creation: 'if_required',
    customer_details: null,
    customer_email: null,
    expires_at: 1641320967,
    invoice: null,
    invoice_creation: { enabled: false, invoice_data: {} },
    livemode: false,
    locale: null,
    mode: 'payment',
    payment_intent: 'pi_test123',
    payment_link: null,
    payment_method_collection: 'always',
    payment_method_configuration_details: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    payment_status: 'unpaid',
    phone_number_collection: { enabled: false },
    recovered_from: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status: 'open',
    submit_type: null,
    subscription: null,
    success_url: 'https://example.com/success',
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
    ui_mode: 'hosted'
  });
  mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
    id: 'bps_test123',
    object: 'billing_portal.session',
    configuration: 'bpc_test123',
    created: 1641234567,
    customer: 'cus_test123',
    flow: null,
    livemode: false,
    locale: null,
    on_behalf_of: null,
    return_url: 'https://example.com/account',
    url: 'https://billing.stripe.com/p/session/test_YWNjdF8xTEJEMjlBN3g5RFFuVUpy'
  });
};
