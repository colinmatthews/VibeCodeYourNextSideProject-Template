# /initial-setup - Get Your VibeCode Template Running

You are a helpful assistant that guides users through the initial setup of their freshly cloned VibeCode Template. This will get all required services configured and the app running locally in development mode.

## What This Command Does

Sets up your complete development environment with:
- PostgreSQL database connection
- Firebase Authentication and Storage
- Stripe payment processing
- SendGrid email service
- Local development server

## Before You Begin

**EXAMINE EXISTING PATTERNS FIRST**: Study the codebase to understand the established setup:
- Review `package.json` for available scripts and dependencies
- Check `server/index.ts` for server configuration requirements
- Examine `client/src/lib/` for service configuration patterns
- Study `shared/schema.ts` for database structure
- Review existing environment variable usage throughout the codebase

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Setup MCPs
- Set up Context7 

Close and reopen claude to activate MCPs
Then, create a new project on the starter($7/mo) plan for hosting the application and use Neon for the database

## Step 3: Create Environment Variables

Create a `.env` file in the root directory following the patterns established in the codebase:

**Study Existing Environment Usage**:
- Examine how environment variables are used in `server/index.ts`
- Check client-side environment variable patterns in `client/src/lib/`
- Review database connection patterns in `server/db.ts`
- Follow the same naming conventions and structure as existing code

**Required Environment Variables** (follow existing patterns):
- Database configuration (PostgreSQL connection details)
- Session management (strong secret key)
- Stripe payment processing (test keys for development)
- Firebase services (project configuration)
- Email service (SendGrid API key)
- Any additional services referenced in the existing code


## Step 4: Set Up PostgreSQL Database

**Study Existing Database Patterns**:
- Review `server/db.ts` for connection configuration
- Examine `shared/schema.ts` for database structure
- Check existing migration patterns in `server/migrations/`

### Option A: Use Neon PostgreSQL (Recommended)
- Follow the database configuration patterns established in the codebase
- Use connection details that match the existing database setup patterns

### Option B: Local PostgreSQL
- Configure local database to match existing connection patterns
- Use the same database naming and configuration conventions

## Step 5: Set Up Firebase

**Study Existing Firebase Integration**:
- Examine `client/src/lib/firebase.ts` for configuration patterns
- Review `firebase-storage.rules` for security rule patterns
- Check existing authentication patterns in `client/src/hooks/use-auth.ts`
- Study file storage patterns in `client/src/hooks/useFiles.ts`

### Create Firebase Project
- Configure project to match existing Firebase integration patterns
- Enable services that match existing codebase usage

### Configure Authentication
- Follow authentication provider patterns from existing code
- Set up authorized domains to match development configuration

### Configure Storage
- Follow storage configuration patterns from existing code
- Use security rules that match `firebase-storage.rules`

### Get Firebase Config
- Configure environment variables to match existing patterns
- Follow the same naming conventions as existing Firebase configuration

## Step 6: Set Up Stripe

**Study Existing Stripe Integration**:
- Examine payment patterns in `server/routes/paymentRoutes.ts`
- Review webhook handling in `server/routes/webhookRoutes.ts`
- Check client-side Stripe usage in `client/src/lib/stripe.ts`
- Study existing pricing and subscription patterns

### Create Stripe Account
- Configure account to match existing Stripe integration patterns
- Use test mode for development following existing patterns

### Get API Keys
- Configure API keys to match existing environment variable patterns
- Follow the same naming conventions as existing Stripe configuration

### Create Product and Price
- Set up products that match existing pricing structure
- Follow the same subscription model patterns from existing code

### Set Up Webhooks
- Configure webhooks to match existing webhook handling patterns
- Use the same webhook events as implemented in existing code

## Step 7: Set Up SendGrid

**Study Existing Email Integration**:
- Examine email patterns in `server/lib/sendgrid.ts`
- Review existing email template and sending patterns
- Check environment variable usage for email configuration

### Configure SendGrid
- Set up SendGrid account to match existing email integration patterns
- Configure API key following existing environment variable patterns
- Follow the same email service configuration as established in the codebase

## Step 8: Initialize Database

**Follow Existing Database Setup Patterns**:
- Review available database scripts in `package.json`
- Study existing schema in `shared/schema.ts`
- Check migration patterns in `server/migrations/`

Push the database schema using established patterns:
- Use the same database initialization commands as configured in the project
- Follow existing migration and schema update procedures

## Step 9: Start Development Server

**Follow Existing Development Patterns**:
- Use development scripts as defined in `package.json`
- Check server configuration in `server/index.ts` for port and setup
- Follow existing development workflow patterns

Start the development server using established commands and check the configured port

## Step 10: Test Your Setup

**Follow Existing Testing Patterns**:
- Study existing authentication flow in the application
- Check file upload functionality as implemented
- Review payment flow implementation
- Test features according to existing user workflows

### Test Authentication
- Test the authentication system as implemented in the existing code
- Follow the same login/logout flow patterns

### Test File Upload
- Test file upload functionality following existing implementation
- Check file management features as designed

### Test Payments (Optional)
- Test payment flow using existing Stripe test configuration
- Follow the subscription upgrade patterns implemented in the code

## Step 11: Firebase Storage Rules (Optional)

**Follow Existing Firebase Deployment Patterns**:
- Study existing Firebase configuration and rules
- Review `firebase-storage.rules` for security rule patterns
- Follow established Firebase deployment procedures

Deploy storage rules using the same patterns and tools as configured in the project

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
- Check that port 5000 is available (or configure PORT env variable)

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
