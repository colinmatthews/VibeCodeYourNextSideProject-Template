import { db } from '../db';
import { aiThreads, type AiThread, type InsertAiThread } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface UpdateThreadData {
  title?: string;
  archived?: boolean;
}

export class ThreadStorage {
  async getThreadsByUserId(userId: string): Promise<AiThread[]> {
    return await db
      .select()
      .from(aiThreads)
      .where(eq(aiThreads.userId, userId))
      .orderBy(desc(aiThreads.updatedAt));
  }

  async getThreadById(id: string): Promise<AiThread | undefined> {
    const result = await db
      .select()
      .from(aiThreads)
      .where(eq(aiThreads.id, id))
      .limit(1);
    
    return result[0];
  }

  async getThreadByIdAndUserId(id: string, userId: string): Promise<AiThread | undefined> {
    const result = await db
      .select()
      .from(aiThreads)
      .where(and(eq(aiThreads.id, id), eq(aiThreads.userId, userId)))
      .limit(1);
    
    return result[0];
  }

  async createThread(thread: InsertAiThread): Promise<AiThread> {
    const result = await db
      .insert(aiThreads)
      .values(thread)
      .returning();
    
    return result[0];
  }

  async updateThread(id: string, userId: string, data: UpdateThreadData): Promise<AiThread | undefined> {
    const result = await db
      .update(aiThreads)
      .set({ 
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(aiThreads.id, id), eq(aiThreads.userId, userId)))
      .returning();
    
    return result[0];
  }

  async deleteThread(id: string, userId: string): Promise<void> {
    await db
      .delete(aiThreads)
      .where(and(eq(aiThreads.id, id), eq(aiThreads.userId, userId)));
  }

  async getArchivedThreadsByUserId(userId: string): Promise<AiThread[]> {
    return await db
      .select()
      .from(aiThreads)
      .where(and(eq(aiThreads.userId, userId), eq(aiThreads.archived, true)))
      .orderBy(desc(aiThreads.updatedAt));
  }

  async getActiveThreadsByUserId(userId: string): Promise<AiThread[]> {
    return await db
      .select()
      .from(aiThreads)
      .where(and(eq(aiThreads.userId, userId), eq(aiThreads.archived, false)))
      .orderBy(desc(aiThreads.updatedAt));
  }
}