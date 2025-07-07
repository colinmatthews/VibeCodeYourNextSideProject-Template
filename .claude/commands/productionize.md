# Repository Issue Scanner Prompt

You are an expert code auditor specializing in React, Node.js, and PostgreSQL full-stack applications. Please perform a comprehensive scan of this repository to identify issues that need to be resolved based on the following preferred stack and conventions.

## Technology Stack
- **Frontend**: React, TypeScript, React Query
- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL

## Before You Begin

**EXAMINE EXISTING PATTERNS FIRST**: Study the codebase thoroughly to understand established patterns:
- Review existing components in `client/src/components/`
- Study API routes in `server/routes/`
- Examine database schema in `shared/schema.ts`
- Check authentication patterns in `server/middleware/`
- Review storage layer implementations in `server/storage/`
- Study existing hooks in `client/src/hooks/`
- Examine build and deployment configuration

## Critical Anti-Patterns to Identify

### 1. Data Fetching Violations
- [ ] **Direct fetch() usage in components** - Should follow patterns established in existing hooks
- [ ] **Manual state management for API data** - Should use patterns from `client/src/hooks/`
- [ ] **Inconsistent query key patterns** - Should follow existing hook patterns
- [ ] **Missing error/loading state handling** - Should match existing error handling patterns
- [ ] **Manual refetching instead of cache invalidation** - Should use established data refresh patterns

### 2. Database Access Anti-Patterns
- [ ] **Direct database access in API routes** - Should follow storage patterns in `server/storage/`
- [ ] **Missing storage modules** - Should follow patterns from existing storage implementations
- [ ] **SQL injection vulnerabilities** - Should use Drizzle ORM patterns like existing code
- [ ] **Inconsistent error handling patterns** - Should match patterns in existing route handlers
- [ ] **Missing database connection pooling** - Should follow connection patterns in `server/db.ts`

### 3. TypeScript Issues
- [ ] **Usage of 'any' type** - Should use precise types
- [ ] **Missing type definitions** - Should export types from central location
- [ ] **Type assertions without necessity** - Should use proper type guards
- [ ] **Inconsistent type naming** - Should follow established conventions
- [ ] **Missing return type annotations** - Should be explicit about function returns

### 4. File Structure Violations
- [ ] **Components not following established patterns in `client/src/components/`**
- [ ] **API routes not following patterns in `server/routes/`**
- [ ] **Storage not following patterns in `server/storage/`**
- [ ] **Hooks not following patterns in `client/src/hooks/`**
- [ ] **Utils not following patterns in `client/src/lib/`**
- [ ] **Pages not following patterns in `client/src/pages/`**

### 5. Naming Convention Issues
- [ ] **Non-PascalCase component names**
- [ ] **Non-camelCase variables/functions**
- [ ] **Non-descriptive variable names**
- [ ] **Custom hooks not prefixed with 'use'**
- [ ] **Inconsistent database table/column naming**

### 6. Security Vulnerabilities

#### 6.1 Authentication & Authorization
- [ ] **Missing Firebase token verification** - Should follow patterns in `server/middleware/auth.ts`
- [ ] **Missing ownership validation** - Should follow patterns in `server/middleware/authHelpers.ts`
- [ ] **Unprotected API endpoints** - Should follow authentication patterns from existing routes
- [ ] **Missing user existence checks** - Should follow user validation patterns from existing middleware
- [ ] **Client-side auth state persistence** - Should follow patterns in `client/src/hooks/use-auth.ts`
- [ ] **Session configuration vulnerabilities** - Should follow session patterns in `server/index.ts`
- [ ] **Missing auth error handling** - Should follow error handling patterns from existing auth code

#### 6.2 Payment Security (Stripe)
- [ ] **Missing webhook signature verification** - Should follow patterns in `server/routes/webhookRoutes.ts`
- [ ] **Raw body parsing vulnerabilities** - Should follow webhook handling patterns from existing code
- [ ] **Missing Stripe metadata validation** - Should follow validation patterns in payment routes
- [ ] **Hardcoded Stripe keys** - Should follow environment variable patterns in existing code
- [ ] **Missing customer ID validation** - Should follow customer validation patterns in payment routes
- [ ] **Test mode in production** - Should follow environment configuration patterns
- [ ] **Missing payment intent validation** - Should follow payment validation patterns from existing code

#### 6.3 File Storage Security (Firebase)
- [ ] **Missing Firebase Storage security rules** - Should follow patterns in `firebase-storage.rules`
- [ ] **File type validation bypass** - Should follow validation patterns in `server/routes/fileRoutes.ts`
- [ ] **Missing file size limits** - Should follow limits implemented in existing file handling code
- [ ] **Path traversal vulnerabilities** - Should follow path validation patterns in existing file routes
- [ ] **Missing file ownership checks** - Should follow ownership patterns in file storage implementation
- [ ] **Public file access** - Should follow access control patterns in existing file handling
- [ ] **Missing virus scanning** - Should follow security patterns established in file upload code

#### 6.4 Database Security
- [ ] **SQL injection vulnerabilities** - Should follow Drizzle ORM patterns in `server/storage/`
- [ ] **Missing input validation** - Should follow Zod validation patterns from existing routes
- [ ] **Database connection security** - Should follow connection patterns in `server/db.ts`
- [ ] **Missing database credentials protection** - Should follow environment variable patterns
- [ ] **Insufficient data sanitization** - Should follow sanitization patterns in existing storage code
- [ ] **Missing query optimization** - Should follow indexing patterns in `shared/schema.ts`
- [ ] **Database backup security** - Should follow backup patterns established in the project

#### 6.5 API Security
- [ ] **Missing security headers** - Should implement Helmet.js for security headers
- [ ] **Missing rate limiting** - Should implement express-rate-limit for API protection
- [ ] **Missing CORS configuration** - Should configure CORS properly for frontend domain
- [ ] **Missing request size limits** - Should limit request body size (10MB max)
- [ ] **Insufficient error handling** - Should not expose sensitive information in errors
- [ ] **Missing request logging** - Should log all API requests for security monitoring
- [ ] **Missing url whitelist** - Should have specific urls whitelisted for access


#### 6.6 Environment & Configuration Security
- [ ] **Hardcoded sensitive data** - Should use environment variables for all secrets
- [ ] **Missing environment validation** - Should validate all required environment variables at startup
- [ ] **Weak session secrets** - SESSION_SECRET should be cryptographically strong
- [ ] **Missing Firebase service account security** - Should secure Firebase service account JSON
- [ ] **Exposed development configuration** - Should not expose debug/development configs in production
- [ ] **Missing secret rotation** - Should have plan for rotating API keys and secrets
- [ ] **Environment file security** - .env files should never be committed to version control

#### 6.7 Input Validation & Sanitization
- [ ] **Missing Zod schema validation** - All API inputs should be validated with Zod schemas
- [ ] **HTML injection vulnerabilities** - Should sanitize HTML content before rendering
- [ ] **Missing email validation** - Should validate email format and check for malicious patterns
- [ ] **Insufficient file upload validation** - Should validate file headers, not just extensions
- [ ] **Missing URL validation** - Should validate and sanitize URL inputs
- [ ] **JSON parsing vulnerabilities** - Should limit JSON payload size and validate structure
- [ ] **Missing XSS protection** - Should sanitize user-generated content

#### 6.8 Session & Cookie Security
- [ ] **Insecure session configuration** - Should use secure, httpOnly, sameSite flags
- [ ] **Missing session timeout** - Should implement reasonable session expiration
- [ ] **Session fixation vulnerabilities** - Should regenerate session IDs after login
- [ ] **Missing CSRF protection** - Should implement CSRF tokens for state-changing operations
- [ ] **Cookie security flags** - Should set secure, httpOnly, sameSite flags on all cookies
- [ ] **Session storage security** - Should use secure session storage mechanism
- [ ] **Missing session cleanup** - Should clean up expired sessions regularly

#### 6.9 Production Security Configuration
- [ ] **Missing Content Security Policy** - Should implement CSP headers
- [ ] **Missing HSTS headers** - Should enforce HTTPS with Strict-Transport-Security
- [ ] **Missing security monitoring** - Should implement security event logging
- [ ] **Missing dependency scanning** - Should scan for vulnerable npm packages
- [ ] **Missing SSL/TLS configuration** - Should use secure TLS configuration
- [ ] **Missing security testing** - Should implement automated security testing
- [ ] **Missing incident response plan** - Should have plan for security incidents

### 7. Performance Issues
- [ ] **Missing database indexes** - Check for slow queries
- [ ] **No caching strategies** - Should cache frequently accessed data
- [ ] **Missing lazy loading** - For large datasets
- [ ] **Inefficient API response times**
- [ ] **Missing connection pooling**

### 8. Code Quality Issues
- [ ] **Mixed business logic and database access**
- [ ] **Redundant implementations** - Should reuse existing patterns
- [ ] **Inconsistent error handling**
- [ ] **Missing error boundaries**
- [ ] **Unused imports/variables**
- [ ] **Dead code**

## Scanning Instructions

1. **Examine the entire codebase** systematically
2. **Identify specific files and line numbers** where issues occur
3. **Categorize issues by severity**: Critical, High, Medium, Low
4. **Provide specific examples** of violations found
5. **Suggest concrete fixes** following established patterns
6. **Check for consistency** across similar components/modules
7. **Validate against the .cursorrules** conventions

## Report Format

For each issue found, provide:
- **File path and line number(s)**
- **Issue category** (from above list)
- **Severity level** (Critical/High/Medium/Low)
- **Current problematic code** (snippet)
- **Recommended fix** (code example)
- **Explanation** of why this violates conventions

## Priority Focus Areas

1. **Data fetching patterns** - This is critical for consistency
2. **Database access patterns** - Security and architecture concerns
3. **TypeScript usage** - Type safety is essential
4. **File structure adherence** - Maintainability requirement
5. **Security vulnerabilities** - Must be addressed immediately

## Example Issue Reports

```
❌ CRITICAL: Unprotected API endpoint
File: server/routes/userRoutes.ts:15-20
Severity: Critical

Current code:
```typescript
router.get('/api/users/:id', async (req, res) => {
  const user = await getUserById(req.params.id);
  res.json(user);
});
```

Recommended fix:
```typescript
router.get('/api/users/:id', 
  verifyFirebaseToken,
  requiresOwnership,
  async (req, res) => {
    const user = await getUserById(req.params.id);
    res.json(user);
  }
);
```

Explanation: This API endpoint is missing authentication and authorization middleware, allowing unauthorized access to user data.
```

```
❌ HIGH: Missing Stripe webhook signature verification
File: server/routes/paymentRoutes.ts:45-55
Severity: High

Current code:
```typescript
router.post('/api/webhook', (req, res) => {
  const event = req.body;
  handleStripeWebhook(event);
  res.json({ received: true });
});
```

Recommended fix:
```typescript
router.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    handleStripeWebhook(event);
    res.json({ received: true });
  } catch (err) {
    res.status(400).send('Webhook signature verification failed');
  }
});
```

Explanation: This webhook endpoint doesn't verify the Stripe signature, making it vulnerable to malicious webhook attacks.
```

```
❌ MEDIUM: Missing Firebase Storage security rules validation
File: Firebase Storage Rules
Severity: Medium

Current issue: No verification that storage rules are properly configured

Recommended check:
```javascript
// Firebase Storage rules should enforce:
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/files/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read, write: if resource.size < 50 * 1024 * 1024; // 50MB limit
    }
  }
}
```

Explanation: Without proper storage rules, users could access other users' files or upload unlimited file sizes.
```

## Stack-Specific Security Checklist

### Firebase Integration Security
- [ ] **Firebase service account security** - Service account JSON should be secured as environment variable
- [ ] **Firebase Storage rules deployment** - Rules should be deployed with `firebase deploy --only storage`
- [ ] **Firebase Auth domain validation** - Auth domain should match production domain
- [ ] **Firebase project configuration** - Should use production Firebase project in production
- [ ] **Firebase token validation** - Should validate tokens on every protected API call
- [ ] **Firebase security rules testing** - Should test storage rules with Firebase emulator

### Stripe Integration Security
- [ ] **Stripe webhook endpoint security** - Should use raw body parsing and signature verification
- [ ] **Stripe customer validation** - Should verify customer IDs belong to authenticated users
- [ ] **Stripe metadata validation** - Should validate subscription metadata matches expected format
- [ ] **Stripe test/live key management** - Should use live keys in production environment
- [ ] **Stripe price ID validation** - Should validate price IDs to prevent manipulation
- [ ] **Stripe error handling** - Should handle Stripe errors gracefully without exposing sensitive data

### PostgreSQL Security (Render)
- [ ] **Database connection encryption** - Should use SSL/TLS for database connections
- [ ] **Database backup encryption** - Should encrypt backups and secure backup credentials
- [ ] **Database access logging** - Should log database access for security monitoring
- [ ] **Database connection pooling** - Should use connection pooling to prevent connection exhaustion
- [ ] **Database query optimization** - Should use indexes for frequently queried fields
- [ ] **Database schema validation** - Should validate schema changes before deployment

### Express.js Security Middleware
```typescript
// Required security middleware for production:
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      imgSrc: ["'self'", "data:", "https://firebasestorage.googleapis.com"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://yourdomain.com' 
    : 'http://localhost:5173',
  credentials: true
}));

// Request logging
app.use(morgan('combined'));

// Body parsing with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### Environment Variables Security Checklist
- [ ] **All secrets in environment variables** - No hardcoded secrets in code
- [ ] **Strong session secret** - SESSION_SECRET should be cryptographically strong (32+ random chars)
- [ ] **Firebase service account** - Should be stored as environment variable, not in code
- [ ] **Database credentials** - Should use environment variables for all database config
- [ ] **Stripe keys** - Should use environment variables for all Stripe configurations
- [ ] **SendGrid API key** - Should use environment variable for SendGrid API key
- [ ] **Environment validation** - Should validate all required environment variables at startup

### Production Deployment Security
- [ ] **HTTPS enforcement** - Should redirect HTTP to HTTPS in production
- [ ] **Security headers** - Should implement all security headers via Helmet.js
- [ ] **Error handling** - Should not expose stack traces or sensitive information in production
- [ ] **Logging configuration** - Should log security events and API access
- [ ] **Dependency scanning** - Should scan for vulnerable npm packages regularly
- [ ] **Secret rotation** - Should have plan for rotating API keys and secrets
- [ ] **Security monitoring** - Should implement security event monitoring and alerting

Please scan the repository thoroughly and provide a comprehensive report of all issues found, organized by category and prioritized by severity. 