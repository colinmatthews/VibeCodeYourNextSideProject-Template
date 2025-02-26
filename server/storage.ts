import { type Item, type InsertItem, type User, type InsertUser, users, items } from "@shared/schema";
import { eq } from "drizzle-orm";
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const { Pool } = pg;

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
  subscriptionType?: "free" | "pro";
  stripeCustomerId?: string;
}

export interface IStorage {
  // User operations
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(firebaseId: string, data: UpdateUserData): Promise<User>;

  // Item operations
  getItemsByUserId(userId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  deleteItem(id: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private pool: pg.Pool;
  private db: ReturnType<typeof drizzle>;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.db = drizzle(this.pool);
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    const [user] = await this.db.select({
      id: users.firebaseId,
      email: users.email,
      subscriptionType: users.subscriptionType,
      emailNotifications: users.emailNotifications,
      stripeCustomerId: users.stripeCustomerId
    }).from(users).where(eq(users.firebaseId, firebaseId));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await this.db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(firebaseId: string, data: UpdateUserData): Promise<User> {
    console.log("[Debug] Updating user:", { firebaseId, data });
    const [updatedUser] = await this.db
      .update(users)
      .set(data)
      .where(eq(users.firebaseId, firebaseId))
      .returning();
    console.log("[Debug] Updated user result:", updatedUser);
    return updatedUser;
  }

  async getItemsByUserId(userId: string): Promise<Item[]> {
    return this.db.select().from(items).where(eq(items.userId, userId));
  }

  async createItem(item: InsertItem): Promise<Item> {
    const [newItem] = await this.db.insert(items).values(item).returning();
    return newItem;
  }

  async deleteItem(id: number): Promise<void> {
    await this.db.delete(items).where(eq(items.id, id));
  }
}

export const storage = new PostgresStorage();