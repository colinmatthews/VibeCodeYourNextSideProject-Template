import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  item: text("item").notNull(),
});

export const insertItemSchema = createInsertSchema(items, {
  item: z.string(),
});

export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;