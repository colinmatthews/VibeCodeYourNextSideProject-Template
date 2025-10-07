# VibeCode Template - Full-Stack Side Project Starter

A production-ready full-stack template for rapid side project development with React, TypeScript, Express, PostgreSQL, Firebase Auth, Stripe payments, and AI chat.

## Quick Start

### Prerequisites

1. **Neon Database** (required)
   - Sign up at [neon.tech](https://neon.tech) (free tier available)
   - Create a new project and database
   - Copy the connection string (it should look like `postgresql://user:pass@ep-xxxxx.region.aws.neon.tech/dbname`)

   ⚠️ **Important**: This project uses `@neondatabase/serverless` which requires Neon's WebSocket support. Local PostgreSQL will not work without code modifications.

2. **Firebase** (required)
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication → Sign-in method → Enable Email/Password and Google
   - Enable Storage
   - Get your configuration:
     - Go to Project Settings → General → Your apps
     - Add a Web app if you haven't already
     - Copy all the config values (apiKey, authDomain, projectId, etc.)
     - Go to Project Settings → Service Accounts → Generate new private key
     - Save the JSON file for server-side authentication

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env and fill in REQUIRED values (see .env.example for guidance)

# 3. Initialize database
npm run db:push

# 4. Start development server
npm run dev
```

The app will be available at `http://localhost:5000` (configurable via `PORT` env variable)

### Required Environment Variables

These must be configured for the app to run:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `SESSION_SECRET` - Random string for session security
- `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase Admin SDK credentials
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_API_KEY` - Firebase web API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket name

See `.env.example` for complete configuration including optional services (Stripe, SendGrid, PostHog, OpenAI).

---

## Stripe Integration

### Environment Variables Required

Make sure to set these environment variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...           # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook endpoint secret from Stripe Dashboard
STRIPE_PRICE_ID_PRO=price_...           # Price ID for your Pro subscription

# Client-side
VITE_STRIPE_PUBLIC_KEY=pk_test_...      # Your Stripe publishable key

# SendGrid (email)
SENDGRID_API_KEY=SG....                  # Server-side only
SENDGRID_FROM=verified@yourdomain.com    # Verified sender address

# Analytics (PostHog)
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com

# OpenAI (AI chat)
OPENAI_API_KEY=sk-...

# Frontend origin (prod only; used by CORS and redirect validation)
FRONTEND_URL=https://yourapp.com
```

### How It Works

1. **Simple Upgrade Flow**: Users click "Upgrade to Pro" → Redirected to Stripe Checkout
2. **Automatic Fulfillment**: Webhooks handle subscription activation automatically
3. **Success Handling**: Users return to dashboard with success confirmation
4. **Subscription Management**: Users can manage subscriptions through Stripe's billing portal

### API Endpoints

- `POST /api/create-checkout-session` - Creates a new Stripe Checkout session
- `POST /api/create-portal-session` - Creates a Stripe billing portal session
- `POST /api/webhook` - Handles Stripe webhook events

Health and readiness:
- `GET /health` - Liveness probe (always 200)
- `GET /ready` - Readiness probe (checks DB connectivity)

### Webhook Events Handled

- `checkout.session.completed` - Activates subscription after successful payment
- `customer.subscription.updated` - Handles subscription status changes
- `customer.subscription.deleted` - Downgrades user to free plan
- `invoice.payment_succeeded` - Renews subscription
- `invoice.payment_failed` - Logs failed payments

### Testing

1. Use Stripe's test mode with test cards
2. Use Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3000/api/webhook`
3. Test successful payments with card `4242 4242 4242 4242`
4. Test failed payments with card `4000 0000 0000 0002`


Use stripe listen --forward-to localhost:5000/api/webhook for testing webhooks locally

### Benefits of Stripe Checkout

✅ **Simplified Code**: Removed 400+ lines of payment method management  
✅ **Better UX**: Professional checkout experience  
✅ **Mobile Optimized**: Works perfectly on all devices  
✅ **Security**: No sensitive payment data in frontend  
✅ **International**: Built-in support for multiple payment methods  
✅ **Promotion Codes**: Built-in support for discount codes  
✅ **Tax Calculation**: Automatic tax calculation

---

## Development

```bash
npm install
npm run db:push
npm run dev
```

## Deployment

Make sure to:
1. Set production Stripe keys
2. Configure webhook endpoint in Stripe Dashboard
3. Set `STRIPE_WEBHOOK_SECRET` from webhook settings 
4. Configure Stripe billing portal at Settings > Billing > Customer portal in Stripe Dashboard 

## Security Notes

- Content Security Policy (CSP): In production, inline scripts/styles are blocked. Only required third-party origins are allowed (Stripe, Google Auth/Fonts, Firebase, PostHog). Development permits inline for Vite.
- Rate Limiting: A global `/api` limiter enforces 500 requests per 15 minutes, keyed by authenticated user when available, otherwise IP. AI chat and thread routes also have per-route limits.
- Safe Downloads: File downloads use a sanitized filename and RFC 5987 headers to prevent header injection.
- Stripe Redirects: `success_url` and `cancel_url` are validated against trusted origins (from `FRONTEND_URL` in production). Unknown origins fall back to safe defaults.
- SendGrid Sender: Emails use `SENDGRID_FROM` (must be a verified sender), not a hardcoded address.

## CORS

Production CORS is strict. Ensure `FRONTEND_URL` matches your deployed domain. Development allows `http://localhost:5173`, `http://localhost:5000`, and `http://127.0.0.1:5173`.
