import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import Stripe from "stripe";
import { buffer } from "micro";
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function registerWebhookRoutes(app: Express) {
  // Add raw body parsing for Stripe webhooks
  app.use('/api/webhook', express.raw({ type: 'application/json' }));

  // Stripe webhook handler
  app.post('/api/webhook', async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;

    try {
      const rawBody = await buffer(req);
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig as string,
        endpointSecret as string
      );
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err);
      return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    try {
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          console.log('[Webhook] Payment succeeded:', paymentIntent.id);

          // Get the subscription ID from metadata
          const subscriptionId = paymentIntent.metadata.subscriptionId;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const firebaseId = subscription.metadata.firebaseId;

            if (firebaseId) {
              // Update user subscription status
              await storage.updateUser(firebaseId, {
                subscriptionType: 'pro'
              });
              console.log('[Webhook] Updated user subscription to pro:', firebaseId);
            }
          }
          break;

        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object as Stripe.PaymentIntent;
          console.log('[Webhook] Payment failed:', failedPayment.id);

          // Handle failed payment (optional: notify user or take other actions)
          break;

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Webhook] Error processing event:', err);
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  });
}