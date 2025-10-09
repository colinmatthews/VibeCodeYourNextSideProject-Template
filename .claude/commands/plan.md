# /feature-planner - Plan and Build New Features

You are a helpful assistant that guides users through planning and implementing new features for their VibeCode Template app. This leverages the existing codebase structure to ensure consistency and proper integration.

## What This Command Does

Helps users plan and build new features using the existing codebase architecture:
- Client-side React components with TypeScript and shadcn/ui
- Server-side Express API routes with proper error handling
- Database operations using Drizzle ORM with PostgreSQL
- Authentication integration with Firebase Auth
- File storage with Firebase Storage (if needed)
- Payment integration with Stripe (if needed)
- Email notifications with SendGrid (if needed)

## Step 0: Development Setup

Before starting any feature development:

### Create Feature Branch
```bash
# Check current status and ensure clean working directory  
git status

# Create and switch to feature branch
git checkout -b feature/[feature-name]
# Example: git checkout -b feature/user-notifications
```

### Run Initial Type Checks
```bash
# Ensure codebase is clean before starting
npm run check

# Fix any TypeScript errors before proceeding
# This prevents accumulating technical debt
```

## Step 1: Understanding the Feature Requirements

Ask these focused questions to understand the scope:

**Feature Type:**
- [ ] What type of feature are you building?
  - a) Data management (CRUD operations)
  - b) User interaction (forms, dashboards, tools)
  - c) Integration (third-party APIs, webhooks)
  - d) Enhancement (existing feature improvements)
  - e) Automation (background jobs, scheduled tasks)

**Data Requirements:**
- [ ] What data does this feature need?
  - New database tables/fields
  - Existing data relationships
  - File uploads or media
  - Third-party data sources
  - User-specific or global data

**User Experience:**
- [ ] How will users interact with this feature?
  - New pages or components
  - Existing page enhancements
  - Modal dialogs or sidebars
  - Mobile-responsive requirements
  - Real-time updates needed

**Integration Needs:**
- [ ] What existing systems does this connect to?
  - Authentication and user management
  - Payment processing
  - File storage
  - Email notifications
  - External APIs
  - Analytics tracking

## Step 2: Codebase Analysis

Before implementing, analyze the existing codebase:

1. **Check Similar Features**
   - Study existing components in `client/src/components/`
   - Review patterns in `client/src/pages/`
   - Examine custom hooks in `client/src/hooks/`
   - Look for similar functionality in existing features

2. **Database Schema Review**
   - Examine `shared/schema.ts` for current database structure
   - Check existing table relationships and foreign keys
   - Review migration files in `server/migrations/`
   - Study existing storage patterns in `server/storage/`

3. **API Patterns**
   - Review existing routes in `server/routes/`
   - Study authentication middleware in `server/middleware/auth.ts`
   - Check error handling patterns in existing API endpoints
   - Examine existing storage layer implementations

4. **Frontend Architecture**
   - Review component structure and naming conventions
   - Check routing patterns in `client/src/App.tsx`
   - Study existing UI component usage from `client/src/components/ui/`
   - Examine existing hooks and state management patterns

## Step 3: Feature Implementation Plan

### Phase 1: Database Layer (if needed)

1. **Test-Driven Development Setup**
   - Write failing tests first for new database operations
   - Study existing test patterns in `server/__tests__/`
   - Create test data fixtures following existing patterns
   - Run tests to ensure they fail initially: `npm run test:single [test-file]`

2. **Schema Design**
   - Study existing table definitions in `shared/schema.ts`
   - Follow the same naming conventions and field patterns
   - Use consistent foreign key relationships (reference `users.firebaseId`)
   - Include standard fields like `createdAt` and `updatedAt`
   - Follow the established patterns for primary keys and indexes

3. **Database Migration**
   - Use the same migration commands as established in `package.json`
   - Follow existing migration patterns in `server/migrations/`
   - Test schema changes using established development workflow
   - Ensure proper rollback capabilities
   - **Commit after successful migration**: `git add . && git commit -m "Add [feature] database schema"`

### Phase 2: Server Layer

1. **TDD for Storage Layer**
   - Write failing tests for storage operations first
   - Study test patterns in `server/__tests__/storage.test.ts`
   - Test CRUD operations, error cases, and edge conditions
   - Run: `npm run test:single storage.test.ts`

2. **Storage Layer Implementation**
   - Study existing storage implementations in `server/storage/`
   - Follow the same patterns as `UserStorage.ts`, `ItemStorage.ts`, or `FileStorage.ts`
   - Use consistent database connection patterns from `server/db.ts`
   - Implement the same error handling and query patterns
   - Follow established naming conventions for storage methods
   - Use the same Drizzle ORM query patterns as existing storage files
   - **Run TypeScript check**: `npm run check`
   - **Commit storage layer**: `git add . && git commit -m "Add [feature] storage layer"`

3. **TDD for API Routes**
   - Write failing tests for API endpoints first
   - Study test patterns in `server/__tests__/*-workflow.test.ts`
   - Test authentication, authorization, input validation, and responses
   - Run: `npm run test:single [feature]-workflow.test.ts`

4. **API Routes with Security**
   - Study existing route implementations in `server/routes/`
   - Follow the same authentication patterns as `userRoutes.ts`, `itemRoutes.ts`, or `fileRoutes.ts`
   - Use the same middleware patterns from `server/middleware/auth.ts` and `server/middleware/authHelpers.ts`
   - Implement input validation using Zod schemas (study existing validation patterns)
   - Follow the same error handling and response patterns
   - Use consistent ownership verification patterns
   - Implement the same security checks and status codes
   - Register routes in `server/routes/index.ts` following existing patterns
   - **Run TypeScript check**: `npm run check`
   - **Test specific route**: `npm run test:single [feature]-workflow.test.ts`
   - **Commit API routes**: `git add . && git commit -m "Add [feature] API routes with security"`

5. **Custom Middleware (if needed)**
   - Study existing middleware patterns in `server/middleware/`
   - Follow the same patterns as `auth.ts` and `authHelpers.ts`
   - Use consistent error handling and response formats
   - Implement the same security checks and ownership verification patterns
   - Use the same TypeScript interfaces and naming conventions
   - Follow existing logging and error reporting patterns
   - **Run TypeScript check**: `npm run check`
   - **Test middleware**: `npm run test:single auth-workflow.test.ts`
   - **Commit middleware**: `git add . && git commit -m "Add [feature] custom middleware"`

### Phase 3: Client Layer


1. **Data Fetching Hook**
   - Study existing hooks in `client/src/hooks/`
   - Follow the same patterns as `useFiles.ts`, `useUser.ts`, or `use-auth.ts`
   - Use consistent data fetching patterns and error handling
   - Implement the same loading states and error management
   - Follow established TypeScript interface patterns
   - Use the same API communication patterns
   - Implement consistent CRUD operations following existing hook patterns
   - **Run TypeScript check**: `npm run check`
   - **Commit hook**: `git add . && git commit -m "Add [feature] data fetching hook"`

2. **Main Feature Component**
   - Study existing components in `client/src/components/`
   - Follow the same UI patterns as `FileList.tsx` or similar components
   - Use consistent shadcn/ui components from `client/src/components/ui/`
   - Implement the same loading and error state patterns
   - Follow established component structure and naming conventions
   - Use the same icon patterns from lucide-react
   - Implement consistent user interaction patterns and confirmation dialogs
   - **Run TypeScript check**: `npm run check`
   - **Commit component**: `git add . && git commit -m "Add [feature] main component"`

3. **Form Component**
   - Study existing form components in similar features
   - Follow the same form handling patterns and validation approaches
   - Use consistent shadcn/ui form components
   - Implement the same loading states and button behaviors
   - Follow established form layout and styling patterns
   - Use the same error handling and user feedback patterns
   - **Run TypeScript check**: `npm run check`
   - **Commit form**: `git add . && git commit -m "Add [feature] form component"`

4. **Page Component (if needed)**
   - Study existing page components in `client/src/pages/`
   - Follow the same layout patterns as `Files.tsx`, `profile.tsx`, or `settings.tsx`
   - Use consistent container and spacing patterns
   - Implement the same navigation and routing patterns
   - **Run TypeScript check**: `npm run check`
   - **Commit page**: `git add . && git commit -m "Add [feature] page component"`

5. **Add to Navigation**
   - Study existing routing patterns in `client/src/App.tsx`
   - Follow the same route registration and navigation patterns
   - Update navigation components consistently
   - Ensure proper authentication guards if needed
   - **Run TypeScript check**: `npm run check`
   - **Commit navigation**: `git add . && git commit -m "Add [feature] to navigation"`

## Step 4: Integration Enhancements

### Security & Authentication Integration

1. **Always Use Authentication Middleware**
   - Study existing middleware usage in `server/middleware/auth.ts`
   - Follow the same authentication patterns as existing routes
   - Use the same `AuthenticatedRequest` interface and patterns
   - Apply consistent middleware order and error handling

2. **Use Ownership Verification**
   - Study existing ownership verification in `server/middleware/authHelpers.ts`
   - Follow the same ownership verification patterns as existing routes
   - Use consistent error responses and status codes
   - Implement the same user access control patterns

3. **Input Validation & Sanitization**
   - Study existing validation patterns using Zod schemas
   - Follow the same validation error handling and response patterns
   - Use consistent input sanitization and validation rules
   - Implement the same error response formats

4. **Premium Feature Access**
   - Study existing premium access patterns in the codebase
   - Follow the same subscription verification patterns
   - Use consistent premium feature gating approaches
   - Implement the same user subscription checking logic

### File Storage Integration (if needed)
   - Study existing file handling patterns in `server/routes/fileRoutes.ts`
   - Follow the same Firebase Storage integration patterns
   - Use consistent file upload and security validation
   - Implement the same file ownership and access control

### Payment Integration (if needed)
   - Study existing payment patterns in `server/routes/paymentRoutes.ts`
   - Follow the same Stripe integration and webhook handling
   - Use consistent subscription verification patterns
   - Implement the same premium feature access control

### Email Notifications (if needed)
   - Study existing email patterns in `server/lib/sendgrid.ts`
   - Follow the same SendGrid integration patterns
   - Use consistent email template and sending patterns
   - Implement the same notification categorization and user preferences

## Step 5: Testing and Validation

### Complete Test Suite
```bash
# Run all backend tests
npm test

# Run specific feature tests
npm run test:single [feature]-workflow.test.ts

# Run TypeScript checks
npm run check

# Test build process
npm run build
```

### Backend Testing
```bash
# Test API endpoints manually (if needed)
curl -X GET http://localhost:5000/api/[feature] \
  -H "Authorization: Bearer [token]"

curl -X POST http://localhost:5000/api/[feature] \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [token]" \
  -d '{"title": "Test", "description": "Test description"}'
```

### Frontend Testing
```typescript
// Test component rendering
// Test form submission
// Test error handling
// Test loading states
```

### Database Testing
```sql
-- Verify data integrity
SELECT * FROM [table_name] WHERE user_id = 'test_user_id';

-- Check relationships
SELECT * FROM [table_name] 
JOIN users ON [table_name].user_id = users.firebase_id;
```

### Final Integration Test
```bash
# Ensure all tests pass
npm test

# Ensure TypeScript is clean
npm run check

# Ensure build works
npm run build

# Commit final integration
git add . && git commit -m "Complete [feature] integration with full test coverage"
```

## Step 6: Deployment and PR Checklist

### Pre-Deployment Checklist
- [ ] All tests passing: `npm test`
- [ ] TypeScript clean: `npm run check`  
- [ ] Build successful: `npm run build`
- [ ] Database schema changes deployed
- [ ] Environment variables configured
- [ ] API routes tested in production
- [ ] Frontend components tested
- [ ] Authentication working properly
- [ ] Error handling implemented
- [ ] Mobile responsiveness verified
- [ ] Performance optimized
- [ ] Analytics tracking added (if needed)
- [ ] Documentation updated

### Create Pull Request
```bash
# Push feature branch
git push origin feature/[feature-name]

# Create PR through GitHub UI or CLI
gh pr create --title "Add [feature]" --body "Description of changes"
```

### Post-Merge Cleanup
```bash
# Switch back to main and clean up
git checkout main
git pull origin main
git branch -d feature/[feature-name]
```

## Common Patterns and Best Practices

### Error Handling
```typescript
// Consistent error responses
try {
  // Operation
} catch (error) {
  console.error('Operation failed:', error);
  res.status(500).json({ 
    error: 'User-friendly error message',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

### Input Validation
```typescript
// Server-side validation
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500),
});

const validatedData = schema.parse(req.body);
```

### Component Reusability
```tsx
// Use existing UI components
import { Button, Card, Input } from './ui/[component]';

// Follow existing patterns
// Use consistent styling classes
// Implement proper loading states
```

### Database Optimization
```typescript
// Use indexes for frequently queried fields
// Implement proper relationships
// Use transactions for multi-table operations
// Add proper constraints
```

## Security Checklist

**Authentication & Authorization:**
- [ ] All routes use `requireAuth` middleware
- [ ] User ownership is verified for all resource access
- [ ] Firebase UID (`req.user!.uid`) is used consistently
- [ ] Premium features check `isPremium` status
- [ ] Custom middleware follows existing patterns

**Input Validation:**
- [ ] All inputs validated with Zod schemas
- [ ] String inputs are trimmed and length-limited
- [ ] Arrays have maximum length limits
- [ ] File uploads have size and type restrictions
- [ ] SQL injection prevention (Drizzle ORM handles this)

**Error Handling:**
- [ ] Consistent error response format
- [ ] No sensitive data leaked in error messages
- [ ] Proper HTTP status codes used
- [ ] Validation errors include helpful details
- [ ] Server errors logged but not exposed

**Data Access:**
- [ ] Users can only access their own data
- [ ] Database queries include userId filtering
- [ ] Resource IDs are validated (parseInt, isNaN checks)
- [ ] Soft deletes considered if needed
- [ ] Rate limiting implemented for sensitive operations

## Remember

- **Start with a clean branch** - Always create a feature branch from main
- **TDD approach** - Write failing tests first, then implement
- **TypeScript first** - Run `npm run check` frequently during development
- **Security First** - Always implement authentication and ownership verification
- **Check existing code first** - Look for similar patterns and reuse them
- **Follow established conventions** - Use the same middleware and error patterns
- **Validate everything** - Use Zod schemas for all inputs
- **Test thoroughly** - Verify all CRUD operations and security measures
- **Commit frequently** - Make small, focused commits with clear messages
- **Handle errors gracefully** - Provide good user feedback without exposing internals
- **Mobile-first design** - Ensure components work on all screen sizes
- **Performance matters** - Optimize database queries and API responses
- **User experience** - Provide loading states and clear feedback
- **Documentation** - Comment complex business logic and security decisions

## Common Security Patterns

**Route Protection:**
```typescript
// ✅ Good - Protected route with ownership check
router.get('/[feature]', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.uid;
  const data = await storage.getByUserId(userId);
  res.json(data);
});

// ❌ Bad - No authentication
router.get('/[feature]', async (req, res) => {
  const data = await storage.getAll(); // Returns all users' data!
  res.json(data);
});
```

**Input Validation:**
```typescript
// ✅ Good - Validated input
const schema = z.object({ title: z.string().min(1).max(100) });
const validated = schema.parse(req.body);

// ❌ Bad - Direct use of user input
const title = req.body.title; // Could be anything!
```

**Error Responses:**
```typescript
// ✅ Good - Safe error response
res.status(404).json({ error: 'Item not found' });

// ❌ Bad - Exposes internal details
res.status(500).json({ error: error.message }); // Might expose DB details
```

This systematic approach ensures your new feature integrates seamlessly with the existing VibeCode Template architecture while maintaining the highest security and code quality standards.
