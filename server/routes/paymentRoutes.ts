import type { Express } from "express";
import { storage } from "../storage/index";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

export async function registerPaymentRoutes(app: Express) {
  app.post("/api/create-subscription", async (req, res) => {
    try {
      console.log('[Subscription] Received subscription request');
      const { firebaseId, paymentMethodId } = req.body;
      console.log('[Subscription] Processing payment for:', { firebaseId, paymentMethodId });

      let user = await storage.getUserByFirebaseId(firebaseId);

      if (!user) {
        console.error('[Subscription] User not found:', firebaseId);
        return res.status(400).json({ error: "User not found" });
      }

      if (!user.stripeCustomerId) {
        console.log('[Subscription] Creating new Stripe customer');
        const customer = await stripe.customers.create({
          email: user.email,
          payment_method: paymentMethodId,
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
          metadata: {
            firebaseId: user.firebaseId,
          }
        });
        console.log('[Subscription] Created new Stripe customer:', customer.id);
        user = await storage.updateUser(firebaseId, {
          stripeCustomerId: customer.id
        });
      }

      // Attach the payment method if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId!,
        });
      } catch (err) {
        const error = err as Error;
        if (!error.message?.includes('already been attached')) {
          throw err;
        }
        console.log('[Subscription] Payment method already attached, continuing');
      }

      // Set as default payment method
      await stripe.customers.update(user.stripeCustomerId!, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      console.log('[Subscription] Creating subscription with price:', process.env.STRIPE_PRICE_ID_PRO);
      // Create the subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId!,
        items: [{ price: process.env.STRIPE_PRICE_ID_PRO }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          firebaseId: user.firebaseId
        },
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        }
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

      // Add subscription ID to payment intent metadata
      await stripe.paymentIntents.update(payment_intent.id, {
        metadata: {
          subscriptionId: subscription.id
        }
      });

      res.json({
        subscriptionId: subscription.id,
        clientSecret: payment_intent.client_secret,
        status: subscription.status
      });
    } catch (error) {
      console.error('[Subscription] Error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        console.error('[Subscription] Stripe error:', error.message);
        res.status(400).json({ error: error.message });
      } else {
        const err = error as Error;
        console.error('[Subscription] Server error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
      }
    }
  });

  app.post("/api/downgrade-subscription", async (req, res) => {
    try {
      const { firebaseId } = req.body;

      const user = await storage.getUserByFirebaseId(firebaseId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.stripeCustomerId) {
        // Cancel all active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
        });

        for (const subscription of subscriptions.data) {
          await stripe.subscriptions.cancel(subscription.id);
        }
      }

      // Update user's subscription type to free
      await storage.updateUser(firebaseId, {
        subscriptionType: 'free'
      });

      res.json({ message: "Subscription downgraded successfully" });
    } catch (error) {
      console.error("Error downgrading subscription:", error);
      res.status(500).json({ error: "Failed to downgrade subscription" });
    }
  });

  app.get("/api/payment-methods/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await storage.getUserByFirebaseId(userId);

      if (!user?.stripeCustomerId) {
        return res.json({ paymentMethods: [] });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        card: {
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
        }
      }));

      res.json({ paymentMethods: formattedMethods });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ error: "Failed to fetch payment methods" });
    }
  });

  app.delete("/api/payment-methods/:paymentMethodId", async (req, res) => {
    try {
      const { paymentMethodId } = req.params;
      await stripe.paymentMethods.detach(paymentMethodId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ error: "Failed to delete payment method" });
    }
  });

  app.post("/api/setup-payment-method", async (req, res) => {
    try {
      const { firebaseId } = req.body;
      const user = await storage.getUserByFirebaseId(firebaseId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "User not found or no Stripe customer" });
      }

      const intent = await stripe.setupIntents.create({
        customer: user.stripeCustomerId,
        payment_method_types: ['card'],
      });

      res.json({
        client_secret: intent.client_secret,
      });
    } catch (error) {
      console.error("Error creating setup intent:", error);
      res.status(500).json({ error: "Failed to create setup intent" });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = 'usd', paymentMethodId, firebaseId } = req.body;

      const user = await storage.getUserByFirebaseId(firebaseId);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "User not found or no Stripe customer" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: user.stripeCustomerId,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        return_url: `${req.headers.origin}/dashboard`,
      });

      res.json({
        client_secret: paymentIntent.client_secret,
        status: paymentIntent.status,
      });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });
}