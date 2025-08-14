import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { sendEmail } from "../mail";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { requiresOwnership, requiresItemOwnership } from "../middleware/authHelpers";
import { handleError, errors } from "../lib/errors";

// Validation schemas
const itemIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

const createItemSchema = z.object({
  item: z.string().min(1).max(1000).trim()
});

export async function registerItemRoutes(app: Express) {
  app.get("/api/items", requireAuth, requiresOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!.uid;
      const items = await storage.getItemsByUserId(userId);
      res.json(items || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      handleError(error, res);
    }
  });

  app.post("/api/items", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const { item } = createItemSchema.parse(req.body);
      const userId = req.user!.uid;
      
      console.log("[Items] Received item data:", { item, userId });

      const user = await storage.getUserByFirebaseId(userId);
      console.log("[Items] User data:", {
        email: user?.email,
        emailNotifications: user?.emailNotifications,
        subscriptionType: user?.subscriptionType
      });

      const items = await storage.getItemsByUserId(userId);
      console.log("[Items] Current items count:", items.length);

      if (!user?.subscriptionType?.includes('pro') && items.length >= 5) {
        console.log("[Items] Free user hit item limit");
        throw errors.forbidden("Item limit reached. Please upgrade to Pro plan.");
      }

      const created = await storage.createItem({ userId, item });
      console.log("[Items] Item created:", created);

      // Send email notification if enabled
      if (user?.emailNotifications && user?.email) {
        console.log("[Items] Sending email notification to:", user.email);
        const emailResult = await sendEmail({
          to: user.email,
          subject: "New Item Created",
          text: `A new item "${item}" has been created in your list.`,
          html: `<p>A new item "<strong>${item}</strong>" has been created in your list.</p>`
        });
        console.log("[Items] Email notification result:", emailResult);
      }

      res.json(created);
    } catch (error) {
      console.error("[Items] Error creating item:", error);
      handleError(error, res);
    }
  });

  app.delete("/api/items/:id", requireAuth, requiresItemOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate item ID parameter
      const { id } = itemIdSchema.parse(req.params);
      
      await storage.deleteItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting item:", error);
      handleError(error, res);
    }
  });
}
