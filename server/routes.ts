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
          firstName: "",
          lastName: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
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
      const fullName = `${user.firstName} ${user.lastName}`.trim();

      // Create Stripe customer with shipping and billing address
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
      const { firstName, lastName } = req.body;
      const user = await storage.updateUser(req.params.firebaseId, {
        firstName,
        lastName,
      });
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: "Failed to update user profile" });
    }
  });

  // Contact routes
  app.get("/api/contacts", async (req, res) => {
    const userId = req.query.userId?.toString();
    if (!userId) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    try {
      const contacts = await storage.getContactsByUserId(userId);
      res.json(contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.json([]);
    }
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      console.log("Server: Received full contact data:", req.body);
      const contact = insertContactSchema.parse(req.body);
      const userId = req.body.userId?.toString();
      console.log("Server: Parsed userId:", userId);
      if (!userId) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      console.log("x");
      const userForPremiumCheck = await storage.getUserByFirebaseId(userId);
      const contacts = await storage.getContactsByUserId(userId);

      if (!userForPremiumCheck?.isPremium && contacts.length >= 5) {
        return res.status(403).json({
          error: "Contact limit reached. Please upgrade to Pro plan.",
        });
      }

      const created = await storage.createContact({ ...contact, userId });

      console.log("y", created);
      // Send email notification
      const userForEmail = await storage.getUserByFirebaseId(userId);
      console.log("z", created);
      if (userForEmail) {
        await sendEmail({
          to: user.email,
          from: "noreply@contactmanager.com",
          subject: "New Contact Added",
          text: `A new contact ${contact.firstName} ${contact.lastName} has been added to your contacts.`,
        });
        console.log("a", created);
      }

      console.log("b", created);
      res.json(created);
    } catch (error) {
      res.status(400).json({
        error: "Invalid contact data",
        errorDetails: error.message,
        file: error.filename || "unknown",
        stack: error.stack || "No stack trace available",
      });
    }
  });

  app.patch("/api/contacts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    try {
      const contact = insertContactSchema.partial().parse(req.body);
      const updated = await storage.updateContact(id, contact);
      res.json(updated);
    } catch (error) {
      res.status(400).json({
        error: "Invalid PATCH contact data",
        errorDetails: error.message,
      });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid contact ID" });
    }
    await storage.deleteContact(id);
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
      console.log('[Subscription] Found user:', { 
        id: user.id,
        email: user.email,
        firebaseId: user.firebaseId,
        subscriptionType: user.subscriptionType,
        stripeCustomerId: user.stripeCustomerId
      });

      // If no Stripe customer exists, create one
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
        user = await storage.updateUserStripeCustomerId(user.id, customer.id);
        console.log('[Subscription] Updated user with Stripe customer ID:', user.stripeCustomerId);
      }

      try {
        // Try to attach the payment method, ignore if already attached
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: user.stripeCustomerId,
        });
      } catch (error) {
        if (!error.message.includes('already been attached')) {
          throw error;
        }
        console.log('[Subscription] Payment method already attached, continuing');
      }

      // Set as default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      console.log('[Subscription] Creating subscription with params:', {
        customer: user.stripeCustomerId,
        priceId: process.env.STRIPE_PRICE_ID_PRO,
        paymentMethodId: paymentMethodId
      });

      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: process.env.STRIPE_PRICE_ID_PRO }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        default_payment_method: paymentMethodId,
      });

      console.log('[Subscription] Full subscription response:', {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        defaultPaymentMethod: subscription.default_payment_method,
        latestInvoiceId: subscription.latest_invoice,
        customerId: subscription.customer
      });

      if (subscription.status === 'incomplete') {
        console.log('[Subscription] Incomplete status details:', {
          latestInvoice: subscription.latest_invoice,
          paymentIntent: (subscription.latest_invoice as Stripe.Invoice).payment_intent
        });
        return res.status(500).json({ 
          error: "Subscription creation incomplete. Please contact support." 
        });
      }

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

      if (subscription.status === 'active') {
        await storage.updateUserSubscription(user.id, 'pro');
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: payment_intent.client_secret
      });
    } catch (error) {
      console.error('[Subscription] Error:', error);
      if (error instanceof Stripe.errors.StripeError) {
        console.error('[Subscription] Stripe error:', error.message);
        res.status(400).json({ error: error.message });
      } else {
        console.error('[Subscription] Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
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

  app.post("/api/create-payment-intent", async (req, res) => {
    const { amount } = z.object({ amount: z.number() }).parse(req.body);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  });

  return server;
}
