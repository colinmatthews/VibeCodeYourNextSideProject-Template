# Repository Issue Scanner Prompt

You are an expert code auditor specializing in React, Node.js, and PostgreSQL full-stack applications. Please perform a comprehensive scan of this repository to identify issues that need to be resolved based on the following preferred stack and conventions:

## Technology Stack
- **Frontend**: React, TypeScript, React Query
- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL

## Critical Anti-Patterns to Identify

### 1. Data Fetching Violations
- [ ] **Direct fetch() usage in components** - Should use queryClient instead
- [ ] **Manual state management for API data** - Should use React Query
- [ ] **Inconsistent query key patterns** - Should follow ['entityName', id] format
- [ ] **Missing error/loading state handling** - Should use React Query's built-in states
- [ ] **Manual refetching instead of cache invalidation** - Should use queryClient.invalidateQueries()

### 2. Database Access Anti-Patterns
- [ ] **Direct database access in API routes** - Should use storage methods
- [ ] **Missing storage modules** - Database logic should be centralized
- [ ] **SQL injection vulnerabilities** - Should use parameterized queries
- [ ] **Inconsistent error handling patterns** - Should follow established patterns
- [ ] **Missing database connection pooling** - Should use proper connection management

### 3. TypeScript Issues
- [ ] **Usage of 'any' type** - Should use precise types
- [ ] **Missing type definitions** - Should export types from central location
- [ ] **Type assertions without necessity** - Should use proper type guards
- [ ] **Inconsistent type naming** - Should follow established conventions
- [ ] **Missing return type annotations** - Should be explicit about function returns

### 4. File Structure Violations
- [ ] **Components not in src/components/{feature}/Component.tsx**
- [ ] **API routes not in src/api/{feature}.ts**
- [ ] **Storage not in src/storage/{entity}.ts**
- [ ] **Hooks not in src/hooks/use{Feature}.ts**
- [ ] **Utils not in src/utils/{function}.ts**
- [ ] **AI Agents not in src/agents/{agentName}.ts**

### 5. Naming Convention Issues
- [ ] **Non-PascalCase component names**
- [ ] **Non-camelCase variables/functions**
- [ ] **Non-descriptive variable names**
- [ ] **Custom hooks not prefixed with 'use'**
- [ ] **Inconsistent database table/column naming**

### 6. Security Vulnerabilities

#### 6.1 Authentication & Authorization
- [ ] **Missing Firebase token verification** - All protected routes should use `verifyFirebaseToken` middleware
- [ ] **Missing ownership validation** - Use `requiresOwnership`, `requiresFileOwnership`, `requiresItemOwnership` middleware
- [ ] **Unprotected API endpoints** - All `/api/*` routes except `/api/login` should require authentication
- [ ] **Missing user existence checks** - Use `requiresUserExists` middleware where appropriate
- [ ] **Client-side auth state persistence** - Should properly handle auth state changes
- [ ] **Session configuration vulnerabilities** - Session secret should be strong, secure flags enabled
- [ ] **Missing auth error handling** - Should handle expired/revoked tokens gracefully

#### 6.2 Payment Security (Stripe)
- [ ] **Missing webhook signature verification** - Must verify `stripe-signature` header
- [ ] **Raw body parsing vulnerabilities** - Webhook endpoint should receive raw body for signature verification
- [ ] **Missing Stripe metadata validation** - Verify subscription data matches expected format
- [ ] **Hardcoded Stripe keys** - Should use environment variables for all Stripe configurations
- [ ] **Missing customer ID validation** - Verify Stripe customer belongs to authenticated user
- [ ] **Test mode in production** - Should use live Stripe keys in production
- [ ] **Missing payment intent validation** - Verify payment amounts and currency

#### 6.3 File Storage Security (Firebase)
- [ ] **Missing Firebase Storage security rules** - Rules should enforce user-scoped access
- [ ] **File type validation bypass** - Should validate file types on both client and server
- [ ] **Missing file size limits** - Should enforce 50MB max for pro, 10MB for free users
- [ ] **Path traversal vulnerabilities** - File paths should be validated and sanitized
- [ ] **Missing file ownership checks** - Files should only be accessible by their owners
- [ ] **Public file access** - Files should not be publicly accessible without authentication
- [ ] **Missing virus scanning** - Large file uploads should be scanned for malware

#### 6.4 Database Security
- [ ] **SQL injection vulnerabilities** - Should use Drizzle ORM parameterized queries only
- [ ] **Missing input validation** - All database inputs should be validated with Zod schemas
- [ ] **Database connection security** - Should use connection pooling and encrypted connections
- [ ] **Missing database credentials protection** - Should use environment variables for all DB config
- [ ] **Insufficient data sanitization** - User inputs should be sanitized before database storage
- [ ] **Missing query optimization** - Should use indexes for frequently queried fields
- [ ] **Database backup security** - Should encrypt backups and secure backup credentials

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