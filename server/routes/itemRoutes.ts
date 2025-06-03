import type { Express } from "express";
import { storage } from "../storage/index";
import { sendEmail } from "../mail";

export async function registerItemRoutes(app: Express) {
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
      console.log("[Items] Received item data:", req.body);
      const { userId, item } = req.body;
      console.log("[Items] Parsed userId:", userId);

      if (!userId) {
        console.error("[Items] Invalid user ID");
        return res.status(400).json({ error: "Invalid user ID" });
      }

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
        return res.status(403).json({
          error: "Item limit reached. Please upgrade to Pro plan.",
        });
      }

      const created = await storage.createItem({ userId, item });
      console.log("[Items] Item created:", created);

      // Send email notification if enabled
      if (user?.emailNotifications && user?.email) {
        console.log("[Items] Sending email notification to:", user.email);
        const emailResult = await sendEmail({
          to: user.email,
          from: "carlos@kindnessengineering.com",
          subject: "New Item Created",
          text: `A new item "${item}" has been created in your list.`,
          html: `<p>A new item "<strong>${item}</strong>" has been created in your list.</p>`
        });
        console.log("[Items] Email notification result:", emailResult);
      }

      res.json(created);
    } catch (error) {
      console.error("[Items] Error creating item:", error);
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
}