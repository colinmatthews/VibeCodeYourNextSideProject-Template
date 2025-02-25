
import { pgTable, text, serial, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const SubscriptionType = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise"
} as const;

export type SubscriptionType = typeof SubscriptionType[keyof typeof SubscriptionType];

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
  subscriptionType: text("subscription_type").notNull().default(SubscriptionType.FREE),
  stripeCustomerId: text("stripe_customer_id"),
  emailNotifications: boolean("email_notifications").notNull().default(false),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  item: text("item").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.firebaseId],
  }),
}));

export const insertUserSchema = createInsertSchema(users, {
  firebaseId: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  subscriptionType: z.string(),
  stripeCustomerId: z.string().optional(),
  emailNotifications: z.boolean().default(false),
});

export const insertItemSchema = createInsertSchema(items, {
  userId: z.string(),
  item: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
