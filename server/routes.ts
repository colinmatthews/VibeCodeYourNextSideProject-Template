import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertContactSchema, insertUserSchema } from "@shared/schema";
import { sendEmail } from "./mail";
import Stripe from "stripe";
import { create } from "domain";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as const, // Fix the API version type
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // User routes
  // Check and create Stripe customer if needed
  app.post("/api/users/ensure-stripe", async (req, res) => {
    try {
      const { firebaseId, email } = req.body;
      console.log("[Stripe] Received ensure-stripe request", { firebaseId, email });

      let stripeCustomerId;
      let customer;
      const existingUser = await storage.getUserByFirebaseId(firebaseId);
      console.log("[User] Checking existing user by Firebase ID:", {
        id: existingUser?.id,
        email: existingUser?.email,
        firebaseId: existingUser?.firebaseId
      });

      if (!existingUser) {
        console.log("[Stripe] Creating new Stripe customer");
        customer = await stripe.customers.create({
          email,
          metadata: { firebaseId }
        });
        stripeCustomerId = customer.id;

        console.log("[User] Creating new user in database");
        const newUser = await storage.createUser({
          firebaseId,
          email,
          stripeCustomerId,
          subscriptionType: "free"
        });
        console.log("[User] Created new user with Stripe customer:", {
          userId: newUser.id,
          stripeCustomerId
        });

        return res.json({ stripeCustomerId });
      }

      // Handle existing user
      if (existingUser.stripeCustomerId) {
        console.log("[Stripe] Using existing Stripe customer ID:", existingUser.stripeCustomerId);
        stripeCustomerId = existingUser.stripeCustomerId;
      } else {
        console.log("[Stripe] Creating new Stripe customer");
        customer = await stripe.customers.create({
          email,
          metadata: {
            firebaseId,
          },
        });
        stripeCustomerId = customer.id;
        console.log("[Stripe] Created new customer:", {
          customerId: stripeCustomerId,
          email: customer.email,
          metadata: customer.metadata
        });
      }

      // If user doesn't exist in our database, create them
      if (!existingUser) {
        console.log("[Database] Creating new user");
        const newUser = await storage.createUser({
          firebaseId,
          email,
          stripeCustomerId,
          isPremium: false,
          firstName: "",
          lastName: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          subscriptionType: "free"
        });
        console.log("[Database] Created new user:", newUser);
        return res.json({ stripeCustomerId });
      }

      return res.json({ stripeCustomerId });
    } catch (error) {
      console.error("Error ensuring Stripe customer:", error);
      res.status(500).json({ error: "Failed to ensure Stripe customer" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const user = insertUserSchema.parse(req.body);
      const fullName = `${user.firstName} ${user.lastName}`;

      // Check if user exists by firebase ID or email
      const [existingUserById, existingUserByEmail] = await Promise.all([
        storage.getUserByFirebaseId(user.firebaseId),
        storage.getUserByEmail(user.email)
      ]);

      if (existingUserById) {
        return res.json(existingUserById);
      }

      if (existingUserByEmail) {
        return res.json(existingUserByEmail);
      }

      // Create new user
      const customer = await stripe.customers.create({
        email: user.email,
        name: fullName,
        metadata: {
          firebaseId: user.firebaseId,
        },
        shipping: {
          name: fullName,
          address: {
            line1: user.address,
            city: user.city,
            state: user.state,
            postal_code: user.postalCode,
            country: 'US'
          }
        },
        address: {
          line1: user.address,
          city: user.city,
          state: user.state,
          postal_code: user.postalCode,
          country: 'US'
        }
      });

      // Create user with Stripe customer ID
      const created = await storage.createUser({
        ...user,
        stripeCustomerId: customer.id,
        isPremium: false,
      });

      res.json(created);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof Stripe.errors.StripeError) {
        res.status(400).json({ error: "Payment service error" });
      } else {
        res.status(400).json({ error: "Failed to create user" });
      }
    }
  });

  app.patch("/api/users/:firebaseId", async (req, res) => {
    try {
      const { firstName, lastName, emailNotifications } = req.body;
      console.log("[Debug] PATCH request for user:", {
        firebaseId: req.params.firebaseId,
        emailNotifications
      });
      
      const user = await storage.getUserByFirebaseId(req.params.firebaseId);
      console.log("[Debug] Found user:", {
        id: user?.id,
        email: user?.email,
        emailNotifications: user?.emailNotifications
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const updatedUser = await storage.updateUser(user.id, {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(emailNotifications !== undefined && { emailNotifications }),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ error: "Failed to update user profile" });
    }
  });

  // Add this route near the other user routes
  app.get("/api/users/:firebaseId", async (req, res) => {
    try {
      console.log("[Debug] Fetching user data for firebaseId:", req.params.firebaseId);
      const user = await storage.getUserByFirebaseId(req.params.firebaseId);
      console.log("[Debug] User data from database:", { 
        id: user?.id,
        email: user?.email,
        subscriptionType: user?.subscriptionType 
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        email: user.email,
        subscriptionType: user.subscriptionType,
        firstName: user.firstName,
        lastName: user.lastName
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });


  // Item routes
  app.get("/api/items", async (req, res) => {
    const userId = req.query.userId?.toString();
    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    try {
      const items = await storage.getItemsByUserId(userId);
      res.json(items || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.json([]);
    }
  });

  app.post("/api/items", async (req, res) => {
    try {
      console.log("Server: Received item data:", req.body);
      const { userId, item } = req.body;
      console.log("Server: Parsed userId:", userId);
      if (!userId) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const userForPremiumCheck = await storage.getUserByFirebaseId(userId);
      const items = await storage.getItemsByUserId(userId);

      if (!userForPremiumCheck?.subscriptionType?.includes('pro') && items.length >= 5) {
        return res.status(403).json({
          error: "Item limit reached. Please upgrade to Pro plan.",
        });
      }

      const created = await storage.createItem({ userId, item });
      res.json(created);
    } catch (error) {
      res.status(400).json({
        error: "Invalid item data",
        errorDetails: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }
    await storage.deleteItem(id);
    res.status(204).send();
  });

  // Payment routes
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
        console.log('[Subscription] Updated user with Stripe customer ID:', user.stripeCustomerId);
      }

      // Attach the payment method if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
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
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription'
        }
      });
      console.log('[Subscription] Created subscription:', subscription.id);

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

      // Immediately update the subscription type to 'pro'
      await storage.updateUser(firebaseId, {
        subscriptionType: 'pro'
      });
      console.log('[Subscription] Updated user subscription to pro');

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

  // Add the following route after the create-subscription endpoint
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

      res.json({ success: true });
    } catch (error) {
      console.error('[Subscription] Downgrade Error:', error);
      res.status(500).json({
        error: error instanceof Stripe.errors.StripeError
          ? error.message
          : 'Failed to downgrade subscription'
      });
    }
  });

  app.get("/api/payment-methods", async (req, res) => {
    try {
      const { firebaseId } = req.query;
      const user = await storage.getUserByFirebaseId(firebaseId as string);

      if (!user?.stripeCustomerId) {
        return res.json({ paymentMethods: [] });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });

      res.json({ paymentMethods: paymentMethods.data });
    } catch (error) {
      console.error('[PaymentMethods] Error:', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  app.delete("/api/payment-methods/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { firebaseId } = req.body;

      const user = await storage.getUserByFirebaseId(firebaseId);
      if (!user?.stripeCustomerId) {
        return res.status(404).json({ error: 'User not found' });
      }

      await stripe.paymentMethods.detach(id);

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[PaymentMethods] Delete Error:', error);
      res.status(500).json({ error: 'Failed to delete payment method' });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    const { amount } = z.object({ amount: z.number() }).parse(req.body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  });

  app.post("/api/setup-intent", async (req, res) => {
    try {
      console.log('[SetupIntent] Creating setup intent');
      const { firebaseId } = req.body;

      // Get user from database
      const user = await storage.getUserByFirebaseId(firebaseId);
      if (!user) {
        console.error('[SetupIntent] User not found:', firebaseId);
        return res.status(404).json({ error: 'User not found' });
      }
      console.log('[SetupIntent] Found user:', { id: user.id, email: user.email });

      // Create or get customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        console.log('[SetupIntent] Creating new Stripe customer');
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { firebaseId }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(firebaseId, customerId);
        console.log('[SetupIntent] Created customer:', customerId);
      }

      // Create setup intent
      console.log('[SetupIntent] Creating setup intent for customer:', customerId);
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
      console.log('[SetupIntent] Created setup intent:', setupIntent.id);

      res.json({ clientSecret: setupIntent.client_secret });
    } catch (error) {
      console.error('[SetupIntent] Error:', error);
      res.status(500).json({ error: 'Failed to create setup intent' });
    }
  });

  return server;
}