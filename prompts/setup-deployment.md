# /setup-deployment - Deploy to Render

You are a helpful assistant that guides users through deploying their VibeCode Template app to Render. This leverages the existing build process and environment configuration to set up production deployment.

## What This Command Does

Helps users deploy their app to Render using existing configurations:
- Build process (npm run build) already configured
- Environment variables structure already established
- Database hosting via Render PostgreSQL (integrated platform)
- Firebase services (auth and storage) work in production
- Static file serving and API routes properly structured

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
  - Database will be automatically created by Render
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
   - Click "New +" and select "PostgreSQL"
   - Name your database (e.g., "your-app-db")
   - Choose a region (same as where you'll deploy your app)
   - Note the database name for later

   **Step 3: Create a Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Choose the repository containing your VibeCode Template

   **Step 4: Configure Build Settings**
   ```yaml
   # Render will auto-detect, but here are the settings:
   Build Command: npm install && npm run build
   Start Command: npm start
   Environment: Node
   Node Version: 18 (or latest LTS)
   ```

   **Step 5: Connect Database to Web Service**
   - In your web service settings, go to "Environment"
   - Click "Add Environment Variable"
   - For DATABASE_URL, select "From Database" and choose your PostgreSQL database
   - Render will automatically populate the connection string

2. **Environment Variables Setup**

   In Render dashboard, add these environment variables:

   ```env
   # Database (Render PostgreSQL) - Automatically connected
   DATABASE_URL=${{ YOUR_DATABASE.DATABASE_URL }}  # Auto-filled by Render
   PGDATABASE=your_database_name
   PGHOST=${{ YOUR_DATABASE.HOST }}  # Auto-filled by Render
   PGUSER=${{ YOUR_DATABASE.USER }}  # Auto-filled by Render
   PGPASSWORD=${{ YOUR_DATABASE.PASSWORD }}  # Auto-filled by Render
   PGPORT=5432

   # Session
   SESSION_SECRET=your-production-session-secret

   # Stripe (LIVE KEYS for production)
   STRIPE_SECRET_KEY=sk_live_your_live_secret_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   STRIPE_PRICE_ID_PRO=price_your_live_price_id
   VITE_STRIPE_PUBLIC_KEY=pk_live_your_live_public_key

   # Firebase (Production project)
   VITE_FIREBASE_PROJECT_ID=your-prod-project-id
   VITE_FIREBASE_API_KEY=your-prod-api-key
   VITE_FIREBASE_APP_ID=your-prod-app-id
   VITE_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id

   # Email
   SENDGRID_API_KEY=SG.your-sendgrid-key

   # Analytics & Monitoring
   VITE_POSTHOG_API_KEY=phc_your_posthog_key
   SENTRY_DSN=https://your-sentry-dsn

   # Node Environment
   NODE_ENV=production
   ```

3. **Update package.json for Production**

   Ensure your package.json has the correct scripts:
   ```json
   {
     "scripts": {
       "build": "vite build",
       "start": "node server/index.js",
       "postbuild": "cp -r server dist/ && cp package*.json dist/",
       "db:push": "drizzle-kit push:pg"
     }
   }
   ```

4. **Create render.yaml (Optional)**

   For more control, create a `render.yaml` file in your project root:
   ```yaml
   services:
     - type: web
       name: your-app-name
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: DATABASE_URL
           fromDatabase:
             name: your-app-db
             property: connectionString
   
   databases:
     - name: your-app-db
       databaseName: your_app_db
       user: your_app_user
       plan: free  # or starter/standard for production
   ```

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
   - [ ] Render PostgreSQL database is created
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
   ```dns
   # Add these DNS records in your domain provider:
   Type: CNAME
   Name: app (or your subdomain)
   Value: your-app-name.onrender.com

   # If using root domain:
   Type: A
   Name: @
   Value: 216.24.57.1 (Render's IP)
   ```

3. **Update Firebase Configuration**
   ```javascript
   // Update Firebase Auth authorized domains
   // In Firebase Console > Authentication > Settings > Authorized domains
   // Add: yourdomain.com
   ```

4. **Update Stripe Webhook**
   ```bash
   # Update webhook endpoint in Stripe Dashboard:
   # From: https://your-app.onrender.com/api/webhook
   # To: https://yourdomain.com/api/webhook
   ```

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
   ```dockerfile
   # Optional: Create Dockerfile for more control
   FROM node:18-alpine

   WORKDIR /app

   # Copy package files
   COPY package*.json ./

   # Install dependencies
   RUN npm ci --only=production

   # Copy application code
   COPY . .

   # Build application
   RUN npm run build

   # Expose port
   EXPOSE 5000

   # Start application
   CMD ["npm", "start"]
   ```

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

1. **Health Check Endpoint**
   ```typescript
   // Add to server/routes/index.ts
   router.get('/health', (req, res) => {
     res.json({
       status: 'healthy',
       timestamp: new Date().toISOString(),
       version: process.env.npm_package_version,
       environment: process.env.NODE_ENV,
     });
   });
   ```

2. **Database Connection Monitoring**
   ```typescript
   // Add database health check
   router.get('/health/db', async (req, res) => {
     try {
       await db.execute(sql`SELECT 1`);
       res.json({ database: 'connected' });
     } catch (error) {
       res.status(500).json({ database: 'disconnected', error: error.message });
     }
   });
   ```

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
- Verify Neon database allows connections from Render
- Check if schema needs to be updated
```

### Runtime Issues
```markdown
## Runtime Troubleshooting

### App Won't Start
- Check build logs in Render dashboard
- Verify start command is correct
- Ensure port 5000 is used (Render's default)

### Database Connection Errors
- Verify DATABASE_URL is correct (auto-filled by Render)
- Check Render PostgreSQL database status in dashboard
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
   - Monitor database performance in Render dashboard
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
   - Monitor database metrics in Render dashboard
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