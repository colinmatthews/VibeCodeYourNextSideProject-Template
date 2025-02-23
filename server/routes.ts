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
  app.post("/api/users", async (req, res) => {
    try {
      const user = insertUserSchema.parse(req.body);
      
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          firebaseId: user.firebaseId
        }
      });
      
      // Create user with Stripe customer ID
      const created = await storage.createUser({
        ...user,
        stripeCustomerId: customer.id
      });
      
      res.json(created);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(400).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:firebaseId", async (req, res) => {
    try {
      const { firstName, lastName } = req.body;
      const user = await storage.updateUser(req.params.firebaseId, { firstName, lastName });
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
        return res.status(403).json({ error: "Contact limit reached. Please upgrade to Pro plan." });
      }
      
      const created = await storage.createContact({ ...contact, userId });

      console.log("y", created);
      // Send email notification
      const userForEmail = await storage.getUser(userId);
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
      res
        .status(400)
        .json({ 
          error: "Invalid contact data", 
          errorDetails: error.message, 
          file: error.filename || 'unknown', 
          stack: error.stack || 'No stack trace available'
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
