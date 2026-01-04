import { type Item, type InsertItem, items, type ItemStatus } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export class ItemStorage {
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.userId, userId));
  }

  async getItemById(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItemStatus(id: number, status: ItemStatus): Promise<Item> {
    const [updatedItem] = await db
      .update(items)
      .set({ status, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }
}