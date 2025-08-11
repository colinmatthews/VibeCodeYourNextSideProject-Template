import { db } from '../db';
import { aiMessages, type AiMessage, type InsertAiMessage } from '@shared/schema';
import { eq, asc } from 'drizzle-orm';

export class MessageStorage {
  async getMessagesByThreadId(threadId: string): Promise<AiMessage[]> {
    return await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.threadId, threadId))
      .orderBy(asc(aiMessages.createdAt));
  }

  async getMessageById(id: string): Promise<AiMessage | undefined> {
    const result = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.id, id))
      .limit(1);
    
    return result[0];
  }

  async createMessage(message: InsertAiMessage): Promise<AiMessage> {
    const result = await db
      .insert(aiMessages)
      .values(message)
      .returning();
    
    return result[0];
  }

  async deleteMessage(id: string): Promise<void> {
    await db
      .delete(aiMessages)
      .where(eq(aiMessages.id, id));
  }

  async deleteMessagesByThreadId(threadId: string): Promise<void> {
    await db
      .delete(aiMessages)
      .where(eq(aiMessages.threadId, threadId));
  }

  async createMessages(messages: InsertAiMessage[]): Promise<AiMessage[]> {
    if (messages.length === 0) return [];
    
    const result = await db
      .insert(aiMessages)
      .values(messages)
      .returning();
    
    return result;
  }
}