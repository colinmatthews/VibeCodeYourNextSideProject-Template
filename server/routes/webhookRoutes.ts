import type { Express, Request, Response } from "express";
import { storage } from "../storage/index";
import Stripe from "stripe";
import express from 'express';
import { logSecurity } from '../lib/audit';
import { getStripeClient } from '../lib/stripe';

// Read endpoint secret at request time to allow for testing

// Fulfillment helper function for checkout sessions
async function fulfillCheckoutSession(session: Stripe.Checkout.Session, stripe: Stripe) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('[Webhook] No user ID in session metadata');
    return;
  }

  try {
    // Handle subscription completion
    if (session.mode === 'subscription' && session.subscription) {
      // Update user subscription status
      await storage.updateUser(userId, {
        subscriptionType: 'pro'
      });
      
      // Optional: Send confirmation email, update user permissions, etc.
      // await sendSubscriptionConfirmationEmail(userId);
      
    } else if (session.mode === 'payment' && session.payment_intent) {
      // Handle one-time payment fulfillment
      // You can add custom logic here based on what was purchased
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });
      
      // Optional: Process specific products, send digital goods, etc.
      // await processOneTimePayment(userId, lineItems);
    }
    
  } catch (error) {
    console.error('[Webhook] Error fulfilling checkout session:', error);
    throw error;
  }
}

export async function registerWebhookRoutes(app: Express) {
  // Raw body parsing for Stripe webhooks is now handled at top level
  // before global express.json() middleware

  // Stripe webhook handler
  app.post('/api/webhook', async (req: Request, res: Response) => {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Payments service not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!endpointSecret) {
        console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured!');
        throw new Error('Webhook secret not configured');
      }
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
      logSecurity('webhook_signature_failed', {
        provider: 'stripe',
        reason: (err as Error)?.message,
        hasSignature: Boolean(sig),
        path: '/api/webhook'
      });
      console.log('[Webhook] Signature verification failed:', (err as Error).message);
      return res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        // New Checkout Session events
        case 'checkout.session.completed':
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          
          // Only fulfill if payment was successful
          if (checkoutSession.payment_status === 'paid') {
            await fulfillCheckoutSession(checkoutSession, stripe);
          }
          break;

        case 'checkout.session.expired':
          const expiredSession = event.data.object as Stripe.Checkout.Session;
          console.log('[Webhook] Checkout session expired:', expiredSession.id);
          // Optional: Handle expired sessions (analytics, follow-up emails, etc.)
          break;

        // Subscription lifecycle events
        case 'customer.subscription.created':
          const newSubscription = event.data.object as Stripe.Subscription;
          console.log('[Webhook] Subscription created:', newSubscription.id);
          // Note: For checkout sessions, fulfillment is handled in checkout.session.completed
          break;

        case 'customer.subscription.updated':
          const updatedSubscription = event.data.object as Stripe.Subscription;
          
          const userIdFromSub = updatedSubscription.metadata.userId;
          if (userIdFromSub) {
            // Handle subscription status changes
            if (updatedSubscription.status === 'active') {
              await storage.updateUser(userIdFromSub, {
                subscriptionType: 'pro'
              });
            } else if (['canceled', 'unpaid', 'past_due'].includes(updatedSubscription.status)) {
              await storage.updateUser(userIdFromSub, {
                subscriptionType: 'free'
              });
            }
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          const userIdFromDeleted = deletedSubscription.metadata.userId;
          if (userIdFromDeleted) {
            await storage.updateUser(userIdFromDeleted, {
              subscriptionType: 'free'
            });
          }
          break;

        // Invoice events (for subscription billing)
        case 'invoice.payment_succeeded':
          // Note: Stripe v19 types don't include subscription property, but it exists at runtime
          const paidInvoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };

          // Ensure subscription is marked as active
          if (paidInvoice.subscription && typeof paidInvoice.subscription === 'string') {
            const subscription = await stripe.subscriptions.retrieve(paidInvoice.subscription);
            const userIdFromInvoice = subscription.metadata.userId;

            if (userIdFromInvoice) {
              await storage.updateUser(userIdFromInvoice, {
                subscriptionType: 'pro'
              });
            }
          }
          break;

        case 'invoice.payment_failed':
          // Note: Stripe v19 types don't include subscription property, but it exists at runtime
          const failedInvoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null };
          console.log('[Webhook] Invoice payment failed:', failedInvoice.id);

          // Optional: Handle failed invoice payments (send notification, etc.)
          if (failedInvoice.subscription && typeof failedInvoice.subscription === 'string') {
            const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription);
            const userIdFromFailedInvoice = subscription.metadata.userId;

            if (userIdFromFailedInvoice) {
              // Don't immediately downgrade - Stripe will retry payment
              console.log('[Webhook] Invoice payment failed for user:', userIdFromFailedInvoice);
            }
          }
          break;

        default:
          // Silently ignore unhandled events
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Webhook] Error processing event:', err);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
}
