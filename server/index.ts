import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { randomUUID } from 'crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { setupExpressErrorHandler } from 'posthog-node';
import { registerRoutes } from "./routes";
import { registerWebhookRoutes } from "./routes/webhookRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { sanitizeInputs } from './middleware/sanitize';

const app = express();
// ALWAYS serve the app on the configured port (default 5000)
// this serves both the API and the client
const PORT = parseInt(process.env.PORT || '5000', 10);


// Trust proxy - required for Replit's infrastructure
app.set('trust proxy', true);

import { posthog, logEvent, logSecurity } from './lib/audit';

(async () => {
  // Security headers with Helmet
  app.use(helmet({
    ...(process.env.NODE_ENV === 'production' && {
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      permittedCrossDomainPolicies: false,
      dnsPrefetchControl: { allow: false }
    }),
    noSniff: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: process.env.NODE_ENV === 'production'
          ? ["'self'", "https://fonts.googleapis.com"]
          : ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: process.env.NODE_ENV === 'production'
          ? [
              "'self'",
              "https://js.stripe.com",
              "https://apis.google.com",
              "https://accounts.google.com",
              "https://us-assets.i.posthog.com",
              "https://cdn.platform.openai.com"
            ]
          : [
              "'self'",
              "'unsafe-inline'",
              "https://js.stripe.com",
              "https://apis.google.com",
              "https://accounts.google.com",
              "https://us-assets.i.posthog.com",
              "https://cdn.platform.openai.com"
            ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://accounts.google.com",
          "https://www.googleapis.com",
          "https://us.i.posthog.com",
          "https://us-assets.i.posthog.com",
          "https://*.posthog.com",
          "https://api.openai.com",
          "https://cdn.platform.openai.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.googleusercontent.com"
        ],
        frameSrc: [
          "https://js.stripe.com",
          "https://accounts.google.com",
          "https://cdn.platform.openai.com",
          "https://platform.openai.com"
        ]
      }
    },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // IMPORTANT: Add raw body parsing specifically for webhook endpoint BEFORE express.json()
  // This ensures Stripe webhooks receive raw body for signature verification
  app.use('/api/webhook', express.raw({ type: 'application/json' }));

  // IMPORTANT: Register webhook routes BEFORE express.json() middleware
  // This ensures Stripe webhooks receive raw body for signature verification
  await registerWebhookRoutes(app);

  // Request ID + basic request logging (structured via PostHog)
  app.use((req, res, next) => {
    const requestId = randomUUID();
    (res as any).locals = (res as any).locals || {};
    (res as any).locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    const start = Date.now();
    const userId = (req as any).user?.claims?.sub || undefined;

    // Log request start (no body)
    logEvent('api.request', {
      requestId,
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId
    });

    res.on('finish', () => {
      const durationMs = Date.now() - start;
      logEvent('api.response', {
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs,
        userId: (req as any).user?.claims?.sub || userId
      });
    });

    next();
  });

  // Rate limiting middleware
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Higher limit for this template - 500 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Prefer per-user limits when authenticated, otherwise fall back to IP
    keyGenerator: (req: any) => req.user?.claims?.sub ?? ipKeyGenerator(req),
    handler: (req: any, res, _next, options) => {
      const requestId = (res as any)?.locals?.requestId;
      const userId = req.user?.claims?.sub;
      logSecurity('rate_limit', {
        requestId,
        method: req.method,
        path: req.path,
        userId,
        ip: req.ip,
        windowMs: options.windowMs,
        max: options.max,
      });
      res.status(options.statusCode || 429).json({
        ...(typeof options.message === 'object' ? options.message : { error: 'Too many requests' }),
        requestId,
      });
    },
    // Skip rate limiting for webhooks and health checks
    skip: (req) => {
      return req.path.startsWith('/api/webhook') || req.path === '/health';
    }
  });

  // Apply rate limiting to API routes
  app.use('/api', limiter);

  // Lightweight health and readiness endpoints
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness: attempts a lightweight DB check
  try {
    const { pool } = await import('./db');
    app.get('/ready', async (_req, res) => {
      try {
        await pool.query('select 1');
        res.status(200).json({ status: 'ready' });
      } catch (e) {
        res.status(503).json({ status: 'degraded' });
      }
    });
  } catch {
    // If DB import fails in certain environments, still expose endpoint
    app.get('/ready', (_req, res) => res.status(200).json({ status: 'ready' }));
  }

  

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [
          process.env.FRONTEND_URL,
          `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`
        ].filter((url): url is string => Boolean(url)) // Remove any undefined values with type predicate
      : ['http://localhost:5173', `http://localhost:${PORT}`, 'http://127.0.0.1:5173'], // Multiple dev origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // Cache preflight requests for 24 hours
  }));

  // Now apply global JSON parsing middleware for all other routes
  app.use(express.json({ limit: '10mb' })); // Set body size limit
  app.use(express.urlencoded({ extended: false, limit: '10mb' }));

  // Cookie parser for session management
  app.use(cookieParser());

  // Apply XSS sanitization to all API routes (except webhooks)
  app.use('/api', (req, res, next) => {
    // Skip sanitization for webhook endpoints as they need raw data for signature verification
    if (req.path.startsWith('/webhook')) {
      return next();
    }
    sanitizeInputs(req, res, next);
  });

  // Setup PostHog Express error handler
  if (posthog) {
    setupExpressErrorHandler(posthog, app);
  }

  // Keep concise console logs for API timing in dev
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path.startsWith('/api')) {
          log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
        }
      });
      next();
    });
  }

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    const status = err.status || err.statusCode || 500;
    
    // Sanitize error message for production
    const message = process.env.NODE_ENV === 'production' 
      ? getProductionErrorMessage(status)
      : err.message || "Internal Server Error";

    // Handle authentication errors specially
    if (err.code && err.code.startsWith('auth/')) {
      const requestId = (res as any)?.locals?.requestId;
      logEvent('api.error', { requestId, method: req.method, path: req.path, status: 401, code: err.code });
      return res.status(401).json({ 
        error: message,
        code: err.code,
        requestId
      });
    }

    // Handle authorization errors
    if (status === 403) {
      const requestId = (res as any)?.locals?.requestId;
      logEvent('api.error', { requestId, method: req.method, path: req.path, status: 403, code: 'auth/access-denied' });
      return res.status(403).json({ 
        error: message,
        code: 'auth/access-denied',
        requestId
      });
    }

    // Handle validation errors
    if (err.name === 'ZodError') {
      const requestId = (res as any)?.locals?.requestId;
      logEvent('api.error', { requestId, method: req.method, path: req.path, status: 400, code: 'validation_error' });
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors?.map((e: any) => `${e.path.join('.')}: ${e.message}`) || [],
        requestId
      });
    }

    const requestId = (res as any)?.locals?.requestId;
    logEvent('api.error', { requestId, method: req.method, path: req.path, status, code: err.code || 'internal_error' });
    res.status(status).json({ error: message, requestId });
  });

// Helper function to get sanitized error messages for production
function getProductionErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 413:
      return 'Payload Too Large';
    case 429:
      return 'Too Many Requests';
    case 500:
    default:
      return 'Internal Server Error';
  }
}

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error);
    try { await posthog?.shutdown(); } catch {}
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    try { await posthog?.shutdown(); } catch {}
  });

  // Handle process termination
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try { await posthog?.shutdown(); } catch {}
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try { await posthog?.shutdown(); } catch {}
    process.exit(0);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
