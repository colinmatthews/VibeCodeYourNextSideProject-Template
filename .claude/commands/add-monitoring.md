# /add-monitoring - Add Sentry Monitoring

You are a helpful assistant that guides users through setting up Sentry monitoring in their VibeCode Template app. This will provide comprehensive error tracking, performance monitoring, and user context for debugging.

## What This Command Does

Sets up complete Sentry monitoring with:
- Frontend and backend error tracking
- Performance monitoring for API and page loads
- User context for better debugging
- Error boundaries for graceful error handling
- Production-ready configuration

```bash
npm install @sentry/react @sentry/node @sentry/tracing
```

Create `client/src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      new BrowserTracing(),
    ],
    
    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    
    // Session Replay for error reproduction
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out development errors
    beforeSend(event, hint) {
      if (import.meta.env.DEV) {
        console.error('Sentry would send:', event, hint);
        return null;
      }
      
      // Filter out common non-critical errors
      if (event.exception) {
        const error = hint.originalException as Error;
        if (error?.message?.includes('Non-Error promise rejection')) {
          return null;
        }
      }
      
      return event;
    },
    
    initialScope: {
      tags: { component: 'frontend' },
    },
  });
}

export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { extra: context });
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

Update `client/src/main.tsx`:

```tsx
import { initSentry } from './lib/sentry';

// Initialize Sentry before React
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `client/src/components/ErrorBoundary.tsx`:

```tsx
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

Create `server/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import '@sentry/tracing';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app: undefined }),
    ],
    
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter sensitive data
    beforeSend(event) {
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
  Sentry.captureException(error, { extra: context });
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

Update `server/index.ts`:

```typescript
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

## Step 7: Set Environment Variables

Add to `.env`:

```env
# Sentry Configuration
VITE_SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
SENTRY_DSN="https://your-dsn@sentry.io/your-project-id"
```

## Step 8: Use Error Boundary in App

Update `client/src/App.tsx` to wrap your app with the error boundary:

```tsx
import { SentryErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <SentryErrorBoundary>
      {/* Your existing app content */}
    </SentryErrorBoundary>
  );
}
```

## Step 9: Add User Context

In your authentication logic, add user context to Sentry:

```tsx
// In your login/auth component
import { setUserContext } from '../lib/sentry';

// After successful login
const user = await signInWithEmailAndPassword(auth, email, password);
setUserContext({
  id: user.uid,
  email: user.email || '',
  subscriptionType: userData.subscriptionType || 'free'
});
```

1. **Test Frontend Error Reporting**
   
   Add a test button to trigger an error:
   ```tsx
   // Temporarily add this to any component for testing
   <button onClick={() => { throw new Error('Test Sentry error!'); }}>
     Test Sentry
   </button>
   ```

2. **Test Backend Error Reporting**
   
   Add a test route:
   ```typescript
   // Temporarily add to server/routes/
   app.get('/test-sentry', (req, res) => {
     throw new Error('Test backend error!');
   });
   ```

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