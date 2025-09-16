import { type Item, type InsertItem, type File, items, itemFiles, files } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export class ItemStorage {
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return db.select().from(items).where(eq(items.userId, userId));
  }

  async getItemsWithFilesByUserId(userId: string): Promise<(Item & { files: File[] })[]> {
    const rows = await db
      .select({ item: items, file: files })
      .from(items)
      .leftJoin(itemFiles, eq(itemFiles.itemId, items.id))
      .leftJoin(files, eq(itemFiles.fileId, files.id))
      .where(eq(items.userId, userId));

    const map = new Map<number, Item & { files: File[] }>();
    for (const row of rows) {
      const item = row.item;
      if (!map.has(item.id)) {
        map.set(item.id, { ...item, files: [] });
      }
      if (row.file) {
        map.get(item.id)!.files.push(row.file);
      }
    }
    return Array.from(map.values());
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async addFileToItem(itemId: number, fileId: number): Promise<void> {
    await db.insert(itemFiles).values({ itemId, fileId });
  }

  async getFilesByItemId(itemId: number): Promise<File[]> {
    const rows = await db
      .select({ file: files })
      .from(itemFiles)
      .innerJoin(files, eq(itemFiles.fileId, files.id))
      .where(eq(itemFiles.itemId, itemId));
    return rows.map((r) => r.file);
  }
}