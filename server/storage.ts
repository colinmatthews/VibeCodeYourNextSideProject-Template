
import { type Contact, type InsertContact, type User, type InsertUser } from "@shared/schema";
import neo4j from 'neo4j-driver';
import pg from 'pg';
const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(id: number, subscriptionType: string): Promise<User>;

  // Contact operations
  getContact(id: string): Promise<Contact | undefined>;
  getContactsByUserId(userId: string): Promise<Contact[]>;
  createContact(contact: InsertContact & { userId: string }): Promise<Contact>;
  updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
}

export class HybridStorage implements IStorage {
  private neo4jDriver: neo4j.Driver;
  private pgPool: Pool;

  constructor() {
    // Neo4j setup
    this.neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'neo4j://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );

    // PostgreSQL setup
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  // User operations with PostgreSQL
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    const result = await this.pgPool.query(
      'SELECT * FROM users WHERE firebase_id = $1',
      [firebaseId]
    );
    return result.rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.pgPool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.pgPool.query(
      `INSERT INTO users (
        firebase_id, email, stripe_customer_id, is_premium, first_name, 
        last_name, address, city, state, postal_code, subscription_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        user.firebaseId,
        user.email,
        user.stripeCustomerId || null,
        user.isPremium || false,
        user.firstName || '',
        user.lastName || '',
        user.address || '',
        user.city || '',
        user.state || '',
        user.postalCode || '',
        user.subscriptionType || 'free'
      ]
    );
    return result.rows[0];
  }

  async updateUserSubscription(id: number, subscriptionType: string): Promise<User> {
    const result = await this.pgPool.query(
      'UPDATE users SET subscription_type = $1 WHERE id = $2 RETURNING *',
      [subscriptionType, id]
    );
    return result.rows[0];
  }

  // Contact operations with Neo4j
  async getContact(id: string): Promise<Contact | undefined> {
    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(
        'MATCH (c:Contact {id: $id}) RETURN c',
        { id }
      );
      return result.records[0]?.get('c').properties as Contact;
    } finally {
      await session.close();
    }
  }

  async getContactsByUserId(userId: string): Promise<Contact[]> {
    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(
        'MATCH (c:Contact {userId: $userId}) RETURN c',
        { userId }
      );
      return result.records.map(record => record.get('c').properties as Contact);
    } finally {
      await session.close();
    }
  }

  async createContact(contact: InsertContact & { userId: string }): Promise<Contact> {
    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(
        `
        CREATE (c:Contact {
          id: $id,
          userId: $userId,
          firstName: $firstName,
          lastName: $lastName,
          email: $email,
          phone: $phone
        })
        RETURN c
        `,
        { ...contact, id: crypto.randomUUID() }
      );
      return result.records[0].get('c').properties as Contact;
    } finally {
      await session.close();
    }
  }

  async updateContact(id: string, contact: Partial<InsertContact>): Promise<Contact> {
    const session = this.neo4jDriver.session();
    try {
      const result = await session.run(
        `
        MATCH (c:Contact {id: $id})
        SET c += $updates
        RETURN c
        `,
        { id, updates: contact }
      );
      return result.records[0].get('c').properties as Contact;
    } finally {
      await session.close();
    }
  }

  async deleteContact(id: string): Promise<void> {
    const session = this.neo4jDriver.session();
    try {
      await session.run(
        'MATCH (c:Contact {id: $id}) DELETE c',
        { id }
      );
    } finally {
      await session.close();
    }
  }
}

export const storage = new HybridStorage();
