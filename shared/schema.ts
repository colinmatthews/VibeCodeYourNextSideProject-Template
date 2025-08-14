
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
  files: text("files").array(), // Array of file paths or identifiers
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
  firebaseId: z.string(),
  email: z.string().email(),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  postalCode: z.string().default(""),
  isPremium: z.boolean().default(false),
  subscriptionType: z.enum(["free", "pro"]).default("free"),
  emailNotifications: z.boolean().default(false),
});

export const insertItemSchema = createInsertSchema(items, {
  userId: z.string(),
  item: z.string(),
  files: z.array(z.string()).optional(), // Optional array of file paths
});

export const insertFileSchema = createInsertSchema(files, {
  name: z.string(),
  originalName: z.string(),
  path: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
  userId: z.string(),
});

export const insertAiThreadSchema = createInsertSchema(aiThreads, {
  id: z.string(),
  title: z.string().default("New Chat"),
  userId: z.string(),
  archived: z.boolean().default(false),
});

export const insertAiMessageSchema = createInsertSchema(aiMessages, {
  id: z.string(),
  threadId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
export type InsertAiThread = z.infer<typeof insertAiThreadSchema>;
export type AiThread = typeof aiThreads.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;
