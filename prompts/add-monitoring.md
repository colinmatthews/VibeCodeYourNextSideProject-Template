# /add-monitoring - Add Sentry Monitoring

You are a helpful assistant that guides users through adding Sentry monitoring to their VibeCode Template app. This leverages existing error handling patterns and provides comprehensive error tracking, performance monitoring, and alerting.

## What This Command Does

Helps users integrate Sentry monitoring using existing patterns:
- Current error handling in API routes and components
- User authentication for user context in errors
- Production deployment setup for environment-specific monitoring
- Performance monitoring for API and frontend

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Monitoring Level:**
- [ ] What do you want to monitor?
  - a) Just critical errors and crashes
  - b) All errors including handled exceptions
  - c) Performance monitoring (API response times, page loads)
  - d) User experience monitoring (user sessions, interactions)
  - e) Custom business metrics and alerts

**Alert Preferences:**
- [ ] How should you be notified?
  - Email notifications for critical errors
  - Slack/Discord webhook integration
  - SMS alerts for downtime
  - Dashboard-only monitoring (no alerts)

**Error Budget:**
- [ ] What's your error tolerance?
  - Zero tolerance (alert on any error)
  - Normal (alert on error spikes or critical issues)
  - Relaxed (only alert on app-breaking issues)

## Step 2: Implementation Based on User Answers

### Option A: Basic Sentry Setup

If user wants basic error monitoring:

1. **Install Sentry**
   ```bash
   npm install @sentry/react @sentry/node @sentry/tracing
   ```

2. **Configure Sentry for Frontend**
   ```typescript
   // client/src/lib/sentry.ts
   import * as Sentry from '@sentry/react';
   import { BrowserTracing } from '@sentry/tracing';
   
   export function initSentry() {
     Sentry.init({
       dsn: import.meta.env.VITE_SENTRY_DSN,
       environment: import.meta.env.MODE, // 'development' or 'production'
       integrations: [
         new BrowserTracing({
           // Set up automatic route change tracking for SPA
           routingInstrumentation: Sentry.reactRouterV6Instrumentation(
             React.useEffect,
             useLocation,
             useNavigationType,
             createRoutesFromChildren,
             matchRoutes
           ),
         }),
       ],
       
       // Performance Monitoring
       tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev
       
       // Session Replay (optional - captures user sessions)
       replaysSessionSampleRate: 0.1, // 10% of sessions
       replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
       
       // Filter out known non-critical errors
       beforeSend(event, hint) {
         // Don't send errors in development
         if (import.meta.env.DEV) {
           console.error('Sentry would send:', event, hint);
           return null;
         }
         
         // Filter out network errors from ad blockers, etc.
         if (event.exception) {
           const error = hint.originalException as Error;
           if (error?.message?.includes('Non-Error promise rejection')) {
             return null;
           }
         }
         
         return event;
       },
       
       // Add user context
       initialScope: {
         tags: {
           component: 'frontend',
         },
       },
     });
   }
   
   // Helper functions for manual error tracking
   export function captureError(error: Error, context?: Record<string, any>) {
     Sentry.captureException(error, {
       extra: context,
     });
   }
   
   export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
     Sentry.captureMessage(message, level);
   }
   
   export function setUserContext(user: {
     id: string;
     email: string;
     subscriptionType: string;
   }) {
     Sentry.setUser({
       id: user.id,
       email: user.email,
       subscription: user.subscriptionType,
     });
   }
   ```

3. **Initialize Sentry in App**
   ```tsx
   // Update client/src/main.tsx
   import { initSentry } from './lib/sentry';
   
   // Initialize Sentry before React
   initSentry();
   
   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <App />
     </React.StrictMode>
   );
   ```

4. **Add Error Boundary**
   ```tsx
   // client/src/components/ErrorBoundary.tsx
   import * as Sentry from '@sentry/react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
   import { Button } from './ui/button';
   import { RefreshCw, Bug } from 'lucide-react';
   
   interface ErrorFallbackProps {
     error: Error;
     resetErrorBoundary: () => void;
   }
   
   function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
     return (
       <div className="min-h-screen flex items-center justify-center p-4">
         <Card className="w-full max-w-md">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Bug className="text-red-500" size={20} />
               Something went wrong
             </CardTitle>
             <CardDescription>
               We've been notified about this error and will fix it soon.
             </CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="bg-gray-100 p-3 rounded text-sm font-mono">
               {error.message}
             </div>
             <div className="flex gap-2">
               <Button onClick={resetErrorBoundary} className="flex-1">
                 <RefreshCw size={16} className="mr-2" />
                 Try Again
               </Button>
               <Button 
                 variant="outline"
                 onClick={() => window.location.href = '/'}
               >
                 Go Home
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     );
   }
   
   export const SentryErrorBoundary = Sentry.withErrorBoundary(
     ({ children }: { children: React.ReactNode }) => <>{children}</>,
     {
       fallback: ErrorFallback,
       beforeCapture: (scope) => {
         scope.setTag('errorBoundary', true);
       },
     }
   );
   ```

5. **Configure Sentry for Backend**
   ```typescript
   // server/lib/sentry.ts
   import * as Sentry from '@sentry/node';
   import '@sentry/tracing';
   
   export function initSentry() {
     Sentry.init({
       dsn: process.env.SENTRY_DSN,
       environment: process.env.NODE_ENV,
       
       integrations: [
         // Enable HTTP calls tracing
         new Sentry.Integrations.Http({ tracing: true }),
         // Enable Express.js middleware tracing
         new Sentry.Integrations.Express({ app: undefined }),
       ],
       
       // Performance Monitoring
       tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
       
       // Filter sensitive data
       beforeSend(event) {
         // Remove sensitive data from request bodies
         if (event.request?.data) {
           const data = event.request.data;
           if (typeof data === 'object') {
             delete data.password;
             delete data.token;
             delete data.apiKey;
           }
         }
         
         return event;
       },
     });
   }
   
   export function captureError(error: Error, context?: Record<string, any>) {
     Sentry.captureException(error, {
       extra: context,
     });
   }
   
   export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
     Sentry.captureMessage(message, level);
   }
   
   export function setUserContext(user: {
     firebaseId: string;
     email: string;
     subscriptionType: string;
   }) {
     Sentry.setUser({
       id: user.firebaseId,
       email: user.email,
       subscription: user.subscriptionType,
     });
   }
   ```

6. **Add Sentry Middleware to Express**
   ```typescript
   // Update server/index.ts
   import * as Sentry from '@sentry/node';
   import { initSentry } from './lib/sentry';
   
   // Initialize Sentry before importing anything else
   initSentry();
   
   import express from 'express';
   // ... other imports
   
   const app = express();
   
   // Sentry request handler must be the first middleware
   app.use(Sentry.Handlers.requestHandler());
   app.use(Sentry.Handlers.tracingHandler());
   
   // ... your existing middleware and routes
   
   // Sentry error handler must be before any other error middleware
   app.use(Sentry.Handlers.errorHandler());
   
   // Your error handler
   app.use((err: any, req: any, res: any, next: any) => {
     console.error('Error:', err);
     res.status(500).json({ error: 'Internal server error' });
   });
   ```

### Option B: Enhanced Error Tracking

If user wants detailed error tracking:

1. **Add Error Context Helper**
   ```typescript
   // server/middleware/errorContext.ts
   import { setUserContext, captureError } from '../lib/sentry';
   
   export function addErrorContext(req: any, res: any, next: any) {
     // Add user context if authenticated
     if (req.user) {
       setUserContext(req.user);
     }
     
     // Add request context
     res.locals.sentryScope = {
       tags: {
         route: req.route?.path,
         method: req.method,
       },
       extra: {
         userAgent: req.get('User-Agent'),
         ip: req.ip,
         url: req.originalUrl,
       },
     };
     
     next();
   }
   
   export function handleApiError(error: Error, req: any, res: any, next: any) {
     // Capture error with context
     captureError(error, {
       route: req.route?.path,
       method: req.method,
       body: req.body,
       params: req.params,
       query: req.query,
       userId: req.user?.firebaseId,
     });
     
     next(error);
   }
   ```

2. **Add Custom Error Classes**
   ```typescript
   // server/lib/errors.ts
   import { captureError } from './sentry';
   
   export class AppError extends Error {
     statusCode: number;
     isOperational: boolean;
   
     constructor(message: string, statusCode: number, isOperational = true) {
       super(message);
       this.statusCode = statusCode;
       this.isOperational = isOperational;
       
       Error.captureStackTrace(this, this.constructor);
     }
   }
   
   export class ValidationError extends AppError {
     constructor(message: string) {
       super(message, 400);
     }
   }
   
   export class NotFoundError extends AppError {
     constructor(message: string = 'Resource not found') {
       super(message, 404);
     }
   }
   
   export class UnauthorizedError extends AppError {
     constructor(message: string = 'Unauthorized') {
       super(message, 401);
     }
   }
   
   // Helper to catch and report async errors
   export function catchAsync(fn: Function) {
     return (req: any, res: any, next: any) => {
       Promise.resolve(fn(req, res, next)).catch((error) => {
         // Report to Sentry
         captureError(error, {
           route: req.route?.path,
           method: req.method,
           userId: req.user?.firebaseId,
         });
         next(error);
       });
     };
   }
   ```

3. **Enhanced Frontend Error Handling**
   ```tsx
   // client/src/hooks/useErrorHandler.ts
   import { useCallback } from 'react';
   import { captureError } from '../lib/sentry';
   import { toast } from 'sonner'; // or your preferred toast library
   
   export function useErrorHandler() {
     const handleError = useCallback((error: Error, context?: Record<string, any>) => {
       // Log to console in development
       if (import.meta.env.DEV) {
         console.error('Error:', error, context);
       }
       
       // Report to Sentry
       captureError(error, context);
       
       // Show user-friendly message
       toast.error('Something went wrong. We\'ve been notified and will fix it soon.');
     }, []);
   
     const handleAsyncError = useCallback(async (asyncFn: () => Promise<any>, context?: Record<string, any>) => {
       try {
         return await asyncFn();
       } catch (error) {
         handleError(error as Error, context);
         throw error; // Re-throw if the caller needs to handle it
       }
     }, [handleError]);
   
     return { handleError, handleAsyncError };
   }
   ```

### Option C: Performance Monitoring

If user wants performance monitoring:

1. **Add Performance Tracking**
   ```typescript
   // client/src/lib/performance.ts
   import * as Sentry from '@sentry/react';
   
   export function trackPageLoad(pageName: string) {
     const transaction = Sentry.startTransaction({
       name: `Page Load - ${pageName}`,
       op: 'navigation',
     });
     
     // Finish when page is fully loaded
     window.addEventListener('load', () => {
       transaction.finish();
     });
   }
   
   export function trackApiCall(endpoint: string, method: string = 'GET') {
     return Sentry.startTransaction({
       name: `API ${method} ${endpoint}`,
       op: 'http.client',
     });
   }
   
   export function trackUserInteraction(action: string, element: string) {
     Sentry.addBreadcrumb({
       message: `User ${action} ${element}`,
       category: 'ui.interaction',
       level: 'info',
     });
   }
   ```

2. **Add Performance Monitoring Hook**
   ```tsx
   // client/src/hooks/usePerformanceMonitoring.ts
   import { useEffect } from 'react';
   import { trackPageLoad } from '../lib/performance';
   
   export function usePerformanceMonitoring(pageName: string) {
     useEffect(() => {
       trackPageLoad(pageName);
     }, [pageName]);
   }
   ```

3. **Add API Performance Tracking**
   ```typescript
   // client/src/lib/api.ts (enhance existing API client)
   import { trackApiCall } from './performance';
   
   export async function apiCall(endpoint: string, options: RequestInit = {}) {
     const transaction = trackApiCall(endpoint, options.method || 'GET');
     
     try {
       const response = await fetch(endpoint, options);
       
       transaction.setTag('http.status_code', response.status);
       transaction.setData('response.size', response.headers.get('content-length'));
       
       if (!response.ok) {
         transaction.setTag('error', true);
       }
       
       return response;
     } catch (error) {
       transaction.setTag('error', true);
       throw error;
     } finally {
       transaction.finish();
     }
   }
   ```

## Step 3: Environment Variables

Add to `.env`:

```env
# Sentry Configuration
VITE_SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
SENTRY_ORG="your-org-name"
SENTRY_PROJECT="your-project-name"
SENTRY_AUTH_TOKEN="your-auth-token"
```

## Step 4: Alerts and Notifications

Set up alerts in Sentry dashboard:

1. **Error Rate Alerts**
   - Alert when error rate exceeds normal levels
   - Email/Slack notifications for critical errors

2. **Performance Alerts**
   - API response time degradation
   - Page load time increases

3. **Custom Alerts**
   - Failed payment attempts
   - High user signup failures
   - Feature usage anomalies

## Step 5: Testing Instructions

1. **Test Error Reporting**
   - [ ] Trigger a frontend error and verify it appears in Sentry
   - [ ] Trigger a backend error and verify reporting
   - [ ] Check that user context is included
   - [ ] Verify sensitive data is filtered out

2. **Test Performance Monitoring**
   - [ ] Check that page loads are tracked
   - [ ] Verify API calls are monitored
   - [ ] Confirm performance metrics are collected

3. **Test Error Boundary**
   - [ ] Verify error boundary catches React errors
   - [ ] Check that user sees friendly error message
   - [ ] Confirm errors are reported to Sentry

## Step 6: Next Steps

After implementation:
- [ ] Set up custom dashboards for key metrics
- [ ] Configure alert rules for your team
- [ ] Add source map uploads for better error tracking
- [ ] Set up release tracking
- [ ] Add custom performance metrics

## Common Error Monitoring Patterns

**Critical Errors:**
- Authentication failures
- Payment processing errors
- Database connection issues
- Third-party service outages

**Performance Monitoring:**
- API response times > 2 seconds
- Page load times > 5 seconds
- High memory usage
- Database query performance

**User Experience Issues:**
- Form submission failures
- File upload errors
- Search functionality problems
- Navigation issues

## Remember

- Don't track sensitive user data (passwords, tokens)
- Set appropriate sampling rates for production
- Configure alerts to avoid notification fatigue
- Use Sentry's release tracking for better debugging
- Regularly review and triage errors in Sentry dashboard
- Set up source maps for production builds to get readable stack traces