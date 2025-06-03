import type { Express } from "express";
import { storage } from "../storage/index";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

export async function registerPaymentRoutes(app: Express) {
  // New Stripe Checkout endpoint - replaces complex payment method flow
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      console.log('[Checkout] Creating checkout session');
      const { firebaseId, mode = 'subscription', priceId, successUrl, cancelUrl } = req.body;
      
      if (!firebaseId) {
        return res.status(400).json({ error: "Firebase ID is required" });
      }

      let user = await storage.getUserByFirebaseId(firebaseId);
      if (!user) {
        console.error('[Checkout] User not found:', firebaseId);
        return res.status(400).json({ error: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        console.log('[Checkout] Creating new Stripe customer');
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            firebaseId: user.firebaseId,
          }
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(firebaseId, {
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
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        line_items: [
          {
            price: sessionPriceId,
            quantity: 1,
          },
        ],
        mode: mode as 'subscription' | 'payment',
        success_url: successUrl || `${req.headers.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${req.headers.origin}/pricing?canceled=true`,
        metadata: {
          firebaseId: user.firebaseId,
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
            firebaseId: user.firebaseId,
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
  app.post('/api/create-portal-session', async (req, res) => {
    const { firebaseId } = req.body;

    if (!firebaseId) {
      return res.status(400).json({ error: 'Firebase ID is required' });
    }

    try {
      // Get user data to find their Stripe customer ID
      const user = await storage.getUserByFirebaseId(firebaseId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({ error: 'Customer not found or no Stripe customer ID' });
      }

      // Create portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard`,
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