
import { pgTable, text, serial, boolean, timestamp, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const SubscriptionType = {
  FREE: "free",
  PRO: "pro"
} as const;

export type SubscriptionType = typeof SubscriptionType[keyof typeof SubscriptionType];

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  postalCode: text("postal_code").notNull().default(""),
  isPremium: boolean("is_premium").notNull().default(false),
  subscriptionType: text("subscription_type", { enum: ["free", "pro"] }).notNull().default("free"),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ItemStatus = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed"
} as const;

export type ItemStatus = typeof ItemStatus[keyof typeof ItemStatus];

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  item: text("item").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  status: text("status", { enum: ["open", "in_progress", "completed"] }).notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const aiThreads = pgTable("ai_threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New Chat"),
  userId: text("user_id").notNull().references(() => users.id),
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
  aiThreads: many(aiThreads),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
}));

export const aiThreadsRelations = relations(aiThreads, ({ one, many }) => ({
  user: one(users, {
    fields: [aiThreads.userId],
    references: [users.id],
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
  id: (schema) => schema,
  email: (schema) => schema.email().optional(),
  firstName: (schema) => schema.optional(),
  lastName: (schema) => schema.optional(),
  profileImageUrl: (schema) => schema.optional(),
  address: (schema) => schema.default(""),
  city: (schema) => schema.default(""),
  state: (schema) => schema.default(""),
  postalCode: (schema) => schema.default(""),
  isPremium: (schema) => schema.default(false),
  subscriptionType: (schema) => schema.default("free"),
  emailNotifications: (schema) => schema.default(false),
});

export const insertItemSchema = createInsertSchema(items, {
  status: (schema) => schema.default("open"),
});

export const updateItemStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "completed"]),
});

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
export type InsertAiThread = z.infer<typeof insertAiThreadSchema>;
export type AiThread = typeof aiThreads.$inferSelect;
// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
export type AiMessage = typeof aiMessages.$inferSelect;

// Re-export for Replit Auth compatibility
export type UpsertUser = InsertUser;
