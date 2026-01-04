import type { Express } from "express";
import { storage } from "../storage/index";
import { insertUserSchema } from "@shared/schema";
import Stripe from "stripe";
import { isAuthenticated } from "../replit_integrations/auth";
import { AuthenticatedRequest, getUserId } from "../middleware/auth";
import { requiresOwnership, requiresUserExists } from "../middleware/authHelpers";
import { z } from "zod";
import { PostHog } from 'posthog-node';
import { getStripeClient } from "../lib/stripe";

// Initialize PostHog for server-side events when configured
const posthogKey = process.env.POSTHOG_API_KEY;
const posthog = posthogKey
  ? new PostHog(posthogKey, { host: process.env.POSTHOG_HOST })
  : null;

// Helper function to identify user in PostHog
const identifyUserInPostHog = (email: string, userId: string, additionalProperties?: Record<string, any>) => {
  if (!posthog) return;
  posthog.identify({
    distinctId: email,
    properties: {
      userId,
      email,
      ...additionalProperties
    }
  });
};

// Validation schema for profile updates
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  emailNotifications: z.boolean().optional()
});

export async function registerUserRoutes(app: Express) {
  // Check and create Stripe customer if needed
  app.post("/api/users/ensure-stripe", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Payments service not configured" });
      }

      const userId = getUserId(req);
      const email = req.user?.claims?.email;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      if (!email) {
        return res.status(400).json({ error: "User email is required" });
      }

      let stripeCustomerId;
      let customer;
      const existingUser = await storage.getUserById(userId);

      if (!existingUser) {
        customer = await stripe.customers.create({
          email,
          metadata: { userId }
        });
        stripeCustomerId = customer.id;

        await storage.upsertUser({
          id: userId,
          email,
          firstName: req.user?.claims?.first_name || "",
          lastName: req.user?.claims?.last_name || "",
          profileImageUrl: req.user?.claims?.profile_image_url,
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
            userId,
          },
        });
        stripeCustomerId = customer.id;
        
        await storage.updateUser(userId, { stripeCustomerId });
      }

      return res.json({ stripeCustomerId });
    } catch (error) {
      console.error("Error ensuring Stripe customer:", error);
      res.status(500).json({ error: "Failed to ensure Stripe customer" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const stripe = getStripeClient();
      if (!stripe) {
        return res.status(503).json({ error: "Payments service not configured" });
      }

      const userInput = req.body;
      const userId = getUserId(req);
      const authenticatedEmail = req.user?.claims?.email;

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      // Ensure the user is creating their own profile
      if (userInput.id && userInput.id !== userId) {
        return res.status(403).json({ error: "Access denied: You can only create your own profile" });
      }

      // Use authenticated user's data
      const user = insertUserSchema.parse({
        ...userInput,
        id: userId,
        email: authenticatedEmail || userInput.email
      });
      
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();

      // Check if user exists by ID or email
      const [existingUserById, existingUserByEmail] = await Promise.all([
        storage.getUserById(userId),
        user.email ? storage.getUserByEmail(user.email) : undefined
      ]);

      if (existingUserById) {
        return res.json(existingUserById);
      }

      if (existingUserByEmail) {
        return res.json(existingUserByEmail);
      }

      // Create new user
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: fullName || undefined,
        metadata: {
          userId: user.id!,
        },
        shipping: user.address ? {
          name: fullName,
          address: {
            line1: user.address,
            city: user.city || undefined,
            state: user.state || undefined,
            postal_code: user.postalCode || undefined,
            country: 'US'
          }
        } : undefined,
        address: user.address ? {
          line1: user.address,
          city: user.city || undefined,
          state: user.state || undefined,
          postal_code: user.postalCode || undefined,
          country: 'US'
        } : undefined
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

  app.patch("/api/users/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const validatedData = updateProfileSchema.parse(req.body);
      const { firstName, lastName, emailNotifications } = validatedData;
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const user = await storage.getUserById(userId);

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

  app.get("/api/users/profile", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({
        id: user.id,
        email: user.email,
        subscriptionType: user.subscriptionType,
        firstName: user.firstName,
        lastName: user.lastName,
        emailNotifications: user.emailNotifications,
        isPremium: user.isPremium,
        profileImageUrl: user.profileImageUrl
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });
}
