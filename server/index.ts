import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import { PostHog, setupExpressErrorHandler } from "posthog-node";
import { registerRoutes } from "./routes";
import { registerWebhookRoutes } from "./routes/webhookRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { sanitizeInputs } from "./middleware/sanitize";

const app = express();

// Initialize PostHog
const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST,
  enableExceptionAutocapture: true,
});

(async () => {
  // Security headers with Helmet
  app.use(
    helmet({
      // Additional security in production
      ...(process.env.NODE_ENV === "production" && {
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        permittedCrossDomainPolicies: false,
        dnsPrefetchControl: { allow: false },
      }),
      // XSS Protection headers
      crossOriginResourcePolicy: { policy: "cross-origin" },
      xXssProtection: true,
      noSniff: true,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'", // Required for styled-components and some CSS-in-JS
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'", // Required for Vite development mode
            "https://js.stripe.com", // Required for Stripe.js
            "https://apis.google.com", // Required for Google Sign-in
            "https://accounts.google.com", // Required for Google Sign-in
            "https://us-assets.i.posthog.com", // Required for PostHog scripts
          ],
          connectSrc: [
            "'self'",
            "https://api.stripe.com", // Required for Stripe API calls
            "https://firebasestorage.googleapis.com", // Required for Firebase Storage
            "https://identitytoolkit.googleapis.com", // Required for Firebase Auth
            "https://securetoken.googleapis.com", // Required for Firebase Auth
            "https://accounts.google.com", // Required for Google Sign-in
            "https://www.googleapis.com", // Required for Google APIs
            "https://*.firebaseapp.com", // Required for Firebase Auth domain
            "https://us.i.posthog.com", // Required for PostHog API
            "https://us-assets.i.posthog.com", // Required for PostHog assets
            "https://*.posthog.com", // Required for PostHog subdomains
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://firebasestorage.googleapis.com",
            "https://*.googleusercontent.com", // Required for Google profile images
          ],
          frameSrc: [
            "https://js.stripe.com", // Required for Stripe Elements
            "https://accounts.google.com", // Required for Google Sign-in popup
            "https://*.firebaseapp.com", // Required for Firebase Auth
          ],
        },
      },
      crossOriginOpenerPolicy: { policy: "unsafe-none" }, // Allow popups for Firebase auth
      crossOriginEmbedderPolicy: false, // Disabled to allow Firebase popup authentication
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // IMPORTANT: Add raw body parsing specifically for webhook endpoint BEFORE express.json()
  // This ensures Stripe webhooks receive raw body for signature verification
  app.use("/api/webhook", express.raw({ type: "application/json" }));

  // IMPORTANT: Register webhook routes BEFORE express.json() middleware
  // This ensures Stripe webhooks receive raw body for signature verification
  await registerWebhookRoutes(app);

  // Rate limiting middleware
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Higher limit for this template - 500 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      retryAfter: 15 * 60, // 15 minutes in seconds
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip rate limiting for webhooks and health checks
    skip: (req) => {
      return req.path.startsWith("/api/webhook") || req.path === "/health";
    },
  });

  // Apply rate limiting to API routes
  app.use("/api", limiter);

  // CORS configuration
  app.use(
    cors({
      origin:
        process.env.NODE_ENV === "production"
          ? [
              process.env.FRONTEND_URL,
              `https://${process.env.REPL_SLUG}-${process.env.REPL_OWNER}.replit.app`,
            ].filter(Boolean) // Remove any undefined values
          : [
              "http://localhost:5173",
              "http://localhost:5000",
              "http://127.0.0.1:5173",
            ], // Multiple dev origins in development
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400, // Cache preflight requests for 24 hours
    }),
  );

  // Now apply global JSON parsing middleware for all other routes
  app.use(express.json({ limit: "10mb" })); // Set body size limit
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  // Apply XSS sanitization to all API routes (except webhooks)
  app.use("/api", (req, res, next) => {
    // Skip sanitization for webhook endpoints as they need raw data for signature verification
    if (req.path.startsWith("/webhook")) {
      return next();
    }
    sanitizeInputs(req, res, next);
  });

  // Setup PostHog Express error handler
  setupExpressErrorHandler(posthog, app);

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          log(logLine);
          // Only log response bodies in development for security
          if (process.env.NODE_ENV !== "production") {
            log(`Response: ${JSON.stringify(capturedJsonResponse, null, 2)}`);
          }
        } else {
          log(logLine);
        }
      }
    });

    next();
  });

  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Error:", err);
    const status = err.status || err.statusCode || 500;

    // Sanitize error message for production
    const message =
      process.env.NODE_ENV === "production"
        ? getProductionErrorMessage(status)
        : err.message || "Internal Server Error";

    // Handle authentication errors specially
    if (err.code && err.code.startsWith("auth/")) {
      return res.status(401).json({
        error: message,
        code: err.code,
      });
    }

    // Handle authorization errors
    if (status === 403) {
      return res.status(403).json({
        error: message,
        code: "auth/access-denied",
      });
    }

    // Handle validation errors
    if (err.name === "ZodError") {
      return res.status(400).json({
        error: "Validation failed",
        details:
          err.errors?.map((e: any) => `${e.path.join(".")}: ${e.message}`) ||
          [],
      });
    }

    // Handle multer errors (file upload)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "File too large",
      });
    }

    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected file field",
      });
    }

    res.status(status).json({ error: message });
  });

  // Helper function to get sanitized error messages for production
  function getProductionErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return "Bad Request";
      case 401:
        return "Unauthorized";
      case 403:
        return "Forbidden";
      case 404:
        return "Not Found";
      case 409:
        return "Conflict";
      case 413:
        return "Payload Too Large";
      case 429:
        return "Too Many Requests";
      case 500:
      default:
        return "Internal Server Error";
    }
  }

  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    console.error("Uncaught Exception:", error);
    await posthog.shutdown();
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", async (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    await posthog.shutdown();
  });

  // Handle process termination
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down gracefully");
    await posthog.shutdown();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down gracefully");
    await posthog.shutdown();
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const PORT = parseInt(process.env.PORT || "5000", 10);

  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
