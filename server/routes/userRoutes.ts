import type { Express } from "express";
import { storage } from "../storage/index";
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

      let stripeCustomerId;
      let customer;
      const existingUser = await storage.getUserByFirebaseId(firebaseId);

      if (!existingUser) {
        customer = await stripe.customers.create({
          email,
          metadata: { firebaseId }
        });
        stripeCustomerId = customer.id;

        const newUser = await storage.createUser({
          firebaseId,
          email,
          firstName: "",
          lastName: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
          isPremium: false,
          stripeCustomerId,
          subscriptionType: "free",
          emailNotifications: false
        });

        return res.json({ stripeCustomerId });
      }

      // Handle existing user
      if (existingUser.stripeCustomerId) {
        stripeCustomerId = existingUser.stripeCustomerId;
      } else {
        customer = await stripe.customers.create({
          email,
          metadata: {
            firebaseId,
          },
        });
        stripeCustomerId = customer.id;
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

      const user = await storage.getUserByFirebaseId(req.params.firebaseId);

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
      const user = await storage.getUserByFirebaseId(req.params.firebaseId);
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