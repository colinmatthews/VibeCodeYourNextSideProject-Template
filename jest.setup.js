// This file runs BEFORE the Jest test framework is installed
// Use this for environment variables and module mocks only
// For Jest APIs (jest.fn, expect, beforeEach), use jest.afterEnv.js instead

// Mock environment variables for tests
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';
process.env.NODE_ENV = 'test';
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_key';
process.env.STRIPE_PRICE_ID_PRO = process.env.STRIPE_PRICE_ID_PRO || 'price_test_pro';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test_key';
// Use a stable, verified sender for tests
process.env.SENDGRID_FROM = process.env.SENDGRID_FROM || 'carlos@kindnessengineering.com';
process.env.POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || 'phc_test_key';

// Mock nanoid for ESM compatibility
jest.mock('nanoid', () => ({
  nanoid: () => 'test-nanoid-id-' + Math.random().toString(36).substring(7)
}));

// Mock the database module before any imports
const mockDbQuery = jest.fn().mockResolvedValue([]);

jest.mock('./server/db', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockImplementation(() => mockDbQuery())
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockImplementation(() => mockDbQuery())
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockImplementation(() => mockDbQuery())
        })
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockImplementation(() => mockDbQuery())
    })
  },
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

// Mock Drizzle ORM
jest.mock('drizzle-orm/neon-serverless', () => ({
  drizzle: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
  }))
}));

// Mock Neon serverless
jest.mock('@neondatabase/serverless', () => ({
  Pool: jest.fn(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  })),
  neonConfig: {
    webSocketConstructor: null
  }
}));

// Mock WebSocket
jest.mock('ws', () => ({}));

// Mock PostHog - prevent real analytics and timers
jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    identify: jest.fn(),
    capture: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
    isFeatureEnabled: jest.fn().mockResolvedValue(false),
    getFeatureFlag: jest.fn().mockResolvedValue(null),
    reloadFeatureFlags: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Storage - essential to prevent real DB access
jest.mock('./server/storage/index', () => ({
  storage: {
    getUserById: jest.fn().mockResolvedValue(null),
    getUserByEmail: jest.fn().mockResolvedValue(null),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    upsertUser: jest.fn(),
    getItemsByUserId: jest.fn().mockResolvedValue([]),
    createItem: jest.fn(),
    updateItemStatus: jest.fn(),
    deleteItem: jest.fn()
  }
}));

// Mock Stripe - prevent real API calls
const mockStripeInstance = {
  customers: {
    create: jest.fn().mockResolvedValue({
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
    }),
    retrieve: jest.fn(),
    update: jest.fn()
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
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
      }),
      listLineItems: jest.fn().mockResolvedValue({
        data: [
          {
            price: { product: 'prod_test123' },
            quantity: 1
          }
        ]
      })
    }
  },
  billingPortal: {
    sessions: {
      create: jest.fn().mockResolvedValue({
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
      })
    }
  },
  subscriptions: {
    retrieve: jest.fn().mockResolvedValue({
      id: 'sub_test123',
      metadata: {
        userId: 'test-replit-user-id'
      },
      object: 'subscription',
      application: null,
      application_fee_percent: null,
      automatic_tax: { enabled: false },
      billing_cycle_anchor: 1641234567,
      billing_thresholds: null,
      cancel_at: null,
      cancel_at_period_end: false,
      canceled_at: null,
      collection_method: 'charge_automatically',
      created: 1641234567,
      current_period_end: 1643826567,
      current_period_start: 1641234567,
      customer: 'cus_test123',
      days_until_due: null,
      default_payment_method: null,
      default_source: null,
      default_tax_rates: [],
      description: null,
      discount: null,
      ended_at: null,
      items: { object: 'list', data: [], has_more: false, total_count: 0, url: '/v1/subscription_items?subscription=sub_test123' },
      latest_invoice: 'in_test123',
      livemode: false,
      next_pending_invoice_item_invoice: null,
      pause_collection: null,
      payment_settings: { payment_method_options: null, payment_method_types: null, save_default_payment_method: 'off' },
      pending_invoice_item_interval: null,
      pending_setup_intent: null,
      pending_update: null,
      schedule: null,
      start_date: 1641234567,
      status: 'active',
      test_clock: null,
      transfer_data: null,
      trial_end: null,
      trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } },
      trial_start: null
    })
  },
  webhooks: {
    constructEvent: jest.fn().mockImplementation((payload, sig, endpointSecret) => {
      // Mock webhook event structure
      return {
        id: 'evt_test123',
        object: 'event',
        api_version: '2023-10-16',
        created: 1641234567,
        data: {
          object: {
            id: 'cs_test123',
            object: 'checkout.session'
          }
        },
        livemode: false,
        pending_webhooks: 1,
        request: {
          id: 'req_test123',
          idempotency_key: null
        },
        type: 'checkout.session.completed'
      };
    })
  },
  errors: {
    StripeError: class extends Error {
      type = 'StripeError';
      statusCode = 400;
      constructor(message, type = 'StripeError', statusCode = 400) {
        super(message);
        this.type = type;
        this.statusCode = statusCode;
      }
    },
    StripeCardError: class extends Error {
      type = 'StripeCardError';
      statusCode = 402;
      constructor(message) {
        super(message);
        this.type = 'StripeCardError';
        this.statusCode = 402;
        this.code = 'card_declined';
      }
    },
    StripeRateLimitError: class extends Error {
      type = 'StripeRateLimitError';
      statusCode = 429;
      constructor(message) {
        super(message);
        this.type = 'StripeRateLimitError';
        this.statusCode = 429;
      }
    }
  }
};

// Create mock Stripe constructor with errors property
const MockStripe = jest.fn().mockImplementation(() => mockStripeInstance);

// Add the errors property to the Stripe constructor itself
MockStripe.errors = {
  StripeError: class extends Error { 
    type = 'StripeError';
    statusCode = 400;
    constructor(message, type = 'StripeError', statusCode = 400) {
      super(message);
      this.name = 'StripeError';
      this.type = type;
      this.statusCode = statusCode;
    }
  },
  StripeCardError: class extends Error {
    type = 'StripeCardError';
    statusCode = 402;
    constructor(message) {
      super(message);
      this.name = 'StripeCardError';
      this.type = 'StripeCardError';
      this.statusCode = 402;
      this.code = 'card_declined';
    }
  },
  StripeRateLimitError: class extends Error {
    type = 'StripeRateLimitError';
    statusCode = 429;
    constructor(message) {
      super(message);
      this.name = 'StripeRateLimitError';
      this.type = 'StripeRateLimitError';
      this.statusCode = 429;
    }
  },
  StripeSignatureVerificationError: class extends Error {
    type = 'StripeSignatureVerificationError';
    constructor(message, header, payload) {
      super(message);
      this.name = 'StripeSignatureVerificationError';
      this.type = 'StripeSignatureVerificationError';
      this.header = header;
      this.payload = payload;
    }
  }
};

jest.mock('stripe', () => MockStripe);

// Mock SendGrid - prevent real API calls and HTTP client instantiation
const mockSendGridResponse = [
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

// Create a mock that doesn't instantiate any real HTTP clients
const mockMailServiceInstance = {
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue(mockSendGridResponse),
  // Add other methods that might be called
  setSubstitutionWrappers: jest.fn(),
  setTimeout: jest.fn()
};

// Mock the MailService class constructor to return our mock instance
// This prevents the real @sendgrid/mail from creating HTTP clients
const MockMailService = jest.fn(function() {
  return mockMailServiceInstance;
});

// Attach prototype methods to prevent any instantiation issues
MockMailService.prototype.setApiKey = jest.fn();
MockMailService.prototype.send = jest.fn().mockResolvedValue(mockSendGridResponse);
MockMailService.prototype.setSubstitutionWrappers = jest.fn();
MockMailService.prototype.setTimeout = jest.fn();

const mockSendGrid = {
  MailService: MockMailService,
  // Mock other exports if needed
  default: MockMailService
};

// Export for test access
global.mockSendGrid = mockSendGrid;
global.mockMailServiceInstance = mockMailServiceInstance;

jest.mock('@sendgrid/mail', () => mockSendGrid, { virtual: true });

// Mock Auth Middleware - uses Replit session-based auth pattern
jest.mock('./server/middleware/auth', () => ({
  requireAuth: jest.fn((req, res, next) => {
    // Check if request has mock authentication set up
    const isAuthenticated = req.isAuthenticated ? req.isAuthenticated() : true;
    const user = req.user;

    // For most tests, provide default Replit session authentication
    if (!isAuthenticated || !user) {
      // Default auth for tests - simulate authenticated Replit session
      req.isAuthenticated = () => true;
      req.user = {
        claims: {
          sub: 'test-replit-user-id',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          profile_image_url: 'https://example.com/avatar.png'
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
    }

    return next();
  }),
  optionalAuth: jest.fn((req, res, next) => {
    // Optional auth just passes through - session will be available if authenticated
    return next();
  }),
  getUserId: jest.fn((req) => {
    return req.user?.claims?.sub || null;
  }),
  AuthenticatedRequest: {}
}));

// Mock Replit Auth integration
jest.mock('./server/replit_integrations/auth', () => ({
  setupAuth: jest.fn().mockResolvedValue(undefined),
  isAuthenticated: jest.fn((req, res, next) => {
    // Simulate authenticated Replit session for tests
    if (!req.isAuthenticated) {
      req.isAuthenticated = () => true;
    }
    if (!req.user) {
      req.user = {
        claims: {
          sub: 'test-replit-user-id',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          profile_image_url: 'https://example.com/avatar.png'
        },
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };
    }
    return next();
  }),
  getSession: jest.fn(),
  registerAuthRoutes: jest.fn(),
  authStorage: {
    getUser: jest.fn().mockResolvedValue(null),
    upsertUser: jest.fn().mockResolvedValue({ id: 'test-replit-user-id' })
  }
}));
