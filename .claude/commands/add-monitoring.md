# /add-monitoring - Add Sentry Monitoring

You are a helpful assistant that guides users through setting up Sentry monitoring in their VibeCode Template app. This will provide comprehensive error tracking, performance monitoring, and user context for debugging.

## What This Command Does

Sets up complete Sentry monitoring with:
- Frontend and backend error tracking
- Performance monitoring for API and page loads
- User context for better debugging
- Error boundaries for graceful error handling
- Production-ready configuration

**Installation:**
- Install required Sentry packages: `@sentry/react @sentry/node @sentry/tracing`

**Frontend Setup:**
- Create a Sentry configuration file in `client/src/lib/` following existing lib patterns
- Study `client/src/lib/firebase.ts` for configuration structure examples
- Initialize Sentry with DSN from environment variables
- Configure performance monitoring and session replay
- Filter out development errors and common non-critical errors
- Set up user context tracking for better debugging

**Main Entry Point:**
- Update `client/src/main.tsx` to initialize Sentry before React
- Follow the existing import patterns in the file
- Initialize Sentry early in the application lifecycle
```

**Error Boundary Component:**
- Create an ErrorBoundary component in `client/src/components/`
- Use existing UI components from `client/src/components/ui/` (Card, Button)
- Follow the existing component structure patterns in the components directory
- Use Lucide React icons consistently with other components
- Apply Tailwind classes following existing styling patterns
- Create a user-friendly error fallback UI with retry functionality
- Integrate with Sentry's error boundary wrapper
- Include proper error context and tagging
```

**Backend Setup:**
- Create a Sentry configuration file in `server/lib/` following existing patterns
- Study `server/lib/sendgrid.ts` for server-side configuration examples
- Configure Node.js and Express integrations
- Set up performance tracing for API endpoints
- Implement data filtering to remove sensitive information (passwords, tokens)
- Follow the existing environment variable patterns
- Create utility functions for error capture and user context
```

**Server Integration:**
- Update `server/index.ts` to initialize Sentry early in the application
- Study the existing server setup and middleware patterns
- Add Sentry middleware in the correct order (request handler first, error handler last)
- Follow the existing error handling patterns in the server
- Ensure Sentry initialization happens before other imports
- Integrate with the existing Express middleware stack
```

## Step 7: Set Environment Variables

**Environment Configuration:**
- Add Sentry DSN variables to your `.env` file following existing patterns
- Use separate DSNs for frontend (VITE_SENTRY_DSN) and backend (SENTRY_DSN)
- Follow the existing environment variable naming conventions in the project
- Ensure variables are properly referenced in your configuration files

## Step 8: Use Error Boundary in App

**App Integration:**
- Update `client/src/App.tsx` to wrap the application with the error boundary
- Study the existing App.tsx structure and component wrapping patterns
- Integrate the error boundary at the appropriate level in the component tree
- Maintain the existing routing and layout structure
```

## Step 9: Add User Context

**User Context Integration:**
- Study the existing authentication flow in `client/src/hooks/use-auth.ts`
- Add user context setting after successful login/authentication
- Follow the existing Firebase auth patterns in the codebase
- Integrate with the existing user data fetching from the database
- Include relevant user information for debugging (ID, email, subscription type)
```

1. **Test Frontend Error Reporting**
   - Add a temporary test button to any existing component
   - Trigger a test error to verify Sentry integration
   - Remove test code after verification

2. **Test Backend Error Reporting**
   - Add a temporary test route to verify backend error capture
   - Follow existing route patterns in `server/routes/`
   - Test the error and remove the test route after verification

3. **Check Sentry Dashboard**
   
   Visit your Sentry project dashboard to verify:
   - Errors are being received
   - User context is attached
   - Performance data is collected
   - Error boundary is working

## That's it!

Your Sentry monitoring is now set up. You'll get:

- **Error Tracking**: All frontend and backend errors reported automatically
- **User Context**: See which users experienced errors  
- **Performance Monitoring**: Track API response times and page loads
- **Error Boundaries**: Graceful error handling with user-friendly messages
- **Session Replay**: See exactly what users did before errors occurred

## Getting Your Sentry DSN

1. Create account at [sentry.io](https://sentry.io)
2. Create a new project (choose React for frontend, Node.js for backend)
3. Copy the DSN from your project settings
4. Add it to your `.env` file

## Production Tips

- Sentry automatically filters out development errors
- Only 10% of performance data is collected in production (configurable)
- Sensitive data like passwords and tokens are automatically filtered
- Session replay captures 10% of normal sessions, 100% of error sessions

## Need Help?

Check the Sentry dashboard for:
- Real-time error notifications
- Performance trends
- User impact reports
- Error frequency and patterns