# EmailSubTracker - Data Model Analysis
## Comprehensive Database Schema Review

**Version:** 1.0
**Date:** November 8, 2025

---

## Current Schema Overview

From the PRD, we have 4 main tables:
1. `users` - User accounts (from template + Gmail fields)
2. `subscriptions` - Tracked subscriptions
3. `parsedEmails` - Email parsing history
4. `reminderLogs` - Reminder tracking

---

## Table-by-Table Analysis

### 1. Users Table

**Current Design:**
```typescript
users {
  firebaseId: text (PK)          // Firebase Auth UID
  email: text
  firstName: text
  lastName: text

  // Subscription plan
  subscriptionType: "free" | "pro"
  stripeCustomerId: text

  // Gmail OAuth
  gmailRefreshToken: text        // Encrypted
  gmailAccessToken: text         // Encrypted
  gmailTokenExpiry: timestamp
  gmailConnected: boolean
  lastGmailScan: timestamp

  // Settings
  emailNotifications: boolean

  // Audit
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Issues Identified:**
1. ❌ Missing `deletedAt` for soft deletes
2. ❌ No timezone field (needed for "send reminders at 9am user time")
3. ❌ No preference for reminder timing (3 days vs 7 days)
4. ⚠️ Legacy fields from template (address, city, state, postalCode, isPremium) - should we keep?

**Recommended Changes:**
```typescript
users {
  // ... existing fields

  // NEW: User preferences
  timezone: text                 // "America/New_York", needed for timed reminders
  reminderDaysBefore: integer[]  // [1, 3, 7] - which days before trial ends to send reminder

  // NEW: Account management
  deletedAt: timestamp           // Soft delete
  lastActiveAt: timestamp        // Last time user logged in

  // REMOVE (not needed for subscription tracker):
  // - address, city, state, postalCode (billing address - Stripe handles this)
  // - isPremium (redundant with subscriptionType)
}
```

**Relationships:**
- ✅ `users` → `subscriptions` (one-to-many)
- ✅ `users` → `parsedEmails` (one-to-many)
- ✅ `users` → `reminderLogs` (one-to-many)

---

### 2. Subscriptions Table

**Current Design:**
```typescript
subscriptions {
  id: serial (PK)
  userId: text (FK → users.firebaseId)

  // Subscription details
  merchantName: text
  planName: text
  category: text                 // "AI Tools", "Design", etc.
  logoUrl: text

  // Billing
  amount: decimal(10,2)
  currency: text
  billingCycle: "monthly" | "annual" | "quarterly" | "weekly" | "custom"
  customBillingDays: integer     // For custom cycles

  // Dates
  firstBillingDate: timestamp
  nextBillingDate: timestamp
  trialEndDate: timestamp
  cancelledDate: timestamp

  // Status
  status: "active" | "trial" | "cancelled" | "paused"

  // Metadata
  cancellationUrl: text
  notes: text
  sourceEmailId: text            // Gmail message ID
  isManualEntry: boolean

  // Audit
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Critical Issues:**

#### Issue 1: Duplicate Subscriptions (No Unique Constraint)
```
Problem:
User has Netflix on 3 different cards → 3 separate subscriptions
Current schema: Creates 1 subscription (first one found)
What we need: Track all 3

Example:
- Netflix Personal ($15.99/month) - Card ending 1234
- Netflix Business ($15.99/month) - Card ending 5678
- Netflix Family ($19.99/month) - Card ending 9012

Solution: Need compound unique key or better duplicate detection
```

**Recommended:**
```typescript
// Add unique constraint (but allow multiple if different plans/amounts):
// UNIQUE(userId, merchantName, planName, amount) - NO, too strict
// Better: Let duplicates exist, show user to merge/delete manually
```

#### Issue 2: Price Changes Not Tracked
```
Problem:
Netflix raises price from $15.99 → $17.99
Current: Just updates amount, loses history

What we need:
- Know when price changed
- Alert user about price increases
```

**Solution: Add Subscription History Table**
```typescript
subscriptionPriceHistory {
  id: serial (PK)
  subscriptionId: integer (FK → subscriptions.id)

  oldAmount: text
  newAmount: text
  changedAt: timestamp
  detectedFrom: text             // "email" or "manual"

  createdAt: timestamp
}
```

#### Issue 3: Multiple Emails for Same Subscription
```
Problem:
User gets 3 emails for ChatGPT Plus:
1. Welcome email (signup)
2. Receipt email (monthly charge)
3. Renewal reminder

Current: sourceEmailId points to one email only

What we need: Link ALL emails to the subscription
```

**Solution: Change relationship**
```typescript
// Instead of:
subscriptions.sourceEmailId: text

// Use many-to-many:
parsedEmails.subscriptionId → subscriptions.id (already exists!)

// Just remove sourceEmailId from subscriptions
```

#### Issue 4: Category as Text (Not Normalized)
```
Problem:
User types: "AI tools", "AI Tools", "ai-tools", "Artificial Intelligence"
Result: 4 different categories for same thing

Solution: Predefined categories or separate table
```

**Option A: Enum (Simple, Good for MVP)**
```typescript
category: text {
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
}
```

**Option B: Separate Table (Better for Future)**
```typescript
categories {
  id: serial (PK)
  name: text
  slug: text
  icon: text                     // Icon name for UI
}

subscriptions {
  categoryId: integer (FK → categories.id)
}
```

**Recommendation: Start with Option A (enum), migrate to Option B in Phase 2**

#### Issue 5: No Payment Method Tracking
```
Problem:
User has 5 subscriptions on Card A, 3 on Card B
Want to: "Show me all subscriptions on this card"
Current: Can't do this

Future feature: When user deletes card, warn about subscriptions
```

**Add field:**
```typescript
subscriptions {
  // NEW:
  paymentMethod: text            // "Card ending 1234", "PayPal", "Bank account"
  paymentMethodLast4: text       // "1234" - easier to match
}
```

#### Issue 6: Cancelled Subscriptions (Incomplete Data)
```
Problem:
User cancels Netflix, but:
- Access until end of billing period (Dec 31)
- Current schema: Just cancelledDate

What we need:
- When cancelled
- When access ends
- Why cancelled (optional)
```

**Add fields:**
```typescript
subscriptions {
  cancelledDate: timestamp       // When user cancelled
  accessEndsDate: timestamp      // When they lose access (might be future)
  cancellationReason: text       // Optional: "too expensive", "not using", etc.
}
```

#### Issue 7: Merchant Logo URL (Potential Issues)
```
Problem:
logoUrl from Brandfetch API might:
- Break (404)
- Change format
- Get rate limited

Better: Store logo locally or have fallback
```

**Add field:**
```typescript
subscriptions {
  logoUrl: text                  // External URL from Brandfetch
  logoFetchedAt: timestamp       // When we got it (re-fetch if old)
  logoFallback: text             // First letter of merchant name for avatar
}
```

---

### 3. Parsed Emails Table

**Current Design:**
```typescript
parsedEmails {
  id: serial (PK)
  userId: text (FK → users.firebaseId)

  gmailMessageId: text           // Gmail API message ID
  fromEmail: text
  subject: text
  receivedAt: timestamp
  rawEmailBody: text             // Full email body

  parsingStatus: "pending" | "success" | "failed" | "manual_review"
  extractedData: text            // JSON string of parsed data
  subscriptionId: integer (FK → subscriptions.id)

  createdAt: timestamp
}
```

**Issues:**

#### Issue 1: Storing Full Email Body (Privacy + Storage)
```
Problem:
- rawEmailBody could be 50KB per email
- Privacy concern: storing personal emails
- GDPR: User deletes account, do we delete emails?

Recommendation:
- Store only what we need (subject + key excerpts)
- Add retention policy (delete after 30 days)
```

**Changes:**
```typescript
parsedEmails {
  rawEmailBody: text             // REMOVE or limit to 1000 chars

  // NEW:
  emailSnippet: text             // First 500 chars for debugging
  retentionUntil: timestamp      // Auto-delete after 30 days
}
```

#### Issue 2: No Index on gmailMessageId
```
Problem:
Looking up "Have we already processed this email?" does full table scan

Solution: Add unique index
```

**Add constraint:**
```typescript
// Unique constraint: One user can't process same email twice
UNIQUE(userId, gmailMessageId)
```

#### Issue 3: extractedData as JSON String (Type-Unsafe)
```
Problem:
Hard to query: "Show me all emails where we extracted amount > $100"

Better: Structured columns
```

**Option A: Keep as JSON (simpler for MVP)**
**Option B: Normalize**
```typescript
parsedEmails {
  // Instead of extractedData JSON, add:
  extractedMerchant: text
  extractedAmount: text
  extractedCurrency: text
  extractedBillingCycle: text
  extractedConfidence: text
}
```

**Recommendation: Keep JSON for MVP, but add jsonb type**
```typescript
extractedData: jsonb           // PostgreSQL JSONB for better querying
```

---

### 4. Reminder Logs Table

**Current Design:**
```typescript
reminderLogs {
  id: serial (PK)
  userId: text (FK → users.firebaseId)
  subscriptionId: integer (FK → subscriptions.id)

  reminderType: "trial_ending" | "renewal_upcoming" | "price_change"
  daysBeforeEvent: integer       // 3 or 1
  sentAt: timestamp
  opened: boolean
  clicked: boolean
}
```

**Issues:**

#### Issue 1: No Email Delivery Status
```
Problem:
Email sent but:
- Bounced (invalid email)
- Marked as spam
- SendGrid failed to deliver

Current: Just "sent"
```

**Add fields:**
```typescript
reminderLogs {
  sentAt: timestamp
  deliveryStatus: "sent" | "delivered" | "bounced" | "failed" | "spam"
  deliveredAt: timestamp
  openedAt: timestamp
  clickedAt: timestamp

  sendgridMessageId: text        // For tracking in SendGrid
  errorMessage: text             // If delivery failed
}
```

#### Issue 2: What Action Did User Take?
```
Problem:
User clicked reminder, then what?
- Cancelled subscription?
- Kept it?
- Updated payment?

No way to measure reminder effectiveness
```

**Add field:**
```typescript
reminderLogs {
  actionTaken: "cancelled" | "kept" | "snoozed" | "none"
  actionTakenAt: timestamp
}
```

#### Issue 3: Duplicate Reminders (No Constraint)
```
Problem:
Background job runs twice → sends 2 reminders

Solution: Unique constraint
```

**Add:**
```typescript
// Can only send one reminder of each type per subscription per day
UNIQUE(subscriptionId, reminderType, DATE(sentAt))
```

---

## Missing Tables

### 1. Subscription Activity Log (Important!)

**Why we need it:**
```
User asks: "When did I start paying for Notion?"
Current: Only createdAt (when WE detected it, not when THEY started)

User asks: "Show me history of this subscription"
Current: Can't see plan changes, pauses, reactivations
```

**New Table:**
```typescript
subscriptionActivityLog {
  id: serial (PK)
  subscriptionId: integer (FK → subscriptions.id)
  userId: text (FK → users.firebaseId)

  activityType: text {
    enum: [
      "created",              // First detected
      "price_changed",        // Amount updated
      "plan_changed",         // Upgraded/downgraded
      "paused",              // User paused billing
      "resumed",             // Reactivated
      "cancelled",           // User cancelled
      "trial_started",       // Trial began
      "trial_converted",     // Trial → paid
      "payment_failed"       // Payment issue detected
    ]
  }

  // Before/after values (JSON for flexibility)
  previousValue: jsonb
  newValue: jsonb

  // Source
  detectedFrom: "email" | "manual" | "system"
  sourceEmailId: text            // If from email

  createdAt: timestamp
}
```

**Example records:**
```json
// When subscription created
{
  "activityType": "created",
  "newValue": {"merchant": "Netflix", "amount": "15.99"},
  "detectedFrom": "email",
  "sourceEmailId": "abc123"
}

// When price increased
{
  "activityType": "price_changed",
  "previousValue": {"amount": "15.99"},
  "newValue": {"amount": "17.99"},
  "detectedFrom": "email"
}
```

### 2. Categories Table (Optional for MVP)

**If we want predefined categories:**
```typescript
categories {
  id: serial (PK)
  name: text                     // "AI Tools"
  slug: text                     // "ai_tools"
  icon: text                     // "brain" (lucide icon name)
  description: text
  sortOrder: integer

  createdAt: timestamp
}

// Then subscriptions.category becomes:
subscriptions {
  categoryId: integer (FK → categories.id)
}
```

**Seed data:**
```sql
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('AI Tools', 'ai_tools', 'brain', 1),
  ('Design', 'design', 'palette', 2),
  ('Video Editing', 'video', 'video', 3),
  ('Productivity', 'productivity', 'check-square', 4),
  ('Analytics', 'analytics', 'bar-chart', 5),
  ('Marketing', 'marketing', 'megaphone', 6);
```

---

## Data Relationship Diagram

```
users (1) ──────< (M) subscriptions
  │                      │
  │                      │
  │                      ├──< (M) subscriptionActivityLog
  │                      │
  │                      └──< (M) reminderLogs
  │
  └──────< (M) parsedEmails
                  │
                  └── (0..1) → subscriptions (nullable FK)


Optional:
categories (1) ──< (M) subscriptions
```

**Key Relationships:**

1. **User → Subscriptions** (1:M)
   - One user has many subscriptions
   - Delete user → CASCADE delete subscriptions

2. **Subscription → Activity Log** (1:M)
   - One subscription has many activity events
   - Tracks full history

3. **Subscription → Reminder Logs** (1:M)
   - One subscription can have many reminders
   - Track all reminder attempts

4. **User → Parsed Emails** (1:M)
   - Track all emails we've processed for user
   - Prevent duplicate processing

5. **Parsed Email → Subscription** (M:1, nullable)
   - Many emails can link to one subscription
   - Some emails fail to parse (subscriptionId = null)

---

## Cascade Delete Behavior

**What happens when user deletes account?**

```sql
-- Option 1: HARD DELETE (data gone forever)
DELETE FROM users WHERE firebaseId = 'user123';
-- Cascades to: subscriptions, parsedEmails, reminderLogs, activityLog

-- Option 2: SOFT DELETE (keep data, mark as deleted)
UPDATE users SET deletedAt = NOW() WHERE firebaseId = 'user123';
-- Data remains, but user can't log in
-- Background job deletes after 30 days
```

**Recommendation: Soft delete for GDPR compliance**
```typescript
users {
  deletedAt: timestamp

  // GDPR: User can request data export before deletion
  dataExportedAt: timestamp
  dataExportUrl: text
}
```

**Cascade rules:**
```typescript
subscriptions {
  userId: references(users.firebaseId, {
    onDelete: 'CASCADE'          // Delete subscriptions when user deleted
  })
}

parsedEmails {
  userId: references(users.firebaseId, {
    onDelete: 'CASCADE'          // Delete parsed emails
  })

  subscriptionId: references(subscriptions.id, {
    onDelete: 'SET NULL'         // Keep email, just unlink from subscription
  })
}

activityLog {
  userId: references(users.firebaseId, {
    onDelete: 'CASCADE'
  })
  subscriptionId: references(subscriptions.id, {
    onDelete: 'CASCADE'          // Delete activity when subscription deleted
  })
}

reminderLogs {
  subscriptionId: references(subscriptions.id, {
    onDelete: 'CASCADE'          // Delete reminders when subscription deleted
  })
}
```

---

## Indexes for Performance

**Critical indexes:**
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe ON users(stripeCustomerId);
CREATE INDEX idx_users_gmail_connected ON users(gmailConnected) WHERE gmailConnected = true;

-- Subscriptions
CREATE INDEX idx_subs_user ON subscriptions(userId);
CREATE INDEX idx_subs_status ON subscriptions(status);
CREATE INDEX idx_subs_trial_end ON subscriptions(trialEndDate) WHERE status = 'trial';
CREATE INDEX idx_subs_next_billing ON subscriptions(nextBillingDate);
CREATE INDEX idx_subs_merchant ON subscriptions(merchantName);

-- Parsed Emails
CREATE UNIQUE INDEX idx_parsed_unique ON parsedEmails(userId, gmailMessageId);
CREATE INDEX idx_parsed_status ON parsedEmails(parsingStatus);
CREATE INDEX idx_parsed_subscription ON parsedEmails(subscriptionId);

-- Reminder Logs
CREATE INDEX idx_reminders_sub ON reminderLogs(subscriptionId);
CREATE INDEX idx_reminders_sent ON reminderLogs(sentAt);
CREATE UNIQUE INDEX idx_reminders_unique ON reminderLogs(
  subscriptionId,
  reminderType,
  DATE(sentAt)
);

-- Activity Log
CREATE INDEX idx_activity_sub ON subscriptionActivityLog(subscriptionId);
CREATE INDEX idx_activity_type ON subscriptionActivityLog(activityType);
CREATE INDEX idx_activity_created ON subscriptionActivityLog(createdAt);
```

---

## Final Recommended Schema

### Updated Tables:

```typescript
// 1. USERS (Modified)
users {
  firebaseId: text (PK)
  email: text
  firstName: text
  lastName: text

  subscriptionType: "free" | "pro"
  stripeCustomerId: text

  gmailRefreshToken: text        // Encrypted
  gmailAccessToken: text
  gmailTokenExpiry: timestamp
  gmailConnected: boolean
  lastGmailScan: timestamp

  // NEW
  timezone: text DEFAULT 'UTC'
  reminderDaysBefore: integer[] DEFAULT [1, 3]
  emailNotifications: boolean DEFAULT true
  lastActiveAt: timestamp
  deletedAt: timestamp

  createdAt: timestamp
  updatedAt: timestamp
}

// 2. SUBSCRIPTIONS (Modified)
subscriptions {
  id: serial (PK)
  userId: text (FK → users.firebaseId, CASCADE)

  merchantName: text NOT NULL
  planName: text
  categoryId: integer (FK → categories.id, SET NULL)  // Or use enum for MVP

  logoUrl: text
  logoFetchedAt: timestamp

  amount: text NOT NULL          // "15.99" (store as text to avoid decimal issues)
  currency: text DEFAULT 'USD'
  billingCycle: enum

  firstBillingDate: timestamp
  nextBillingDate: timestamp
  trialEndDate: timestamp

  status: enum DEFAULT 'active'

  cancelledDate: timestamp
  accessEndsDate: timestamp      // NEW
  cancellationReason: text       // NEW

  paymentMethod: text            // NEW: "Card ending 1234"
  paymentMethodLast4: text       // NEW

  cancellationUrl: text
  notes: text
  isManualEntry: boolean DEFAULT false
  confidence: "high" | "medium" | "low"

  createdAt: timestamp
  updatedAt: timestamp
}

// 3. PARSED EMAILS (Modified)
parsedEmails {
  id: serial (PK)
  userId: text (FK → users.firebaseId, CASCADE)
  gmailMessageId: text NOT NULL

  fromEmail: text
  subject: text
  receivedAt: timestamp
  emailSnippet: text             // CHANGED: Only 500 chars instead of full body

  parsingStatus: enum
  extractedData: jsonb           // CHANGED: jsonb instead of text
  subscriptionId: integer (FK → subscriptions.id, SET NULL)
  errorMessage: text

  retentionUntil: timestamp DEFAULT NOW() + interval '30 days'  // NEW

  createdAt: timestamp

  UNIQUE(userId, gmailMessageId)
}

// 4. REMINDER LOGS (Modified)
reminderLogs {
  id: serial (PK)
  userId: text (FK → users.firebaseId, CASCADE)
  subscriptionId: integer (FK → subscriptions.id, CASCADE)

  reminderType: enum
  daysBeforeEvent: integer

  sentAt: timestamp
  deliveryStatus: enum DEFAULT 'sent'  // NEW
  deliveredAt: timestamp               // NEW
  openedAt: timestamp
  clickedAt: timestamp

  actionTaken: enum                    // NEW
  actionTakenAt: timestamp             // NEW

  sendgridMessageId: text              // NEW
  errorMessage: text                   // NEW

  createdAt: timestamp

  UNIQUE(subscriptionId, reminderType, DATE(sentAt))
}

// 5. SUBSCRIPTION ACTIVITY LOG (NEW)
subscriptionActivityLog {
  id: serial (PK)
  subscriptionId: integer (FK → subscriptions.id, CASCADE)
  userId: text (FK → users.firebaseId, CASCADE)

  activityType: enum NOT NULL

  previousValue: jsonb
  newValue: jsonb

  detectedFrom: "email" | "manual" | "system"
  sourceEmailId: text

  createdAt: timestamp
}

// 6. CATEGORIES (OPTIONAL - for Phase 2)
categories {
  id: serial (PK)
  name: text NOT NULL
  slug: text NOT NULL UNIQUE
  icon: text
  description: text
  sortOrder: integer

  createdAt: timestamp
}
```

---

## Migration Strategy

**Don't change everything at once!**

### Phase 1 (MVP - Months 1-4):
✅ Use simplified schema:
- Skip: subscriptionActivityLog (add in Phase 2)
- Skip: categories table (use enum)
- Skip: payment method fields (add later)
- Skip: reminder delivery status (just track sent)

**Minimal MVP Schema:**
- users (with Gmail fields)
- subscriptions (basic fields only)
- parsedEmails (simplified)
- reminderLogs (basic tracking)

### Phase 2 (Months 5-7):
Add complexity:
- subscriptionActivityLog
- categories table
- Payment method tracking
- Enhanced reminder tracking

---

## Questions to Answer Before Building

1. **Duplicate subscriptions:** Allow or prevent?
   - **Recommendation:** Allow, let user manage manually

2. **Category management:** Enum or table?
   - **Recommendation:** Enum for MVP, table in Phase 2

3. **Email retention:** How long to keep parsed emails?
   - **Recommendation:** 30 days, then auto-delete

4. **Soft delete:** Keep deleted user data?
   - **Recommendation:** Yes, for GDPR compliance (30-day grace period)

5. **Price history:** Track in separate table or JSON?
   - **Recommendation:** Separate table (subscriptionActivityLog)

---

## What Do You Think?

**Key decisions for you:**

1. Do you want the full schema (with activity log, categories table) or simplified MVP version?
2. Should we allow duplicate subscriptions or enforce uniqueness?
3. Soft delete or hard delete for users?
4. How long should we keep parsed email data?

**My recommendation:** Start with **simplified MVP schema**, add complexity in Phase 2 after validating product-market fit.

Ready to finalize the schema?
