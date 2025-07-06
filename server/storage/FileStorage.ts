import { db } from '../db';
import { files } from '@shared/schema';
import { type File, type InsertFile } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';

export class FileStorage {
  async getFilesByUserId(userId: string): Promise<File[]> {
    const result = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(desc(files.createdAt));
    return result;
  }

  async getFileById(id: number): Promise<File | undefined> {
    const result = await db
      .select()
      .from(files)
      .where(eq(files.id, id))
      .limit(1);
    return result[0];
  }

  async createFile(file: InsertFile): Promise<File> {
    const result = await db
      .insert(files)
      .values({
        ...file,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async deleteFile(id: number): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async getFileByPath(path: string): Promise<File | undefined> {
    const result = await db
      .select()
      .from(files)
      .where(eq(files.path, path))
      .limit(1);
    return result[0];
  }
}