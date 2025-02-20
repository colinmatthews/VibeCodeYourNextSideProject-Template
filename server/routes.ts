import type { Express } from "express";
import { createServer } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertContactSchema, insertUserSchema } from "@shared/schema";
import { sendEmail } from "./mail";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as const, // Fix the API version type
});

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const user = insertUserSchema.parse(req.body);
      const created = await storage.createUser(user);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Contact routes
  app.get("/api/contacts", async (req, res) => {
    const userId = Number(req.query.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const contacts = await storage.getContactsByUserId(userId);
    res.json(contacts);
  });

  app.post("/api/contacts", async (req, res) => {
    try {
      console.log("Server: Received contact submission with raw userId:", req.body.userId);
      const contact = insertContactSchema.parse(req.body);
      const userId = Number(req.body.userId);
      console.log("Server: Parsed userId:", userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const created = await storage.createContact({ ...contact, userId });

      // Send email notification
      const user = await storage.getUser(userId);
      if (user) {
        await sendEmail({
          to: user.email,
          from: "noreply@contactmanager.com",
          subject: "New Contact Added",
          text: `A new contact ${contact.firstName} ${contact.lastName} has been added to your contacts.`,
        });
      }

      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Invalid contact data" });
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
      res.status(400).json({ error: "Invalid contact data" });
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