import { type Item, type InsertItem, items } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export class ItemStorage {
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.userId, userId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }
}