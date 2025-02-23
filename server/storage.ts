import { type Contact, type InsertContact, type User, type InsertUser } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserSubscription(id: number, subscriptionType: string): Promise<User>;

  // Contact operations
  getContact(id: number): Promise<Contact | undefined>;
  getContactsByUserId(userId: number): Promise<Contact[]>;
  createContact(contact: InsertContact & { userId: number }): Promise<Contact>;
  updateContact(id: number, contact: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: number): Promise<void>;
}

import neo4j from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

export class Neo4jStorage implements IStorage {
  private driver: neo4j.Driver;
  private currentUserId: number;
  private contacts: Map<string, Contact>;
  private users: Map<number, User>;

  constructor() {
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'neo4j://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
    this.currentUserId = 1;
    this.contacts = new Map();
    this.users = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseId === firebaseId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      isPremium: insertUser.isPremium ?? false // Ensure isPremium is never undefined
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserSubscription(id: number, subscriptionType: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, subscriptionType };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async getContactsByUserId(userId: string): Promise<Contact[]> {
    const session = this.driver.session();
    try {
      const result = await session.executeRead(tx =>
        tx.run(
          `
          MATCH (c:Contact)
          WHERE c.userId = $userId
          RETURN c
          `,
          { userId }
        )
      );
      
      const contacts = result.records.map(record => {
        const contact = record.get('c').properties;
        return {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          userId: contact.userId
        } as Contact;
      });
      console.log("Fetched contacts:", contacts);
      return contacts;
    } finally {
      await session.close();
    }
  }

  async createContact(
    contact: InsertContact & { userId: number },
  ): Promise<Contact> {
    console.log("Storage: Creating contact with userId:", contact.userId);
    const session = this.driver.session();
    try {
      const id = uuidv4();
      
      const result = await session.executeWrite(tx =>
        tx.run(
          `
          CREATE (c:Contact {
            id: $id,
            userId: $userId,
            firstName: $firstName,
            lastName: $lastName,
            email: $email,
            phone: $phone
          })
          WITH c
          MATCH (existing:Contact {id: $id})
          RETURN c, count(existing) as idExists
          `,
          { ...contact, id }
        )
      );
      
      // If ID collision occurred (extremely unlikely with UUID), retry
      if (result.records[0].get('idExists') > 1) {
        await session.close();
        return this.createContact(contact);
      }
      
      const newContact: Contact = { ...contact, id };
      return newContact;
    } finally {
      await session.close();
    }
  }

  async updateContact(
    id: number,
    contact: Partial<InsertContact>,
  ): Promise<Contact> {
    const existing = await this.getContact(id);
    if (!existing) throw new Error("Contact not found");

    const updated = { ...existing, ...contact };
    this.contacts.set(id, updated);
    return updated;
  }

  async deleteContact(id: number): Promise<void> {
    this.contacts.delete(id);
  }
}

export const storage = new Neo4jStorage();