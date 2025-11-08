# EmailSubTracker - Final Database Schema
## Simplified MVP Version (Based on Data Model Analysis)

**Version:** 1.0 - MVP
**Date:** November 8, 2025

---

## Schema Decisions Summary

Based on DATA_MODEL_ANALYSIS.md, we're using:

✅ **Simplified MVP Schema** (4 tables)
✅ **Allow duplicate subscriptions** (user manages)
✅ **30-day email retention** (auto-delete)
✅ **Soft delete for users** (30-day grace period)
✅ **Enum for categories** (migrate to table in Phase 2)

---

## Complete Schema Definition

### File: `shared/schema.ts`

```typescript
import { pgTable, text, serial, boolean, timestamp, integer, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export const SubscriptionType = {
  FREE: "free",
  PRO: "pro"
} as const;

export type SubscriptionType = typeof SubscriptionType[keyof typeof SubscriptionType];

export const BillingCycle = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
  QUARTERLY: "quarterly",
  WEEKLY: "weekly"
} as const;

export const SubscriptionStatus = {
  ACTIVE: "active",
  TRIAL: "trial",
  CANCELLED: "cancelled",
  PAUSED: "paused"
} as const;

export const SubscriptionCategory = {
  AI_TOOLS: "ai_tools",
  DESIGN: "design",
  VIDEO_EDITING: "video_editing",
  PRODUCTIVITY: "productivity",
  ANALYTICS: "analytics",
  MARKETING: "marketing",
  DEVELOPMENT: "development",
  FINANCE: "finance",
  ENTERTAINMENT: "entertainment",
  EDUCATION: "education",
  OTHER: "other"
} as const;

export const ParsingStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  SKIPPED: "skipped"
} as const;

export const ReminderType = {
  TRIAL_ENDING: "trial_ending",
  RENEWAL_UPCOMING: "renewal_upcoming",
  PRICE_CHANGE: "price_change"
} as const;

// ============================================================================
// TABLES
// ============================================================================

// ----------------------------------------------------------------------------
// 1. USERS TABLE (Modified from template)
// ----------------------------------------------------------------------------
export const users = pgTable("users", {
  // Primary key (from Firebase Auth)
  firebaseId: text("firebase_id").primaryKey(),

  // User info
  email: text("email").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),

  // Subscription plan (Stripe)
  subscriptionType: text("subscription_type", {
    enum: ["free", "pro"]
  }).notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),

  // Gmail OAuth integration
  gmailRefreshToken: text("gmail_refresh_token"), // Encrypted
  gmailAccessToken: text("gmail_access_token"),   // Encrypted (cached)
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  gmailConnected: boolean("gmail_connected").notNull().default(false),
  lastGmailScan: timestamp("last_gmail_scan"),

  // User preferences
  timezone: text("timezone").notNull().default("UTC"),
  reminderDaysBefore: text("reminder_days_before").notNull().default("1,3"), // "1,3,7" as comma-separated
  emailNotifications: boolean("email_notifications").notNull().default(true),

  // Account management
  lastActiveAt: timestamp("last_active_at"),
  deletedAt: timestamp("deleted_at"), // Soft delete

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  emailIdx: index("idx_users_email").on(table.email),
  stripeIdx: index("idx_users_stripe").on(table.stripeCustomerId),
  gmailConnectedIdx: index("idx_users_gmail_connected").on(table.gmailConnected),
}));

// ----------------------------------------------------------------------------
// 2. SUBSCRIPTIONS TABLE
// ----------------------------------------------------------------------------
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId, {
    onDelete: 'cascade'
  }),

  // Subscription details
  merchantName: text("merchant_name").notNull(),
  planName: text("plan_name"),
  category: text("category", {
    enum: [
      "ai_tools",
      "design",
      "video_editing",
      "productivity",
      "analytics",
      "marketing",
      "development",
      "finance",
      "entertainment",
      "education",
      "other"
    ]
  }),

  // Branding
  logoUrl: text("logo_url"),
  logoFetchedAt: timestamp("logo_fetched_at"),

  // Billing information
  amount: text("amount").notNull(), // Store as text: "15.99" (avoids decimal precision issues)
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "annual", "quarterly", "weekly"]
  }).notNull(),

  // Dates
  firstBillingDate: timestamp("first_billing_date"),
  nextBillingDate: timestamp("next_billing_date"),
  trialEndDate: timestamp("trial_end_date"),

  // Status
  status: text("status", {
    enum: ["active", "trial", "cancelled", "paused"]
  }).notNull().default("active"),

  // Cancellation info
  cancelledDate: timestamp("cancelled_date"),
  accessEndsDate: timestamp("access_ends_date"), // When user loses access (might be after cancellation)

  // Metadata
  cancellationUrl: text("cancellation_url"),
  notes: text("notes"),
  isManualEntry: boolean("is_manual_entry").notNull().default(false),
  confidence: text("confidence", {
    enum: ["high", "medium", "low"]
  }),

  // Audit
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("idx_subs_user").on(table.userId),
  statusIdx: index("idx_subs_status").on(table.status),
  trialEndIdx: index("idx_subs_trial_end").on(table.trialEndDate),
  nextBillingIdx: index("idx_subs_next_billing").on(table.nextBillingDate),
  merchantIdx: index("idx_subs_merchant").on(table.merchantName),
  userStatusIdx: index("idx_subs_user_status").on(table.userId, table.status),
}));

// ----------------------------------------------------------------------------
// 3. PARSED EMAILS TABLE
// ----------------------------------------------------------------------------
export const parsedEmails = pgTable("parsed_emails", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId, {
    onDelete: 'cascade'
  }),

  // Gmail info
  gmailMessageId: text("gmail_message_id").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  receivedAt: timestamp("received_at").notNull(),

  // Email content (limited for privacy)
  emailSnippet: text("email_snippet"), // First 500 chars only

  // Parsing results
  parsingStatus: text("parsing_status", {
    enum: ["pending", "success", "failed", "skipped"]
  }).notNull().default("pending"),

  extractedData: text("extracted_data"), // JSON string (use jsonb in PostgreSQL)
  subscriptionId: integer("subscription_id").references(() => subscriptions.id, {
    onDelete: 'set null'
  }),
  errorMessage: text("error_message"),

  // Privacy: Auto-delete after 30 days
  retentionUntil: timestamp("retention_until").notNull().$defaultFn(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }),

  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  // Unique constraint: Can't process same email twice for same user
  uniqueEmailIdx: unique("idx_parsed_unique").on(table.userId, table.gmailMessageId),
  statusIdx: index("idx_parsed_status").on(table.parsingStatus),
  subscriptionIdx: index("idx_parsed_subscription").on(table.subscriptionId),
  retentionIdx: index("idx_parsed_retention").on(table.retentionUntil),
}));

// ----------------------------------------------------------------------------
// 4. REMINDER LOGS TABLE
// ----------------------------------------------------------------------------
export const reminderLogs = pgTable("reminder_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId, {
    onDelete: 'cascade'
  }),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id, {
    onDelete: 'cascade'
  }),

  // Reminder details
  reminderType: text("reminder_type", {
    enum: ["trial_ending", "renewal_upcoming", "price_change"]
  }).notNull(),
  daysBeforeEvent: integer("days_before_event").notNull(), // 1, 3, or 7

  // Email tracking
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),

  // SendGrid tracking (for future)
  sendgridMessageId: text("sendgrid_message_id"),

  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  subscriptionIdx: index("idx_reminders_sub").on(table.subscriptionId),
  sentIdx: index("idx_reminders_sent").on(table.sentAt),
  // Unique constraint: Only one reminder of each type per subscription per day
  uniqueReminderIdx: unique("idx_reminders_unique").on(
    table.subscriptionId,
    table.reminderType,
    // Note: In actual SQL, you'd use DATE(sentAt), but Drizzle doesn't support functions in unique constraints
    // We'll enforce this in application logic instead
  ),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(subscriptions),
  parsedEmails: many(parsedEmails),
  reminderLogs: many(reminderLogs),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.firebaseId],
  }),
  parsedEmails: many(parsedEmails),
  reminderLogs: many(reminderLogs),
}));

export const parsedEmailsRelations = relations(parsedEmails, ({ one }) => ({
  user: one(users, {
    fields: [parsedEmails.userId],
    references: [users.firebaseId],
  }),
  subscription: one(subscriptions, {
    fields: [parsedEmails.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  user: one(users, {
    fields: [reminderLogs.userId],
    references: [users.firebaseId],
  }),
  subscription: one(subscriptions, {
    fields: [reminderLogs.subscriptionId],
    references: [subscriptions.id],
  }),
}));

// ============================================================================
// ZOD SCHEMAS (for validation)
// ============================================================================

export const insertUserSchema = createInsertSchema(users, {
  firebaseId: (schema) => schema,
  email: (schema) => schema.email(),
  subscriptionType: (schema) => schema.default("free"),
  timezone: (schema) => schema.default("UTC"),
  reminderDaysBefore: (schema) => schema.default("1,3"),
  emailNotifications: (schema) => schema.default(true),
  gmailConnected: (schema) => schema.default(false),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions, {
  merchantName: (schema) => schema.min(1, "Merchant name is required"),
  amount: (schema) => schema.regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid number"),
  currency: (schema) => schema.default("USD"),
  status: (schema) => schema.default("active"),
  isManualEntry: (schema) => schema.default(false),
});

export const insertParsedEmailSchema = createInsertSchema(parsedEmails, {
  gmailMessageId: (schema) => schema.min(1),
  fromEmail: (schema) => schema.email(),
  subject: (schema) => schema.min(1),
  parsingStatus: (schema) => schema.default("pending"),
});

export const insertReminderLogSchema = createInsertSchema(reminderLogs, {
  reminderType: (schema) => schema,
  daysBeforeEvent: (schema) => schema.int().positive(),
});

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertParsedEmail = z.infer<typeof insertParsedEmailSchema>;
export type ParsedEmail = typeof parsedEmails.$inferSelect;

// @ts-expect-error - Zod v3/v4 typing conflict with drizzle-zod
export type InsertReminderLog = z.infer<typeof insertReminderLogSchema>;
export type ReminderLog = typeof reminderLogs.$inferSelect;
```

---

## Migration Steps

### Step 1: Remove Old Schema

If starting from template, first remove these tables:
```typescript
// Remove from shared/schema.ts:
- items table
- files table
- aiThreads table
- aiMessages table
```

### Step 2: Update Users Table

The template already has a `users` table. Update it with new fields:
```typescript
// Add to existing users table:
+ gmailRefreshToken
+ gmailAccessToken
+ gmailTokenExpiry
+ gmailConnected
+ lastGmailScan
+ timezone
+ reminderDaysBefore
+ lastActiveAt
+ deletedAt
```

### Step 3: Add New Tables

```bash
# Generate migration
npm run db:generate

# Review the SQL in server/migrations/
# Should see:
# - ALTER TABLE users ADD COLUMN...
# - CREATE TABLE subscriptions...
# - CREATE TABLE parsed_emails...
# - CREATE TABLE reminder_logs...
# - CREATE INDEX...

# Apply migration
npm run db:migrate
```

### Step 4: Verify Database

```sql
-- Check tables exist
\dt

-- Should see:
-- users
-- subscriptions
-- parsed_emails
-- reminder_logs

-- Check indexes
\di

-- Should see all indexes from schema
```

---

## Data Cleanup Background Job

Create a background job to enforce 30-day email retention:

```typescript
// server/jobs/dataCleanupJob.ts

import { db } from '../db';
import { parsedEmails } from '../../shared/schema';
import { lt } from 'drizzle-orm';

// Run daily at 3am
export async function cleanupOldEmails() {
  const now = new Date();

  const deleted = await db.delete(parsedEmails)
    .where(lt(parsedEmails.retentionUntil, now))
    .returning();

  console.log(`Cleaned up ${deleted.length} old parsed emails`);
  return deleted.length;
}
```

---

## Soft Delete Implementation

```typescript
// server/lib/userDeletion.ts

import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export async function softDeleteUser(firebaseId: string) {
  // Mark user as deleted (keeps data for 30 days)
  await db.update(users)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.firebaseId, firebaseId));

  // Disconnect Gmail
  await db.update(users)
    .set({
      gmailRefreshToken: null,
      gmailAccessToken: null,
      gmailConnected: false
    })
    .where(eq(users.firebaseId, firebaseId));
}

export async function hardDeleteUser(firebaseId: string) {
  // Permanently delete (cascades to subscriptions, emails, reminders)
  await db.delete(users)
    .where(eq(users.firebaseId, firebaseId));
}

// Background job: Delete users after 30 days
export async function cleanupDeletedUsers() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const deletedUsers = await db.query.users.findMany({
    where: (users, { lt, isNotNull, and }) => and(
      isNotNull(users.deletedAt),
      lt(users.deletedAt, thirtyDaysAgo)
    )
  });

  for (const user of deletedUsers) {
    await hardDeleteUser(user.firebaseId);
  }

  console.log(`Permanently deleted ${deletedUsers.length} users`);
}
```

---

## Key Design Decisions Implemented

✅ **Duplicates Allowed**
- No unique constraint on (userId, merchantName)
- Users can have multiple Netflix subscriptions
- User manually manages/merges duplicates

✅ **30-Day Email Retention**
- `retentionUntil` timestamp auto-set
- Background job deletes old emails daily
- Keeps database lean, GDPR-compliant

✅ **Soft Delete for Users**
- `deletedAt` timestamp for marking deletion
- Data kept for 30 days (recovery window)
- Background job hard-deletes after 30 days

✅ **Categories as Enum**
- Predefined list in schema
- Fast queries, no joins
- Can migrate to table in Phase 2

✅ **Simplified MVP**
- No subscriptionActivityLog (add Phase 2)
- No payment method tracking (add Phase 2)
- No delivery status tracking (add Phase 2)
- Focus on core features first

---

## Database Size Estimates

**Per user (average 10 subscriptions):**
```
Users table:         1 row  (~500 bytes)
Subscriptions:      10 rows (~5 KB)
Parsed emails:      30 rows (~15 KB, deleted after 30 days)
Reminder logs:      20 rows (~2 KB)

Total per user: ~22.5 KB
```

**At scale:**
```
1,000 users   = ~22.5 MB
10,000 users  = ~225 MB
100,000 users = ~2.25 GB
```

**Neon free tier:** 0.5GB storage - supports ~22,000 users

---

## Schema Comparison: Template vs EmailSubTracker

**Removed from template:**
- ❌ items table → replaced with subscriptions
- ❌ files table → not needed
- ❌ aiThreads table → not needed
- ❌ aiMessages table → not needed

**Kept from template:**
- ✅ users table (extended with Gmail fields)

**Added for EmailSubTracker:**
- ✨ subscriptions table
- ✨ parsedEmails table
- ✨ reminderLogs table

---

## Next Steps

1. ✅ Copy this schema to `shared/schema.ts`
2. ✅ Remove old tables (items, files, aiThreads, aiMessages)
3. ✅ Run `npm run db:generate`
4. ✅ Review generated migration SQL
5. ✅ Run `npm run db:migrate`
6. ✅ Verify in database

**Ready to proceed with Week 1 implementation!**
