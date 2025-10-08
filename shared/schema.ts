
import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const SubscriptionType = {
  FREE: "free",
  PRO: "pro"
} as const;

export type SubscriptionType = typeof SubscriptionType[keyof typeof SubscriptionType];

export const users = pgTable("users", {
  firebaseId: text("firebase_id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  isPremium: boolean("is_premium").notNull().default(false),
  subscriptionType: text("subscription_type", { enum: ["free", "pro"] }).notNull().default("free"),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  item: text("item").notNull(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  path: text("path").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull(),
  type: text("type").notNull(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiThreads = pgTable("ai_threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id").notNull().references(() => aiThreads.id, { onDelete: 'cascade' }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  files: many(files),
  aiThreads: many(aiThreads),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.firebaseId],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.firebaseId],
  }),
}));

export const aiThreadsRelations = relations(aiThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [aiThreads.userId],
    references: [users.firebaseId],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  thread: one(aiThreads, {
    fields: [aiMessages.threadId],
    references: [aiThreads.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users, {
  firebaseId: (schema) => schema,
  email: (schema) => schema.email(),
  firstName: (schema) => schema.default(""),
  lastName: (schema) => schema.default(""),
  address: (schema) => schema.default(""),
  city: (schema) => schema.default(""),
  state: (schema) => schema.default(""),
  postalCode: (schema) => schema.default(""),
  isPremium: (schema) => schema.default(false),
  subscriptionType: (schema) => schema.default("free"),
  emailNotifications: (schema) => schema.default(false),
});

export const insertItemSchema = createInsertSchema(items);

export const insertFileSchema = createInsertSchema(files);

export const insertAiThreadSchema = createInsertSchema(aiThreads, {
  title: (schema) => schema.default("New Chat"),
  archived: (schema) => schema.default(false),
});

export const insertAiMessageSchema = createInsertSchema(aiMessages);

// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertAiThread = z.infer<typeof insertAiThreadSchema>;
export type AiThread = typeof aiThreads.$inferSelect;
// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;
