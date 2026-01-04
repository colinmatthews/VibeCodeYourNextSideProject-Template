import type { Express } from "express";
import { storage } from "../storage/index";
import Stripe from "stripe";
import { isAuthenticated } from "../replit_integrations/auth";
import { AuthenticatedRequest, getUserId } from "../middleware/auth";
import { getStripeClient } from "../lib/stripe";

export async function registerPaymentRoutes(app: Express) {
  // New Stripe Checkout endpoint - replaces complex payment method flow
  app.post("/api/create-checkout-session", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: 'Payments service not configured' });
      }

      console.log('[Checkout] Creating checkout session');
      const { mode = 'subscription', priceId, successUrl, cancelUrl } = req.body;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      let user = await storage.getUserById(userId);
      if (!user) {
        console.error('[Checkout] User not found:', userId);
        return res.status(400).json({ error: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        console.log('[Checkout] Creating new Stripe customer');
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: {
            userId: user.id,
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(userId, {
          stripeCustomerId: customerId
        });
        console.log('[Checkout] Created new Stripe customer:', customerId);
      }

      // Determine price ID - use provided priceId or default to PRO subscription
      const sessionPriceId = priceId || process.env.STRIPE_PRICE_ID_PRO;
      if (!sessionPriceId) {
        return res.status(400).json({ error: "Price ID not configured" });
      }

      // Create checkout session
      // Limit redirects to trusted origins in production; be permissive in tests/dev
      const isProd = process.env.NODE_ENV === 'production';
      const port = process.env.PORT || '5000';
      const allowedOrigins = isProd
        ? [process.env.FRONTEND_URL].filter(Boolean) as string[]
        : [`http://localhost:${port}`, 'http://localhost:5173', 'http://127.0.0.1:5173'];

      const isAllowed = (url: string | undefined): url is string => {
        if (!url) return false;
        if (!isProd) {
          // In non-prod, accept any well-formed URL to ease testing
          try { new URL(url); return true; } catch { return false; }
        }
        try {
          const origin = new URL(url).origin;
          return allowedOrigins.some(o => !!o && origin === new URL(o).origin);
        } catch {
          return false;
        }
      };

      const defaultSuccess = `${allowedOrigins[0] || (req.headers.origin as string) || ''}/?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const defaultCancel = `${allowedOrigins[0] || (req.headers.origin as string) || ''}/pricing?canceled=true`;

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        line_items: [
          {
            price: sessionPriceId,
            quantity: 1,
          },
        ],
        mode: mode as 'subscription' | 'payment',
        success_url: isAllowed(successUrl) ? successUrl : defaultSuccess,
        cancel_url: isAllowed(cancelUrl) ? cancelUrl : defaultCancel,
        metadata: {
          userId: user.id,
        },
        // Allow promotion codes
        allow_promotion_codes: true,
        // Collect billing address for tax calculations
        billing_address_collection: 'required',
        // Enable automatic tax calculation
        automatic_tax: { enabled: false },
      };

      // For subscriptions, add subscription-specific settings
      if (mode === 'subscription') {
        sessionParams.subscription_data = {
          metadata: {
            userId: user.id,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      console.log('[Checkout] Created checkout session:', session.id);
      
      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error) {
      console.error('[Checkout] Error creating checkout session:', error);
      if (error instanceof Stripe.errors.StripeError) {
        res.status(400).json({ error: error.message });
      } else {
        const err = error as Error;
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
    }
  });

  // Create Stripe Customer Portal session for subscription management
  app.post('/api/create-portal-session', isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: 'Payments service not configured' });
      }

      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Get user data to find their Stripe customer ID
      const user = await storage.getUserById(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: 'Customer not found or no Stripe customer ID' });
      }

      // Create portal session
      const port = process.env.PORT || '5000';
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL || `http://localhost:${port}`}/`,
      });

      res.json({ url: portalSession.url });
    } catch (error) {
      console.error('[Portal] Error creating portal session:', error);
      
      // Pass through specific Stripe errors
      if (error instanceof Stripe.errors.StripeError) {
        return res.status(400).json({ 
          error: error.message,
          type: error.type
        });
      }
      
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  });
}
