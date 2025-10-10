# Testing Guide

This project includes comprehensive unit tests covering all critical workflows with minimal complexity and maximum coverage.

## Test Structure

### Server Tests
- **`auth-workflow.test.ts`** - Authentication, user creation, PostHog tracking
- **`payment-workflow.test.ts`** - Stripe checkout, customer portal
- **`file-workflow.test.ts`** - File upload, download, storage limits
- **`email-workflow.test.ts`** - SendGrid integration, notifications
- **`storage.test.ts`** - Database operations, user ownership

This template focuses tests on the server API and storage layers. There are no client-side tests included.

## Running Tests

### Local Development
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- server/__tests__/auth-workflow.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="payment"
```

### GitHub CI
Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

## Coverage Targets
- **Lines**: 80%
- **Functions**: 75%
- **Branches**: 70%
- **Statements**: 80%

## Mock Strategy

All external services are mocked:
- **Firebase Auth** - Token validation, user state
- **Stripe** - Payment processing, customer management
- **SendGrid** - Email delivery
- **Firebase Storage** - File operations
- **PostHog** - Analytics tracking

Mocks are centralized in `server/__tests__/setup/mocks.ts` for consistency.

## Test Environment

Tests use:
- **Jest** with TypeScript support
- **React Testing Library** for component tests
- **Supertest** for API endpoint tests
- **jsdom** environment for browser APIs

## Environment Variables

Tests use mock environment variables (defined in `.env.test` for local testing):
```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test_db  # Mocked, but required
SENDGRID_API_KEY=SG.test_key
SENDGRID_FROM=test@example.com
STRIPE_SECRET_KEY=sk_test_key
POSTHOG_API_KEY=phc_test_key
FIREBASE_PROJECT_ID=test-project
FIREBASE_PRIVATE_KEY=test-key
FIREBASE_CLIENT_EMAIL=test@test.com
```

**Note:** The `DATABASE_URL` is required to prevent initialization errors but the actual database is mocked - no real connection is made.

## Health and Readiness Endpoints

- `GET /health` should always return 200; useful for liveness checks.
- `GET /ready` returns 200 when the DB connection is healthy, 503 otherwise. In tests the DB layer is mocked, so this typically returns 200.

## Rate Limiting in Tests

- Global `/api` limiter: 500 requests per 15 minutes, keyed by authenticated user (if token present via mocked auth) or IP. Most tests won’t hit this limit.
- AI chat limiter: In test mode, the per-route chat limiter `max` is set very high to avoid flakiness.
- If you encounter 429s in tests, narrow the scope of requests or adjust the test to avoid hot loops.

## Debugging Tests

### Common Issues
1. **Import errors** - Check module paths and mocks
2. **Async timeouts** - Increase test timeout (currently 10s)
3. **Mock conflicts** - Ensure `resetAllMocks()` is called

### Debug Commands
```bash
# Run with verbose output
npm test -- --verbose

# Run single test with debug info
npm test -- --testNamePattern="specific test" --verbose

# Check for open handles
npm test -- --detectOpenHandles
```

## Adding New Tests

### Server Tests
1. Import mocks: `import './setup/mocks'`
2. Use `resetAllMocks()` in `beforeEach`
3. Mock auth middleware for protected routes
4. Test both success and error cases

### Client Tests
1. Wrap components with `QueryClientProvider`
2. Mock hooks and external dependencies
3. Use `waitFor` for async operations
4. Test user interactions and error states

## Console Output

Console output (`console.log`, `console.error`, `console.warn`, `console.debug`) is suppressed during tests to keep output clean. This is configured in `jest.afterEnv.js`.

To enable console output for debugging, uncomment the relevant lines in `jest.afterEnv.js`.

## Jest Setup Files

- **`jest.setup.js`** - Environment variables and module mocks (runs before Jest framework loads)
- **`jest.afterEnv.js`** - Console suppression using Jest APIs (runs after Jest framework loads)

## Best Practices

1. **Test behavior, not implementation**
2. **Mock external dependencies completely**
3. **Use descriptive test names**
4. **Test error cases and edge conditions**
5. **Keep tests fast and focused**
6. **Maintain high coverage on critical paths**

## CI/CD Integration

The test suite is designed for GitHub Actions:
- No external service dependencies
- Fast execution (< 2 minutes)
- Comprehensive coverage reporting
- Automatic security auditing
