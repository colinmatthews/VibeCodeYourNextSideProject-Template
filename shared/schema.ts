import { pgTable, text, serial, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseId: text("firebase_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  subscriptionType: text("subscription_type").notNull().default('free'),
  stripeCustomerId: text("stripe_customer_id"),
});

export const SubscriptionType = {
  FREE: 'free',
  PRO: 'pro'
} as const;

export const insertUserSchema = createInsertSchema(users).pick({
  firebaseId: true,
  email: true,
  isPremium: true,
});

// Contact schema for Neo4j (not PostgreSQL)
export const insertContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;
