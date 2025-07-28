import type { Express } from "express";
import { storage } from "../storage/index";
import { insertUserSchema } from "@shared/schema";
import Stripe from "stripe";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requiresOwnership, requiresUserExists } from "../middleware/authHelpers";
import { z } from "zod";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

// Validation schema for profile updates
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  emailNotifications: z.boolean().optional()
});

export async function registerUserRoutes(app: Express) {
  // Login endpoint for token verification and user session creation
  app.post("/api/login", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const firebaseId = req.user!.uid;
      const email = req.user!.email;

      // Check if user exists in our database
      let user = await storage.getUserByFirebaseId(firebaseId);
      
      if (!user) {
        // Create a basic user profile if none exists
        user = await storage.createUser({
          firebaseId,
          email: email || '',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          isPremium: false,
          subscriptionType: 'free',
          emailNotifications: false
        });
      }

      // Return user info for client
      res.json({
        firebaseId: user.firebaseId,
        email: user.email,
        subscriptionType: user.subscriptionType,
        firstName: user.firstName,
        lastName: user.lastName,
        emailNotifications: user.emailNotifications,
        isPremium: user.isPremium
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Check and create Stripe customer if needed
  app.post("/api/users/ensure-stripe", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const firebaseId = req.user!.uid;
      const email = req.user!.email;

      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }

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

  app.post("/api/users", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const userInput = req.body;
      const firebaseId = req.user!.uid;
      const authenticatedEmail = req.user!.email;

      // Ensure the user is creating their own profile
      if (userInput.firebaseId && userInput.firebaseId !== firebaseId) {
        return res.status(403).json({ error: "Access denied: You can only create your own profile" });
      }

      // Use authenticated user's data
      const user = insertUserSchema.parse({
        ...userInput,
        firebaseId,
        email: authenticatedEmail || userInput.email
      });
      
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

  app.patch("/api/users/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const validatedData = updateProfileSchema.parse(req.body);
      const { firstName, lastName, emailNotifications } = validatedData;
      const firebaseId = req.user!.uid;

      const user = await storage.getUserByFirebaseId(firebaseId);

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

  app.get("/api/users/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const firebaseId = req.user!.uid;
      const user = await storage.getUserByFirebaseId(firebaseId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        firebaseId: user.firebaseId,
        email: user.email,
        subscriptionType: user.subscriptionType,
        firstName: user.firstName,
        lastName: user.lastName,
        emailNotifications: user.emailNotifications,
        isPremium: user.isPremium
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
}