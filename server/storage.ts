import { type Contact, type InsertContact, type User, type InsertUser, users, contacts } from "@shared/schema";
import { eq } from "drizzle-orm";
import pg from 'pg';
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

  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  getContactsByUserId(userId: string): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
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

  // Contact operations
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async getContactsByUserId(userId: string): Promise<Contact[]> {
    return this.db.select().from(contacts).where(eq(contacts.userId, userId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await this.db
      .insert(contacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact> {
    const [updatedContact] = await this.db
      .update(contacts)
      .set(contact)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: number): Promise<void> {
    await this.db
      .delete(contacts)
      .where(eq(contacts.id, id));
  }
}

export const storage = new PostgresStorage();