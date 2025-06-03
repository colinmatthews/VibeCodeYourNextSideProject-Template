import type { Express } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

export async function registerUserRoutes(app: Express) {
  // Check and create Stripe customer if needed
  app.post("/api/users/ensure-stripe", async (req, res) => {
    try {
      const { firebaseId, email } = req.body;
      console.log("[Stripe] Received ensure-stripe request", { firebaseId, email });

      let stripeCustomerId;
      let customer;
      const existingUser = await storage.getUserByFirebaseId(firebaseId);
      console.log("[User] Checking existing user by Firebase ID:", {
        firebaseId: existingUser?.firebaseId,
        email: existingUser?.email
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
          subscriptionType: "free",
          emailNotifications: false
        });
        console.log("[User] Created new user with Stripe customer:", {
          firebaseId: newUser.firebaseId,
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

      const updatedUser = await storage.updateUser(user.firebaseId, {
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
        firebaseId: user.firebaseId,
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
}