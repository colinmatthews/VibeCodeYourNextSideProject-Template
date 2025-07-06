# CLAUDE.md - VibeCode Template Development Guide

This document provides comprehensive information for Claude AI when working on this VibeCode Template project.

## Project Overview

This is a **full-stack web application template** designed for rapid side project development with:
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Render) + Drizzle ORM
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage with secure file management
- **Payments**: Stripe Checkout (simplified payment flow)
- **Email**: SendGrid
- **Deployment**: Optimized for quick deployment

## Project Structure

```
/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components (routing)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utilities and configurations
│   │   └── App.tsx      # Main app component
├── server/              # Backend Express application
│   ├── routes/          # API route handlers
│   ├── storage/         # Database access layer
│   ├── db.ts           # Database connection
│   └── index.ts        # Server entry point
├── shared/              # Shared types and schemas
│   └── schema.ts       # Drizzle schema definitions
├── prompts/            # AI assistance prompts
└── migrations/         # Database migrations
```

## Key Technologies & Dependencies

### Frontend
- **React 18.3.1** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** + **shadcn/ui** components
- **React Query (@tanstack/react-query)** for data fetching
- **Wouter** for routing
- **React Hook Form** + **Zod** for form handling
- **Firebase** for authentication
- **Lucide React** for icons

### Backend
- **Express** server with TypeScript
- **Drizzle ORM** for database operations
- **PostgreSQL** (Render hosted) database
- **Stripe** for payments and subscriptions
- **SendGrid** for email
- **Express Session** for session management

## Environment Variables

Required environment variables (found in `.env`):

```env
# Database (Render PostgreSQL)
DATABASE_URL="postgresql://..."  # Automatically provided by Render
PGDATABASE="your_database_name"
PGHOST="..."  # Provided by Render
PGUSER="..."  # Provided by Render
PGPASSWORD="..."  # Provided by Render
PGPORT="5432"

# Session
SESSION_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_PRO="price_..."
VITE_STRIPE_PUBLIC_KEY="pk_test_..."

# Firebase (Client-side)
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_APP_ID="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."

# Email
SENDGRID_API_KEY="SG...."
```

## Database Schema (Drizzle)

The database uses Drizzle ORM with the following main tables:

### Users Table
```typescript
users {
  firebaseId: text (primary key)
  email: text
  firstName: text
  lastName: text
  address: text
  city: text
  state: text
  postalCode: text
  isPremium: boolean
  subscriptionType: "free" | "pro"
  emailNotifications: boolean
  stripeCustomerId: text (nullable)
}
```

### Items Table (Example data table)
```typescript
items {
  id: serial (primary key)
  item: text
  userId: text (foreign key to users.firebaseId)
}
```

### Files Table
```typescript
files {
  id: serial (primary key)
  name: text
  originalName: text
  path: text (Firebase Storage path)
  url: text (download URL)
  size: integer (bytes)
  type: text (MIME type)
  userId: text (foreign key to users.firebaseId)
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Key Development Scripts

```bash
# Development
npm run dev              # Start dev server (port 5000)
npm run db:push         # Push schema changes to database
npm run migrate         # Run database migrations

# Building
npm run build           # Build for production
npm run start           # Start production server

# Testing
npm run test            # Run tests
npm run test:watch      # Run tests in watch mode

# Type checking
npm run check           # TypeScript type checking
```

## Authentication Flow

1. **Firebase Auth** handles user authentication on the client
2. When a user logs in via Firebase, the client sends the Firebase token to `/api/login`
3. Server verifies the Firebase token and creates/updates the user in PostgreSQL
4. Session is established using express-session

## Firebase Storage Integration

### File Storage Architecture
1. **Client uploads** files directly to Firebase Storage using the Firebase SDK
2. **File metadata** is stored in PostgreSQL for querying and user association
3. **Access control** is enforced through Firebase Storage security rules
4. **File organization** follows the pattern: `users/{userId}/files/{filename}`

### File Operations
- `GET /api/files` - List user's files
- `GET /api/files/:id` - Get file metadata
- `POST /api/files` - Save file metadata after upload
- `DELETE /api/files/:id` - Delete file and metadata

### Storage Limits
- **Free users**: 10 files, 100MB total, 10MB per file
- **Pro users**: 100 files, 1GB total, 50MB per file

### Security Rules
Firebase Storage rules enforce:
- Users can only access their own files
- File size and type validation
- Authenticated access only
- Proper file organization structure

### Components Available
- `<FileUpload />` - Drag-and-drop file upload with progress
- `<FileList />` - Display and manage uploaded files
- `useFiles()` - Hook for file operations
- Files page - Complete file management interface

## Stripe Payment Integration

### Simplified Checkout Flow
1. User clicks "Upgrade to Pro" button
2. Client calls `/api/create-checkout-session`
3. Server creates Stripe Checkout session
4. User is redirected to Stripe's hosted checkout page
5. After payment, user returns to success page
6. Webhook handles subscription activation

### Key Stripe Endpoints
- `POST /api/create-checkout-session` - Create checkout session
- `POST /api/create-portal-session` - Access billing portal
- `POST /api/webhook` - Handle Stripe webhooks

### Webhook Events Handled
- `checkout.session.completed` - Activate subscription
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Cancel subscription
- `invoice.payment_succeeded` - Renewal confirmation
- `invoice.payment_failed` - Failed payment handling

## Development Best Practices

### 1. Component Structure
- Use functional components with TypeScript
- Place components in `client/src/components/`
- Use shadcn/ui components when possible
- Follow naming convention: `ComponentName.tsx`

### 2. API Routes
- Create routes in `server/routes/`
- Use TypeScript for type safety
- Implement proper error handling
- Follow RESTful conventions

### 3. Database Access
- Use storage layer pattern (`server/storage/`)
- Never access database directly from routes
- Use Drizzle ORM for all queries
- Implement proper error handling

### 4. State Management
- Use React Query for server state
- Local state with useState/useReducer
- Avoid prop drilling - use context when needed

### 5. Form Handling
- Use React Hook Form with Zod validation
- Create reusable form components
- Show loading and error states

## Common Development Tasks

### Adding a New API Endpoint
1. Create route file in `server/routes/`
2. Create storage methods in `server/storage/`
3. Add TypeScript types in route file or `shared/`
4. Register route in `server/routes/index.ts`

### Adding a New Page
1. Create page component in `client/src/pages/`
2. Add route in `client/src/App.tsx`
3. Add navigation link if needed
4. Ensure proper authentication guards

### Modifying Database Schema
1. Update schema in `shared/schema.ts`
2. Run `npm run db:push` to update database
3. Update related storage methods
4. Update TypeScript types

### Adding Stripe Features
1. Always use Stripe Checkout for payments
2. Handle webhooks for subscription changes
3. Store minimal data (just stripeCustomerId)
4. Use Stripe's billing portal for management

### Working with File Storage
1. Use `useFiles()` hook for data operations
2. Use `<FileUpload />` for file uploading
3. Use `<FileList />` for file management
4. Files are stored in Firebase Storage with metadata in PostgreSQL
5. Apply proper file size and type validation
6. Test with different file types and sizes

## Testing Locally

### Stripe Testing
```bash
# In one terminal, forward webhooks
stripe listen --forward-to localhost:5000/api/webhook

# Use test cards
4242 4242 4242 4242  # Success
4000 0000 0000 0002  # Decline
```

### Database Testing
- Database is hosted on Render (PostgreSQL)
- Connection string automatically provided by Render in DATABASE_URL
- Use `npm run db:push` for schema updates
- Access database via Render dashboard or connect with external tools

### Firebase Storage Testing
- Test file uploads with various file types and sizes
- Verify security rules in Firebase console
- Check file metadata is properly saved to database
- Test file deletion (both Storage and database cleanup)
- Security rules file: `firebase-storage.rules`

## Deployment Considerations

1. **Environment Variables**: Set all required env vars
2. **Database**: Render PostgreSQL database will be automatically created and connected
3. **Stripe Webhooks**: Configure webhook endpoint in Stripe Dashboard
4. **Firebase**: Ensure Firebase project is properly configured
5. **Firebase Storage**: Deploy security rules from `firebase-storage.rules`
6. **Build Process**: Run `npm run build` before deployment
7. **Port**: Application serves on port 5000 (Render's default)

## Security Notes

1. **Never commit `.env` file** (already in .gitignore)
2. **Firebase tokens** are verified server-side
3. **Stripe webhooks** use signature verification
4. **Database queries** use parameterized queries (via Drizzle)
5. **Session secrets** should be strong and unique
6. **File access** is controlled by Firebase Storage security rules
7. **File uploads** are validated for size and type on both client and server

## Debugging Tips

1. **Server logs**: Check console output for API requests
2. **Client errors**: Check browser console
3. **Database issues**: Verify connection string and schema
4. **Stripe issues**: Check Stripe Dashboard logs
5. **Build errors**: Run `npm run check` for TypeScript errors
6. **File upload issues**: Check Firebase console and browser network tab
7. **Storage security**: Test rules in Firebase console simulator

## Performance Optimization

1. **React Query** caches API responses automatically
2. **Lazy loading** for large components
3. **Database indexes** on frequently queried fields
4. **Image optimization** with proper formats
5. **Bundle splitting** handled by Vite

## Additional Resources

- **Prompts Directory**: Contains AI assistance guides for:
  - AI SDK integration patterns
  - Deployment guide for beginners
  - Feature planning templates
  - Production readiness checklist

## Important Notes

1. **Development server runs on port 5000** (not 3000)
2. **Stripe webhook endpoint** must receive raw body (configured in server)
3. **Firebase auth** is client-side only - server verifies tokens
4. **Database migrations** use Drizzle Kit
5. **TypeScript** is enforced - avoid using `any` type

## Firebase CLI Commands

**IMPORTANT**: This project uses Firebase ONLY for Authentication and Storage. We do NOT use Firebase for hosting, functions, database, or any other services.

### Authentication Management
```bash
# Export user accounts (backup)
firebase auth:export users.json

# Import user accounts (restore)
firebase auth:import users.json
```

### Storage Management
```bash
# Deploy storage security rules ONLY
firebase deploy --only storage

# Deploy with custom message
firebase deploy --only storage -m "Update storage security rules"

# Dry run to test rules before deployment
firebase deploy --only storage --dry-run
```

### Project Management
```bash
# List Firebase apps in project
firebase apps:list

# Show current project info
firebase use

# Switch between projects (if multiple)
firebase use <project-id>

# Get project configuration
firebase apps:sdkconfig WEB
```

### Development & Testing
```bash
# Start Firebase emulators for auth and storage only
firebase emulators:start --only auth,storage

# Run tests with emulators
firebase emulators:exec --only auth,storage "npm test"
```

**Note**: Only use `firebase deploy --only storage` to deploy storage rules. Never use `firebase deploy` without the `--only` flag as it will try to deploy services we don't use.

## Quick Command Reference

```bash
# Start development
npm install
npm run db:push
npm run dev

# Open in browser
http://localhost:5000

# Test Stripe webhooks
stripe listen --forward-to localhost:5000/api/webhook

# Deploy Firebase Storage rules
firebase deploy --only storage

# Build for production
npm run build
npm run start
```

This template is designed for rapid development of SaaS side projects with all the essential features pre-configured and ready to customize.

## Claude Code MCP Tools

This project includes Model Context Protocol (MCP) server configurations that provide Claude Code with enhanced capabilities. These tools should be used appropriately based on the task at hand.

### 🌐 Render MCP Server
**Purpose**: Manage Render infrastructure directly from Claude Code
**Instructions**: 
1. Create an API key
The MCP server uses an API key to authenticate with the Render platform. Create an API key from your Account Settings page:

2. Add mcp server:
claude mcp add --transport http render https://mcp.render.com/mcp --header "Authorization: Bearer render-api-key"

3. list workspace with list_workspaces


**When to use:**
- Checking deployment status and service health
- Creating new services or databases
- Managing environment variables
- Monitoring resource usage and logs
- Troubleshooting deployment issues

**Example prompts:**
- "Show me the status of my Render services"
- "Create a new web service on Render"
- "Check the logs for my production app"
- Create a new database named user-db with 5 GB storage
- Deploy an example Flask web service on Render using https://github.com/render-examples/flask-hello-world
- Using my Render database, tell me which items were the most frequently bought together
- Query my read replica for daily signup counts for the last 30 days
- Pull the most recent error-level logs for my API service
- Why isn't my site at example.onrender.com working?

### 📖 Context7 MCP Server
**Purpose**: Get up-to-date documentation for any library or framework


**When to use:**
- Working with external libraries or frameworks
- Need current API documentation and examples
- Implementing features with unfamiliar technologies
- Ensuring code uses latest best practices

**How to use:**
Add "use context7" to any prompt that involves external libraries:
- "Create a FastAPI CRUD API use context7"
- "Show me how to use React Query for data fetching use context7"
- "Implement Stripe checkout with latest API use context7"

### 🎭 Puppeteer MCP Server
**Purpose**: Browser automation, web scraping, and testing

**When to use:**
- Taking screenshots for documentation or testing
- Automating web interactions for testing
- Scraping data from websites
- Generating visual content or reports
- End-to-end testing scenarios

**Example prompts:**
- "Take a screenshot of the login page"
- "Navigate to the pricing page and extract all plan details"
- "Test the complete signup flow and take screenshots"
