import { db } from '../db';
import { aiMessages, aiThreads, type AiMessage, type InsertAiMessage } from '@shared/schema';
import { eq, asc, and } from 'drizzle-orm';

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
    return await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(aiMessages)
        .values(message)
        .returning();

      // Bump thread updatedAt
      await tx
        .update(aiThreads)
        .set({ updatedAt: new Date() })
        .where(eq(aiThreads.id, message.threadId));

      return inserted[0];
    });
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
    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(aiMessages)
        .values(messages)
        .returning();

      // Bump thread updatedAt (all messages share the same threadId in our usage)
      const threadId = messages[0].threadId;
      await tx
        .update(aiThreads)
        .set({ updatedAt: new Date() })
        .where(eq(aiThreads.id, threadId));

      return result;
    });
  }

  async messageExistsByContent(
    threadId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<boolean> {
    const rows = await db
      .select({ id: aiMessages.id })
      .from(aiMessages)
      .where(and(
        eq(aiMessages.threadId, threadId),
        eq(aiMessages.role, role),
        eq(aiMessages.content, content)
      ))
      .limit(1);
    return rows.length > 0;
  }
}
