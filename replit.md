# Project Overview

A full-stack web application with file management, todo list, AI chat, and subscription features.

## Authentication

The application uses **Replit Auth** for authentication (migrated from Firebase Auth on January 4, 2026). Authentication is session-based using cookies and OpenID Connect.

### Key Auth Files
- `server/replit_integrations/auth/replitAuth.ts` - Replit Auth setup with passport.js
- `server/replit_integrations/auth/storage.ts` - User upsert logic for auth
- `server/middleware/auth.ts` - `isAuthenticated` middleware and `getUserId` helper
- `client/src/hooks/use-auth.ts` - React hook for auth state

### Auth Flow
1. User clicks "Sign in with Replit" button
2. Browser redirects to `/api/login`
3. Replit Auth handles authentication via OpenID Connect
4. On success, redirects to `/api/callback`
5. Session is created and stored in PostgreSQL `sessions` table
6. User data is upserted into `users` table

### Session Configuration
- Sessions stored in PostgreSQL using `connect-pg-simple`
- Session TTL: 7 days
- Cookies: httpOnly, secure

## Database

PostgreSQL database with Drizzle ORM.

### Key Tables
- `users` - User profiles (id is Replit user ID)
- `sessions` - Session storage for authentication
- `items` - Todo items
- `files` - File metadata
- `threads` - AI chat threads
- `messages` - AI chat messages

### Commands
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio

## Project Structure

```
client/                  # React frontend (Vite)
├── src/
│   ├── components/      # UI components
│   ├── hooks/           # Custom React hooks
│   ├── pages/           # Page components
│   └── lib/             # Utility libraries
server/                  # Express backend
├── routes/              # API route handlers
├── middleware/          # Express middleware
├── storage/             # Data access layer
├── replit_integrations/ # Replit-specific integrations
└── lib/                 # Utility libraries
shared/                  # Shared code between client/server
└── schema.ts            # Database schema (Drizzle)
```

## API Routes

### Auth Routes
- `GET /api/login` - Initiate Replit Auth login
- `GET /api/callback` - OAuth callback
- `GET /api/logout` - End session
- `GET /api/user` - Get current user session

### User Routes
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile

### Items Routes
- `GET /api/items` - List user's items
- `POST /api/items` - Create item
- `DELETE /api/items/:id` - Delete item

### Files Routes
- `GET /api/files` - List user's files
- `POST /api/files/upload` - Upload file
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### AI Routes
- `POST /api/ai/chat` - Chat with AI (streaming)
- `GET /api/ai/status` - Check AI service status
- `GET /api/ai/threads` - List chat threads
- `POST /api/ai/threads` - Create thread
- `GET /api/ai/threads/:threadId/messages` - Get thread messages

### Payment Routes
- `POST /api/create-checkout-session` - Start Stripe checkout
- `POST /api/create-portal-session` - Open billing portal
- `POST /api/webhook` - Stripe webhook handler

## Development

### Running the App
```bash
npm run dev
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `REPL_ID` - Replit App ID (auto-set by Replit)
- `ISSUER_URL` - Replit OIDC issuer (defaults to https://replit.com/oidc)
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_PRICE_ID_PRO` - Stripe price ID for Pro subscription

## Recent Changes

### January 4, 2026 - Auth Migration
- Migrated from Firebase Auth to Replit Auth
- Changed user ID from `firebaseId` to `id` (Replit user ID)
- Added `sessions` table for server-side session storage
- Removed Firebase dependencies from client
- Updated all routes to use session-based authentication
- Updated all client components to use `use-auth.ts` hook
