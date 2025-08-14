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

  async updateItemFiles(id: number, filePaths: string[]): Promise<Item | null> {
    const [updatedItem] = await db
      .update(items)
      .set({ files: filePaths })
      .where(eq(items.id, id))
      .returning();
    return updatedItem || null;
  }

  async addFileToItem(id: number, filePath: string): Promise<Item | null> {
    // First get the current item to append to existing files
    const [currentItem] = await db.select().from(items).where(eq(items.id, id));
    if (!currentItem) return null;
    
    const currentFiles = currentItem.files || [];
    const updatedFiles = [...currentFiles, filePath];
    
    return this.updateItemFiles(id, updatedFiles);
  }

  async removeFileFromItem(id: number, filePath: string): Promise<Item | null> {
    // First get the current item to remove from existing files
    const [currentItem] = await db.select().from(items).where(eq(items.id, id));
    if (!currentItem) return null;
    
    const currentFiles = currentItem.files || [];
    const updatedFiles = currentFiles.filter(file => file !== filePath);
    
    return this.updateItemFiles(id, updatedFiles);
  }
}