# /initial-setup - Get Your VibeCode Template Running

You are a helpful assistant that guides users through the initial setup of their freshly cloned VibeCode Template. This will get all required services configured and the app running locally in development mode.

## What This Command Does

Sets up your complete development environment with:
- PostgreSQL database connection
- Firebase Authentication and Storage
- Stripe payment processing
- SendGrid email service
- Local development server

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup MCPs
- Set up RenderMCP (check claude.md for steps). Use MCP to help user with render setup
- Set up Context7 

## Step 3: Create Environment Variables

Create a `.env` file in the root directory:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/database"
PGDATABASE="your_database_name"
PGHOST="your_db_host"
PGUSER="your_db_user"
PGPASSWORD="your_db_password"
PGPORT="5432"

# Session Management
SESSION_SECRET="your-super-secret-session-key-min-32-chars"

# Stripe (Payment Processing)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_PRO="price_..."
VITE_STRIPE_PUBLIC_KEY="pk_test_..."

# Firebase (Authentication & Storage)
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"

# Email Service
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
```

## Step 4: Set Up PostgreSQL Database

### Option A: Use Render PostgreSQL (Recommended)

1. Go to [render.com](https://render.com) and create an account
2. Create a new PostgreSQL database
3. Copy the connection details to your `.env` file

### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database: `createdb your_database_name`
3. Update `.env` with local connection details

## Step 5: Set Up Firebase

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Authentication and Storage

### Configure Authentication

1. In Firebase Console → Authentication → Sign-in method
2. Enable these providers:
   - Email/Password
   - Google (optional)
   - GitHub (optional)
3. Add your domain to authorized domains: `localhost`

### Configure Storage

1. In Firebase Console → Storage → Get started
2. Use test mode rules initially
3. Deploy security rules later: `firebase deploy --only storage`

### Get Firebase Config

1. In Firebase Console → Project settings → General
2. Scroll to "Your apps" → Web app
3. Copy the config values to your `.env` file

## Step 6: Set Up Stripe

### Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Switch to "Test mode" (toggle in sidebar)

### Get API Keys

1. Dashboard → Developers → API keys
2. Copy "Publishable key" → `VITE_STRIPE_PUBLIC_KEY`
3. Copy "Secret key" → `STRIPE_SECRET_KEY`

### Create Product and Price

1. Dashboard → Products → Add product
2. Create a "Pro Plan" with recurring billing
3. Copy the Price ID → `STRIPE_PRICE_ID_PRO`

### Set Up Webhooks (for later)

1. Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`
4. Copy webhook secret → `STRIPE_WEBHOOK_SECRET`

## Step 7: Set Up SendGrid

1. Go to [sendgrid.com](https://sendgrid.com) and create an account
2. Settings → API Keys → Create API Key
3. Choose "Restricted Access" and enable Mail Send
4. Copy the API key → `SENDGRID_API_KEY`

## Step 8: Initialize Database

Push the database schema:

```bash
npm run db:push
```

This creates all necessary tables in your PostgreSQL database.

## Step 9: Start Development Server

```bash
npm run dev
```

Your app will be running at: http://localhost:5000

## Step 10: Test Your Setup

### Test Authentication

1. Go to http://localhost:5000/login
2. Create an account with email/password
3. Verify you can sign in and out

### Test File Upload

1. Sign in to your account
2. Go to the Files page
3. Try uploading a small file
4. Check that it appears in your file list

### Test Payments (Optional)

1. Go to the Pricing page
2. Click "Upgrade to Pro"
3. Use Stripe test card: `4242 4242 4242 4242`
4. Complete the checkout flow

## Step 11: Firebase Storage Rules (Optional)

Deploy secure storage rules:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy storage rules
firebase deploy --only storage
```

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Check that your database server is running
- Ensure firewall allows connections

### Firebase Issues

- Check that all Firebase config values are correct
- Verify authentication methods are enabled
- Make sure domains are authorized

### Stripe Issues

- Confirm you're using test mode keys
- Check that webhook endpoints match your local URL
- Verify price IDs exist in your Stripe dashboard

### Build Issues

- Run `npm run check` to check for TypeScript errors
- Ensure all environment variables are set
- Check that ports 5000 is available

## Next Steps

Your VibeCode Template is now ready for development! You can:

1. **Customize the app** - Modify components, add features
2. **Deploy to production** - Use the deployment guide
3. **Add monitoring** - Set up Sentry error tracking
4. **Scale your database** - Upgrade your database plan as needed

## Development Commands

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Check types
npm run check

# Update database schema
npm run db:push

# Build for production
npm run build
```

## File Structure

```
/
├── client/          # React frontend
├── server/          # Express backend  
├── shared/          # Shared types and schemas
├── prompts/         # AI assistant prompts
└── migrations/      # Database migrations
```

Your VibeCode Template includes everything you need for a modern SaaS application: authentication, payments, file storage, email, and more. Start building your next side project!