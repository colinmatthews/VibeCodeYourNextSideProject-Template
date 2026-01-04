import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { sendEmail } from "../mail";
import { isAuthenticated } from "../replit_integrations/auth";
import { AuthenticatedRequest, getUserId } from "../middleware/auth";
import { requiresItemOwnership } from "../middleware/authHelpers";
import { handleError, errors } from "../lib/errors";
import { updateItemStatusSchema } from "@shared/schema";

// Validation schemas
const itemIdSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number)
});

const createItemSchema = z.object({
  item: z.string().min(1).max(1000).trim()
});

export async function registerItemRoutes(app: Express) {
  app.get("/api/items", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const items = await storage.getItemsByUserId(userId);
      res.json(items || []);
    } catch (error) {
      console.error("Error fetching items:", error);
      handleError(error, res);
    }
  });

  app.post("/api/items", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate request body
      const { item } = createItemSchema.parse(req.body);
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      console.log("[Items] Received item data:", { item, userId });

      const user = await storage.getUserById(userId);
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

      const created = await storage.createItem({ userId, item, status: "open" });
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

  app.patch("/api/items/:id/status", isAuthenticated, requiresItemOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      // Validate item ID parameter
      const { id } = itemIdSchema.parse(req.params);

      // Validate status in request body
      const { status } = updateItemStatusSchema.parse(req.body);

      const updatedItem = await storage.updateItemStatus(id, status);
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating item status:", error);
      handleError(error, res);
    }
  });

  app.delete("/api/items/:id", isAuthenticated, requiresItemOwnership, async (req: AuthenticatedRequest, res) => {
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
