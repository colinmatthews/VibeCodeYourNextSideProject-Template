import type { Express, Request, Response } from "express";
import { storage } from "../storage/index";
import Stripe from "stripe";
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Fulfillment helper function for checkout sessions
async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const firebaseId = session.metadata?.firebaseId;
  if (!firebaseId) {
    console.error('[Webhook] No firebase ID in session metadata');
    return;
  }

  try {
    // Handle subscription completion
    if (session.mode === 'subscription' && session.subscription) {
      // Update user subscription status
      await storage.updateUser(firebaseId, {
        subscriptionType: 'pro'
      });
      
      // Optional: Send confirmation email, update user permissions, etc.
      // await sendSubscriptionConfirmationEmail(firebaseId);
      
    } else if (session.mode === 'payment' && session.payment_intent) {
      // Handle one-time payment fulfillment
      // You can add custom logic here based on what was purchased
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });
      
      // Optional: Process specific products, send digital goods, etc.
      // await processOneTimePayment(firebaseId, lineItems);
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
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      if (!endpointSecret) {
        console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured!');
        throw new Error('Webhook secret not configured');
      }
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err) {
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
            await fulfillCheckoutSession(checkoutSession);
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
          
          const firebaseIdFromSub = updatedSubscription.metadata.firebaseId;
          if (firebaseIdFromSub) {
            // Handle subscription status changes
            if (updatedSubscription.status === 'active') {
              await storage.updateUser(firebaseIdFromSub, {
                subscriptionType: 'pro'
              });
            } else if (['canceled', 'unpaid', 'past_due'].includes(updatedSubscription.status)) {
              await storage.updateUser(firebaseIdFromSub, {
                subscriptionType: 'free'
              });
            }
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          const firebaseIdFromDeleted = deletedSubscription.metadata.firebaseId;
          if (firebaseIdFromDeleted) {
            await storage.updateUser(firebaseIdFromDeleted, {
              subscriptionType: 'free'
            });
          }
          break;

        // Invoice events (for subscription billing)
        case 'invoice.payment_succeeded':
          const paidInvoice = event.data.object as Stripe.Invoice;
          
          // Ensure subscription is marked as active
          if (paidInvoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(paidInvoice.subscription as string);
            const firebaseIdFromInvoice = subscription.metadata.firebaseId;
            
            if (firebaseIdFromInvoice) {
              await storage.updateUser(firebaseIdFromInvoice, {
                subscriptionType: 'pro'
              });
            }
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          console.log('[Webhook] Invoice payment failed:', failedInvoice.id);
          
          // Optional: Handle failed invoice payments (send notification, etc.)
          if (failedInvoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(failedInvoice.subscription as string);
            const firebaseIdFromFailedInvoice = subscription.metadata.firebaseId;
            
            if (firebaseIdFromFailedInvoice) {
              // Don't immediately downgrade - Stripe will retry payment
              console.log('[Webhook] Invoice payment failed for user:', firebaseIdFromFailedInvoice);
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