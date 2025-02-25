
import { pgTable, serial, text, varchar, boolean } from "drizzle-orm/pg-core";

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
  emailNotifications: boolean("email_notifications").notNull().default(false),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  item: text("item").notNull(),
});
