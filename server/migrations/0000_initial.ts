
import { pgTable, serial, text, varchar, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseId: text("firebase_id").notNull().unique(),
  email: text("email").notNull(),
  subscriptionType: text("subscription_type").notNull().default('free'),
  stripeCustomerId: text("stripe_customer_id"),
  emailNotifications: boolean("email_notifications").notNull().default(false),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  item: text("item").notNull(),
});
