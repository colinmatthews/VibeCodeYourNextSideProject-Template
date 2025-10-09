# /setup-deployment - Deploy to Render

You are a helpful assistant that guides users through deploying their VibeCode Template app to Render. This leverages the existing build process and environment configuration to set up production deployment.

## What This Command Does

Helps users deploy their app to Render using existing configurations:
- Build process (npm run build) already configured
- Environment variables structure already established
- Database hosting via Neon PostgreSQL (serverless database)
- Firebase services (auth and storage) work in production
- Static file serving and API routes properly structured

IMPORTANT: LEVERAGE RENDER MCP TO ASSIST USER. DO NOT TAKE ANY DESTRUCTIVE ACTIONS!

## Before You Begin

**EXAMINE EXISTING PATTERNS FIRST**: Study the codebase to understand the established deployment patterns:
- Review `package.json` for build and start scripts
- Check `server/index.ts` for server configuration
- Examine `client/src/lib/` for environment variable usage
- Study `shared/schema.ts` for database structure
- Review existing environment variable patterns in development

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Deployment Experience:**
- [ ] Is this your first time deploying to Render?
  - a) Yes, I need complete setup guidance
  - b) I have a Render account but haven't deployed this app
  - c) I've deployed before but need help with this specific app
  - d) I just need the configuration details

**Environment:**
- [ ] Do you have all your production environment variables ready?
  - Database will be automatically created by Neon
  - Firebase config (production project)
  - Stripe keys (live keys for production)
  - SendGrid API key
  - Other service keys (PostHog, Sentry, etc.)

**Domain Setup:**
- [ ] Do you need a custom domain?
  - Use Render's free subdomain (app-name.onrender.com)
  - Connect your own domain (requires DNS setup)
  - Set up both staging and production environments

## Step 2: Implementation Based on User Answers

### Option A: First-Time Render Deployment

If user is new to Render:

1. **Create Render Account and Service**

   **Step 1: Sign up for Render**
   - Go to [render.com](https://render.com) and create an account
   - Connect your GitHub account for automatic deployments

   **Step 2: Create PostgreSQL Database**
   - Go to [neon.tech](https://neon.tech) and create a new database
   - Name your database (e.g., "your-app-db")
   - Choose a region (same as where you'll deploy your app)
   - Copy the connection string for later

   **Step 3: Create a Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Choose the repository containing your VibeCode Template

   **Step 4: Configure Build Settings**
   - Build Command: Follow the patterns in `package.json` scripts
   - Start Command: Use the established server entry point
   - Environment: Node (check package.json for version requirements)
   - Reference existing build configuration for consistency

   **Step 5: Connect Database to Web Service**
   - In your web service settings, go to "Environment"
   - Click "Add Environment Variable"
   - For DATABASE_URL, paste your Neon connection string
   - Add other database environment variables from Neon dashboard

2. **Environment Variables Setup**

   **Study Existing Environment Configuration**:
   - Examine your local `.env` file for required variables
   - Check `server/index.ts` for environment variable usage
   - Review `client/src/lib/` files for client-side environment variables
   - Follow the same naming patterns and structure
   - Ensure all authentication, database, payment, and email configurations match your existing setup
   - Use production values for all services (live Stripe keys, production Firebase project, etc.)
   - Set NODE_ENV=production for proper production behavior

3. **Verify Production Scripts**
   - Check your `package.json` for existing build and start scripts
   - Ensure scripts follow the established patterns in the repository
   - Verify that the build process includes both client and server components
   - Confirm database migration scripts are properly configured

4. **Optional: Create render.yaml Configuration**
   - Study the existing deployment configuration patterns
   - Follow the service and database naming conventions used in the project
   - Reference existing environment variable patterns
   - Use the same build and start commands as defined in package.json

### Option B: Environment-Specific Configuration

If user wants staging and production environments:

1. **Create Staging Environment**
   - Deploy to a staging service first
   - Use separate environment variables for testing
   - Test all functionality before production

2. **Production Checklist**
   ```markdown
   ## Pre-Deploy Checklist

   ### Database
   - [ ] Neon PostgreSQL database is created
   - [ ] Database is connected to your web service
   - [ ] Database schema is up to date (`npm run db:push`)
   - [ ] Database has production data (if migrating)

   ### Firebase
   - [ ] Production Firebase project created
   - [ ] Firebase Storage security rules deployed
   - [ ] Firebase Auth configured for your domain
   - [ ] Firebase config environment variables set

   ### Stripe
   - [ ] Live Stripe keys configured
   - [ ] Webhook endpoint configured (https://your-app.onrender.com/api/webhook)
   - [ ] Products and prices created in live mode
   - [ ] Test payment flow in production

   ### Email
   - [ ] SendGrid sender email verified
   - [ ] Email templates tested
   - [ ] DKIM/SPF records configured (if using custom domain)

   ### Domain & SSL
   - [ ] Custom domain configured (if applicable)
   - [ ] SSL certificate active
   - [ ] DNS records pointing to Render

   ### Security
   - [ ] All environment variables use production values
   - [ ] Session secret is strong and unique
   - [ ] Firebase security rules tested
   - [ ] API rate limiting configured
   ```

### Option C: Custom Domain Setup

If user wants a custom domain:

1. **Configure Domain in Render**
   - Go to your service settings
   - Click "Custom Domains"
   - Add your domain (e.g., app.yourdomain.com)

2. **DNS Configuration**
   - Configure DNS records according to your domain provider's requirements
   - Use CNAME records for subdomains or A records for root domains
   - Follow Render's documentation for proper DNS setup

3. **Update Service Configurations**
   - Review existing Firebase configuration in `client/src/lib/firebase.ts`
   - Update Firebase Auth authorized domains to include your production domain
   - Check existing Stripe webhook configuration in `server/routes/webhookRoutes.ts`
   - Update Stripe webhook endpoints to match your production domain
   - Ensure all external service configurations are updated for production

## Step 3: Deployment Process

### Automatic Deployment Setup

1. **GitHub Integration**
   ```markdown
   ## Auto-Deploy Setup

   1. Connect GitHub repository to Render
   2. Enable auto-deploy on push to main branch
   3. Set up deploy notifications (optional)
   4. Configure branch-specific deployments (staging/production)
   ```

2. **Build Process Optimization**
   - Study the existing build process in `package.json`
   - Follow the established patterns for dependency installation
   - Use the same port configuration as defined in `server/index.ts`
   - Reference existing containerization patterns if any exist in the project
   - Ensure build optimization follows the project's established conventions

### Manual Deployment Steps

1. **Pre-Deploy Commands**
   ```bash
   # Run these locally before deploying:
   npm run build          # Test build process
   npm run check          # TypeScript checking
   npm run db:push        # Update database schema
   ```

2. **Deploy to Render**
   - Push changes to your connected GitHub branch
   - Render will automatically detect changes and deploy
   - Monitor build logs in Render dashboard

3. **Post-Deploy Verification**
   ```markdown
   ## Verify Deployment

   ### Basic Functionality
   - [ ] App loads at your domain
   - [ ] User registration works
   - [ ] Login/logout functions
   - [ ] Database connections successful

   ### Integrations
   - [ ] Stripe payments work
   - [ ] Email sending functions
   - [ ] File uploads to Firebase
   - [ ] Analytics tracking active

   ### Performance
   - [ ] Page load times acceptable
   - [ ] API response times good
   - [ ] No console errors
   - [ ] SSL certificate valid
   ```

## Step 4: Production Monitoring Setup

1. **Health Check Endpoint Implementation**
   - Study existing API route patterns in `server/routes/`
   - Follow the same error handling and response patterns
   - Use the established database connection patterns from `server/db.ts`
   - Implement health checks that match the existing code style and structure
   - Reference existing middleware and authentication patterns if needed

## Step 5: Troubleshooting Common Issues

### Build Failures
```markdown
## Common Build Issues

### TypeScript Errors
- Run `npm run check` locally first
- Fix all TypeScript errors before deploying
- Check that all dependencies are installed

### Environment Variables
- Verify all required environment variables are set
- Check for typos in variable names
- Ensure secrets are properly formatted

### Database Issues
- Test database connection string
- Check if schema needs to be updated
```

### Runtime Issues
```markdown
## Runtime Troubleshooting

### App Won't Start
- Check build logs in Render dashboard
- Verify start command is correct
- Ensure PORT environment variable is set correctly (Render auto-sets this)

### Database Connection Errors
- Verify DATABASE_URL is correct (auto-filled by Render)
- Check Neon PostgreSQL database status in dashboard
- Ensure database and web service are in the same region
- Test connection locally with production credentials

### External Service Issues
- Test Stripe webhooks with ngrok locally first
- Verify Firebase project has correct domain authorized
- Check SendGrid sender verification
```

## Step 6: Scaling and Optimization

1. **Performance Optimization**
   ```markdown
   ## Production Optimizations

   ### Caching
   - Enable HTTP caching headers
   - Use CDN for static assets
   - Implement API response caching

   ### Database
   - Add database indexes for frequent queries
   - Monitor database performance in Neon dashboard
   - Consider connection pooling for high traffic
   - Upgrade database plan as needed

   ### Monitoring
   - Set up uptime monitoring
   - Configure error alerting
   - Track performance metrics
   ```

2. **Scaling Options**
   ```markdown
   ## Scaling on Render

   ### Vertical Scaling
   - Upgrade to higher tier for more CPU/RAM
   - Monitor resource usage in dashboard

   ### Database Scaling
   - Upgrade PostgreSQL plan (free → starter → standard)
   - Monitor database metrics in Neon dashboard
   - Connection pooling for high concurrency

   ### Horizontal Scaling
   - Multiple service instances (paid plans)
   - Load balancing (automatic)
   ```

## Step 7: Security Best Practices

```markdown
## Production Security

### Environment Variables
- Never commit secrets to git
- Use strong, unique session secrets
- Rotate API keys regularly

### HTTPS
- Always use HTTPS in production
- Update all external service webhooks to use HTTPS
- Configure HSTS headers

### Database Security
- Use read-only database users where possible
- Enable database connection encryption
- Monitor for unusual database activity

### Application Security
- Keep dependencies updated
- Use security headers (helmet.js)
- Implement rate limiting
- Monitor for security vulnerabilities
```

## Remember

- Test everything in staging before production deployment
- Keep environment variables secure and never commit them
- Monitor your application after deployment
- Set up proper error tracking and alerts
- Regularly update dependencies and security patches
- Have a rollback plan ready
- Document your deployment process for team members