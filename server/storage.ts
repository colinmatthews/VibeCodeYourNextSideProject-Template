
import { type Item, type InsertItem, type User, type InsertUser, users, items } from "@shared/schema";
import { eq } from "drizzle-orm";
import pg from 'pg';
import { z } from "zod";

export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
};

export const insertItemSchema = z.object({
  userId: z.string(),
  item: z.string()
});
import { drizzle } from 'drizzle-orm/node-postgres';
const { Pool } = pg;

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(id: number, subscriptionType: string): Promise<User>;
  updateUser(id: number, data: UpdateUserData): Promise<User>;

  // Item operations
  getItem(id: number): Promise<Item | undefined>;
  getItemsByUserId(userId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private pool: typeof Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.db = drizzle(this.pool);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.firebaseId, firebaseId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.pgPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUserSubscription(id: number, subscriptionType: string): Promise<User> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ subscriptionType })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserStripeCustomerId(id: number, stripeCustomerId: string): Promise<User> {
    const result = await this.pgPool.query(
      'UPDATE users SET stripe_customer_id = $1 WHERE id = $2 RETURNING *',
      [stripeCustomerId, id]
    );
    return result.rows[0];
  }

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Item operations
  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await this.db
      .select()
      .from(items)
      .where(eq(items.id, id));
    return item;
  }

  async getItemsByUserId(userId: string): Promise<Item[]> {
    return this.db.select().from(items).where(eq(items.userId, userId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await this.db
      .insert(items)
      .values(item)
      .returning();
    return newItem;
  }

  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item> {
    const [updatedItem] = await this.db
      .update(items)
      .set(item)
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  async deleteItem(id: number): Promise<void> {
    await this.db
      .delete(items)
      .where(eq(items.id, id));
  }
}

export const storage = new PostgresStorage();
