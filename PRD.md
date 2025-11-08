# Product Requirements Document (PRD)
## EmailSubTracker

**Version:** 2.0 - Gmail OAuth Primary Method
**Date:** November 8, 2025
**Author:** Product Team
**Status:** Draft - Updated for Gmail-First Approach

---

## Executive Summary

EmailSubTracker is a privacy-first subscription tracking platform that automatically detects and monitors digital subscriptions, free trials, and recurring charges by connecting to your Gmail account. Unlike traditional subscription trackers that require bank account connections, EmailSubTracker analyzes confirmation emails, receipts, and renewal notifications directly from your inbox using secure, read-only Gmail access.

**Target Market:** Content creators, small businesses, and tech-savvy professionals managing multiple SaaS tools and AI subscriptions.

**Core Value Proposition:** Track all your subscriptions without sharing banking credentials - just connect your Gmail account and we'll automatically find all your subscriptions.

---

## 1. Problem Statement

### The Pain Points

**Primary Problem:**
Users are losing money on forgotten subscriptions, unwanted renewals, and free trials that automatically convert to paid plans. The average person has 12-15 active subscriptions and wastes $133/month on unused services.

**Specific Pain Points:**
1. **Free Trial Fatigue** - Users sign up for free trials (especially AI tools) and forget to cancel before billing starts
2. **Manual Tracking is Tedious** - Spreadsheets become outdated quickly and require constant maintenance
3. **Bank Connection Anxiety** - Many users are uncomfortable connecting bank accounts to third-party apps (privacy concerns, security risks)
4. **Subscription Sprawl** - Content creators and small businesses juggle 20+ tools (design, video editing, analytics, email marketing, AI tools)
5. **Price Change Blindness** - Annual renewals and price increases happen without warning
6. **Cancellation is Hard** - Users don't know which subscriptions they have or where to cancel them

**Why Existing Solutions Fall Short:**
- **Rocket Money/Truebill** - Requires bank connection, focuses on bill negotiation (not our target market's need)
- **SubTracker/Bobby** - Manual entry only, no automation
- **Spreadsheets** - Time-consuming, no reminders, gets outdated
- **Bank statements** - Reactive (see charges after they happen), hard to track free trials

---

## 2. Target Users & Personas

### Primary Personas

#### Persona 1: "AI Tool Hunter Alex"
- **Demographics:** 28-35, tech startup founder or indie maker
- **Behavior:** Signs up for 5-10 new AI tools monthly (ChatGPT Plus, Midjourney, Claude, various APIs)
- **Pain:** Can't remember which tools have free trials ending or which subscriptions are worth keeping
- **Goals:** Optimize SaaS spend, avoid surprise charges, evaluate tools before committing
- **Tech Savviness:** High - comfortable with API integrations and automation
- **Quote:** "I signed up for so many AI tools during a hackathon that I lost track and got charged $200 last month for stuff I forgot about."

#### Persona 2: "Content Creator Casey"
- **Demographics:** 24-32, YouTuber/TikToker/Podcaster, earning $2-10K/month
- **Behavior:** Uses 15-20 tools (Epidemic Sound, Adobe Creative Cloud, Canva, TubeBuddy, VidIQ, editing software)
- **Pain:** Business expense tracking is a mess, doesn't know actual monthly overhead
- **Goals:** Track business expenses, identify which tools provide ROI, prepare for tax season
- **Tech Savviness:** Medium - comfortable with web apps but not technical
- **Quote:** "I need to know exactly what I'm spending on tools so I can decide which ones are actually helping me grow."

#### Persona 3: "Small Business Owner Sam"
- **Demographics:** 35-50, runs 5-25 person company, wears multiple hats
- **Behavior:** Company uses 25+ SaaS tools (Slack, Zoom, Asana, HubSpot, QuickBooks, etc.)
- **Pain:** Subscriptions spread across multiple company credit cards, hard to audit
- **Goals:** Reduce unnecessary spend, track which team members use what tools, prepare for budget reviews
- **Tech Savviness:** Medium - delegates technical stuff but makes purchasing decisions
- **Quote:** "We're definitely paying for tools nobody uses anymore, but I don't have time to audit every credit card statement."

### Secondary Persona

#### Persona 4: "Privacy-Conscious Petra"
- **Demographics:** 30-45, works in tech or legal field
- **Behavior:** Refuses to connect bank accounts to third-party apps
- **Pain:** Manual tracking is tedious, existing tools require bank access
- **Goals:** Track subscriptions without compromising financial privacy
- **Tech Savviness:** High - understands security implications
- **Quote:** "I'm not giving some app access to my entire financial history just to track subscriptions."

---

## 3. Competitive Landscape

### Direct Competitors

| Product | Pricing | Strengths | Weaknesses | Our Advantage |
|---------|---------|-----------|------------|---------------|
| **Rocket Money** (formerly Truebill) | $6-12/month (choose your price) | Bill negotiation, automated detection via bank | Requires bank connection, iOS/Android only (no web) | Email-based (no bank needed), web platform |
| **SubTracker** | Freemium | Clean UI, cross-platform (iOS/Android/Web) | Manual entry only, no automation | Automatic email parsing |
| **Bobby** | One-time $10-15 | Minimal design, popular with designers | iOS only, manual entry | Cross-platform, automated |
| **Trim** | Free + success fee for negotiations | Bill negotiation, automated | Requires bank connection, focused on negotiation not tracking | Privacy-first, no bank needed |
| **Monarch Money** | $99/year or $14.99/month | Full budgeting suite, flex budgeting | Expensive, requires bank connection, overkill for subscription tracking | Focused on subscriptions only, cheaper |

### Indirect Competitors

- **Spreadsheets (Excel/Google Sheets)** - Free, flexible, but manual and no reminders
- **Calendar reminders** - Free, but requires manual setup for each subscription
- **Bank/credit card alerts** - Free, but reactive (alerts after charge happens)

### Competitive Advantages

1. **Privacy-First Approach** - No bank connection required
2. **Email Parsing Automation** - Automatically detects subscriptions from confirmation emails
3. **Free Trial Focus** - Specialized reminders for trial end dates (competitor gap)
4. **AI Tool Friendly** - Understands API subscriptions, usage-based billing, and modern SaaS patterns
5. **Multi-Email Support** - Track subscriptions across multiple email addresses (personal + business)
6. **Forward-to-Track** - Unique email address for forwarding receipts (for non-connected inboxes)

---

## 4. Product Vision & Strategy

### Vision Statement
*"Make subscription tracking effortless and private, so people never lose money to forgotten free trials or unwanted renewals."*

### Product Strategy

**Phase 1: Gmail-Based MVP (Months 1-4)**
- Gmail OAuth integration with read-only access
- Automatic inbox scanning for subscription emails
- AI-powered email parsing for subscription detection
- Basic subscription dashboard
- Free trial end date reminders
- Free tier: 10 subscriptions, Pro tier: unlimited

**Phase 2: Enhanced Features & Multi-Email (Months 5-7)**
- Outlook/Microsoft 365 OAuth integration
- Multiple email account support
- Manual subscription entry (for non-email subscriptions)
- Email forwarding option (for non-Gmail users)
- Bulk historical email import (scan last 12 months)

**Phase 3: Intelligence & Insights (Months 8-10)**
- Spending analytics and trends
- Duplicate subscription detection
- Cost optimization recommendations
- Export for expense reports/taxes
- Price change detection

**Phase 4: Team & Business Features (Months 11-12)**
- Multi-user accounts for businesses
- Team subscription management
- Approval workflows
- Slack/email notifications for team renewals

---

## 5. Core Features & MVP Scope

### MVP Features (Launch in 4 Months)

#### Feature 1: Gmail OAuth Integration & Automatic Subscription Detection
**Description:** Users connect their Gmail account via OAuth (read-only access), and the system automatically scans their inbox for subscription-related emails and extracts subscription details.

**User Story:** As a user, I want to connect my Gmail account so that all my subscriptions are automatically detected without me having to do anything manually.

**Acceptance Criteria:**
- [ ] User can connect Gmail account via OAuth 2.0 (Google Sign-In)
- [ ] System requests minimal permissions (read-only access to Gmail)
- [ ] System scans inbox for subscription emails (last 6 months on first scan)
- [ ] Successfully identifies and extracts subscription details from 20+ common patterns (Stripe, PayPal, Apple, Google Play, direct merchants)
- [ ] Automatically detects new subscription emails going forward (daily scan)
- [ ] Displays scanning progress to user ("Found 12 subscriptions... analyzing...")
- [ ] Successfully extracted subscriptions appear in dashboard within 2 minutes
- [ ] User can manually trigger a re-scan if needed
- [ ] Clear privacy messaging: "We only read subscription emails, never personal emails"

**Technical Implementation:**
- Use Google OAuth 2.0 with `gmail.readonly` scope
- Store encrypted OAuth refresh tokens in database
- Use Gmail API to search for subscription-related emails with filters:
  - Subject contains: "subscription", "receipt", "invoice", "payment confirmation", "trial", "renewal"
  - From domains: stripe.com, paypal.com, apple.com, etc.
  - Labels: "Purchases", "Receipts" (if user has labeled them)
- Parse emails using hybrid approach: pattern matching (fast, 80% accuracy) + AI fallback (GPT-4o for complex emails)
- Store subscription data in `subscriptions` table with link to source email ID
- Background job checks for new emails daily
- Rate limiting to respect Gmail API quotas (10,000 requests/day free tier)

---

#### Feature 2: Subscription Dashboard
**Description:** Central view of all tracked subscriptions with key details and upcoming charges.

**User Story:** As a user, I want to see all my subscriptions in one place so I can understand what I'm paying for and when charges will occur.

**Acceptance Criteria:**
- [ ] Display list of active subscriptions with: logo, name, cost, billing frequency, next charge date, status (active/trial/cancelled)
- [ ] Show total monthly cost (calculated across all subscriptions)
- [ ] Show total annual cost projection
- [ ] Filter by status (active, trial, cancelled), category (video, design, AI, etc.), or billing cycle
- [ ] Search subscriptions by name or merchant
- [ ] Sort by cost, next charge date, or alphabetically

**UI/UX:**
- Card-based layout (similar to SubTracker)
- Color coding for subscription status (green = active, yellow = trial ending soon, red = cancelled but still has access)
- Quick actions: Edit, Cancel (mark as cancelled), Archive

---

#### Feature 3: Free Trial Reminders
**Description:** Smart notifications before free trials convert to paid subscriptions.

**User Story:** As a user, I want to be reminded before my free trial ends so I can decide whether to keep or cancel the subscription.

**Acceptance Criteria:**
- [ ] Detect free trial period from confirmation emails (e.g., "14-day free trial")
- [ ] Send email reminder 3 days before trial ends
- [ ] Send email reminder 1 day before trial ends
- [ ] Send email reminder on the day trial ends
- [ ] Allow users to customize reminder timing (3-7-1 days, or custom)
- [ ] Display "Trial ends in X days" prominently in dashboard

**Technical Implementation:**
- Background job (cron) checks for upcoming trial end dates daily
- Email notifications via SendGrid
- Store reminder preferences in user settings table
- Track notification delivery status

---

#### Feature 4: Manual Subscription Entry
**Description:** Users can manually add subscriptions that don't have email confirmations or for subscriptions they've already signed up for.

**User Story:** As a user, I want to manually add subscriptions so I can track everything even if I don't have the confirmation email anymore.

**Acceptance Criteria:**
- [ ] Form to add subscription with fields: Name, Cost, Billing frequency (monthly/annual/custom), Next billing date, Category, Notes
- [ ] Optional fields: Logo upload or URL to fetch logo, Trial end date, Cancellation link
- [ ] Validation for required fields
- [ ] Auto-suggest merchant names and logos based on input
- [ ] Quick-add for popular services (ChatGPT Plus, Adobe, Netflix, etc.)

---

#### Feature 5: Subscription Details & Edit
**Description:** View detailed information about a subscription and edit details.

**User Story:** As a user, I want to update subscription details when prices change or billing dates shift.

**Acceptance Criteria:**
- [ ] Click subscription card to view details modal/page
- [ ] Show: Full history (when added, price changes), Original confirmation email (if available), Cancellation link, Notes
- [ ] Edit mode allows updating all fields
- [ ] Mark as "Cancelled" with optional date when access ends
- [ ] Add tags/categories
- [ ] Upload related documents (receipts, contracts)

---

#### Feature 6: Upcoming Charges Calendar
**Description:** Calendar view of all upcoming subscription charges.

**User Story:** As a user, I want to see when charges will hit my account so I can plan my cash flow.

**Acceptance Criteria:**
- [ ] Calendar view showing subscription charges by date
- [ ] Month view as default
- [ ] Show daily total cost
- [ ] Click date to see which subscriptions charge that day
- [ ] Highlight expensive charge days
- [ ] Export to Google Calendar/iCal

---

#### Feature 7: User Profile & Settings
**Description:** Manage account settings, notification preferences, and subscription limits.

**User Story:** As a user, I want to customize my experience and manage my account.

**Acceptance Criteria:**
- [ ] View/edit profile (name, email)
- [ ] Email notification preferences (trial reminders, weekly summaries, renewal alerts)
- [ ] Display unique forwarding email address
- [ ] Subscription plan (Free: 10 subs, Pro: unlimited)
- [ ] Delete account option

---

### MVP Out of Scope (Post-Launch)

These features are valuable but not critical for launch:
- ❌ Outlook/Microsoft 365 OAuth integration (Gmail first, then expand)
- ❌ Email forwarding for non-Gmail users (Phase 2 feature)
- ❌ Mobile apps (web-first, responsive design sufficient for MVP)
- ❌ Bill negotiation (stay focused on tracking, not cost reduction)
- ❌ Team/multi-user accounts (B2C first, B2B later)
- ❌ Receipt OCR scanning (email parsing sufficient for MVP)
- ❌ Browser extension to detect subscriptions (future enhancement)
- ❌ Advanced spending analytics and trends (basic dashboard sufficient for MVP)
- ❌ Integration with other tools (Zapier, Slack, etc.)
- ❌ Historical email import beyond 6 months (6 months sufficient for MVP)

---

## 6. User Flows

### Flow 1: New User Onboarding

```
1. User visits emailsubtracker.com
2. Clicks "Sign Up with Google" (Firebase Auth + Gmail OAuth)
3. Google OAuth consent screen shows:
   - "EmailSubTracker wants to view your emails"
   - Explanation: "We only read subscription-related emails to track your subscriptions"
   - Permissions: "Read-only access to Gmail"
4. User clicks "Allow"
5. Completes brief profile: Name, use case (Content Creator / Small Business / Personal)
6. System immediately starts scanning Gmail:
   - Progress indicator: "Scanning your inbox for subscriptions..."
   - "Found 8 subscription emails... analyzing..."
   - "Extracting details from Stripe receipts..."
7. Within 1-2 minutes, dashboard loads showing discovered subscriptions
8. Tutorial overlay: "We found these subscriptions! Review and edit if needed"
9. Call-to-action: "Set up trial reminders" or "Add any missing subscriptions manually"
```

**Success Metric:** 80% of users have at least 1 subscription auto-detected within 5 minutes of signup.

---

### Flow 2: Automatic Subscription Detection (Ongoing)

```
1. User signs up for new subscription (e.g., ChatGPT Plus) using their connected Gmail
2. OpenAI sends confirmation email: "Welcome to ChatGPT Plus - $20/month"
3. Next day, EmailSubTracker's daily background job runs:
   - Scans Gmail for new emails since last scan
   - Finds the ChatGPT Plus confirmation email
   - Pattern matches "Welcome to ChatGPT Plus" + "$20/month"
   - Extracts: Merchant (OpenAI), Plan (Plus), Cost ($20/month), Next billing date, Trial info (if any)
   - Fetches OpenAI logo from Brandfetch API
4. Creates subscription record in database
5. User receives notification email: "✓ New subscription detected: ChatGPT Plus - $20/month"
6. Dashboard shows new subscription with "NEW" badge
7. User can click to review/edit details if needed
```

**Success Metric:** 85% of subscription emails automatically detected and parsed correctly within 24 hours.

---

### Flow 3: Free Trial Reminder

```
1. User forwards email for Midjourney (14-day free trial)
2. System detects trial period, calculates end date
3. Dashboard shows "Trial ends in 14 days" badge
4. 11 days later (3 days before end): Email reminder sent
   - Subject: "⏰ Midjourney trial ends in 3 days - $30/month after"
   - Body: Decision prompt + link to cancellation instructions
5. 13 days later (1 day before): Final reminder email
6. User clicks "Mark as Cancelled" in email or dashboard
7. Subscription status updates to "Cancelled"
```

**Success Metric:** 80% open rate on trial reminder emails, 30% mark subscription as cancelled.

---

### Flow 4: Manual Subscription Entry

```
1. User clicks "+ Add Subscription" button in dashboard
2. Modal opens with form
3. User types "Adobe Creative Cloud" in Name field
4. Autocomplete suggests Adobe with logo
5. User selects suggestion or continues typing
6. Fills in: $54.99/month, Next billing date: Dec 1, 2025
7. Optionally adds category: "Design Tools"
8. Clicks "Add Subscription"
9. Form validates, creates record
10. Dashboard updates with new subscription
11. Success toast: "✓ Adobe Creative Cloud added"
```

**Success Metric:** 60% of users manually add at least 1 subscription in first week.

---

### Flow 5: Viewing Subscription Dashboard

```
1. User logs in to EmailSubTracker
2. Dashboard loads showing:
   - Header: "You're spending $287/month on 12 subscriptions"
   - Grid of subscription cards (3-4 per row on desktop)
   - Each card shows: Logo, Name, Cost, Next charge date, Status badge
   - Filter bar: All / Active / Trials / Cancelled
   - Sort: Next charge date (default) / Cost / Alphabetical
3. User clicks filter "Trials"
4. Dashboard shows only free trial subscriptions
5. User clicks on "Midjourney" card
6. Detail modal opens showing full info and history
```

**Success Metric:** Users visit dashboard 2-3x per week on average.

---

## 7. Technical Architecture

### Mapping to Existing Template

The VibeCode Template provides a strong foundation. Here's how we'll adapt it:

#### Database Schema Changes

**Updates to Existing Users Table:**

```typescript
// shared/schema.ts - Add to existing users table

export const users = pgTable("users", {
  // ... existing fields (firebaseId, email, firstName, etc.)

  // Gmail OAuth integration
  gmailRefreshToken: text("gmail_refresh_token"), // Encrypted OAuth refresh token
  gmailAccessToken: text("gmail_access_token"), // Encrypted OAuth access token (cached)
  gmailTokenExpiry: timestamp("gmail_token_expiry"), // When access token expires
  gmailConnected: boolean("gmail_connected").default(false), // Is Gmail connected?
  lastGmailScan: timestamp("last_gmail_scan"), // Last time we scanned their inbox

  // ... rest of existing fields
});
```

**New Tables to Add:**

```typescript
// shared/schema.ts additions

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),

  // Subscription details
  merchantName: text("merchant_name").notNull(),
  planName: text("plan_name"),
  category: text("category"), // "AI Tools", "Design", "Video", etc.
  logoUrl: text("logo_url"),

  // Billing information
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "annual", "quarterly", "weekly", "custom"]
  }).notNull(),
  customBillingDays: integer("custom_billing_days"), // for custom cycles

  // Dates
  firstBillingDate: timestamp("first_billing_date").notNull(),
  nextBillingDate: timestamp("next_billing_date").notNull(),
  trialEndDate: timestamp("trial_end_date"),
  cancelledDate: timestamp("cancelled_date"),

  // Status
  status: text("status", {
    enum: ["active", "trial", "cancelled", "paused"]
  }).notNull().default("active"),

  // Metadata
  cancellationUrl: text("cancellation_url"),
  notes: text("notes"),
  sourceEmailId: text("source_email_id"), // ID of parsed email
  isManualEntry: boolean("is_manual_entry").notNull().default(false),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const parsedEmails = pgTable("parsed_emails", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),

  // Email details
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  receivedAt: timestamp("received_at").notNull(),
  rawEmailBody: text("raw_email_body"),

  // Parsing results
  parsingStatus: text("parsing_status", {
    enum: ["pending", "success", "failed", "manual_review"]
  }).notNull().default("pending"),
  extractedData: text("extracted_data"), // JSON string
  subscriptionId: integer("subscription_id").references(() => subscriptions.id),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reminderLogs = pgTable("reminder_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id),

  reminderType: text("reminder_type", {
    enum: ["trial_ending", "renewal_upcoming", "price_change"]
  }).notNull(),
  daysBeforeEvent: integer("days_before_event").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  opened: boolean("opened").default(false),
  clicked: boolean("clicked").default(false),
});
```

#### Template Components to Keep

✅ **Keep As-Is:**
- User authentication (Firebase Auth) - extend with Gmail OAuth
- User profile management - add Gmail connection status
- Payment processing (Stripe) - Free tier (10 subs) / Pro tier (unlimited)
- Email infrastructure (SendGrid) - will use for reminders and notifications
- Database (Neon + Drizzle) - works well for our schema
- Testing infrastructure - will add subscription-specific tests
- OpenAI integration - repurpose for email parsing (was used for chat)

❌ **Remove/Replace:**
- Items table/routes - replace with subscriptions
- Files table/routes - not needed for MVP
- AI chat UI components - not needed
- AI threads/messages tables - remove

✨ **Add New:**
- Gmail OAuth flow and token management
- Gmail API integration for email scanning
- Background jobs for daily inbox scans
- Email parsing service (pattern matching + AI)

#### New Backend Routes

```typescript
// server/routes/subscriptionRoutes.ts
GET    /api/subscriptions              // List all subscriptions for user
POST   /api/subscriptions              // Manually add subscription
GET    /api/subscriptions/:id          // Get subscription details
PATCH  /api/subscriptions/:id          // Update subscription
DELETE /api/subscriptions/:id          // Delete subscription
POST   /api/subscriptions/:id/cancel   // Mark as cancelled
GET    /api/subscriptions/stats        // Dashboard stats (total cost, count, etc.)

// server/routes/gmailRoutes.ts
POST   /api/gmail/connect              // Initiate Gmail OAuth flow
GET    /api/gmail/callback             // OAuth callback handler
POST   /api/gmail/disconnect           // Disconnect Gmail account
GET    /api/gmail/status               // Check Gmail connection status
POST   /api/gmail/scan                 // Manually trigger inbox scan
GET    /api/gmail/scan-progress        // Get scan progress/status

// server/routes/emailParsingRoutes.ts
POST   /api/parse-email/manual         // Manually parse a specific email
GET    /api/parse-email/history        // View parsing history
POST   /api/parse-email/retry/:id      // Retry failed email parsing

// server/routes/reminderRoutes.ts
GET    /api/reminders/settings         // Get reminder preferences
PATCH  /api/reminders/settings         // Update reminder preferences
POST   /api/reminders/test             // Send test reminder
```

#### Gmail Service

```typescript
// server/lib/gmailService.ts

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  async getAuthUrl(): Promise<string> {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent'
    });
  }

  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  async scanInbox(userId: string, refreshToken: string, since?: Date) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    // Search query for subscription-related emails
    const query = [
      'subject:(subscription OR receipt OR invoice OR "payment confirmation" OR trial OR renewal OR "welcome to")',
      'OR from:(stripe.com OR paypal.com OR apple.com OR payments-noreply@google.com)',
      since ? `after:${Math.floor(since.getTime() / 1000)}` : 'after:6m' // Last 6 months by default
    ].join(' ');

    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500
    });

    return response.data.messages || [];
  }

  async getEmail(refreshToken: string, messageId: string) {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    const message = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full'
    });

    // Parse email parts to extract subject, body, etc.
    return this.parseGmailMessage(message.data);
  }

  private parseGmailMessage(message: any) {
    // Extract subject, from, body (HTML and plain text)
    // Handle multipart MIME messages
    // Return structured email object
  }
}
```

#### Email Parsing Service

```typescript
// server/lib/emailParser.ts

interface ParsedSubscription {
  merchantName: string;
  planName?: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'annual' | 'quarterly';
  firstBillingDate: Date;
  trialEndDate?: Date;
  cancellationUrl?: string;
  confidence: number; // 0-1, how confident we are in the parsing
}

class EmailParser {
  async parseEmail(emailBody: string, subject: string, from: string): Promise<ParsedSubscription> {
    // Step 1: Pattern matching for common formats (Stripe, PayPal, etc.)
    const patternResult = await this.tryPatternMatching(emailBody, subject, from);
    if (patternResult && patternResult.confidence > 0.8) {
      return patternResult;
    }

    // Step 2: AI parsing with OpenAI if pattern matching fails
    const aiResult = await this.parseWithAI(emailBody, subject, from);
    return aiResult;
  }

  private async tryPatternMatching(body: string, subject: string, from: string) {
    // Check for Stripe patterns
    if (from.includes('stripe.com')) {
      return this.parseStripeEmail(body, subject);
    }
    // Check for PayPal patterns
    if (from.includes('paypal.com')) {
      return this.parsePayPalEmail(body, subject);
    }
    // Check for Apple receipt patterns
    if (from.includes('apple.com')) {
      return this.parseAppleEmail(body, subject);
    }
    // etc.
    return null;
  }

  private async parseWithAI(body: string, subject: string, from: string) {
    const prompt = `Extract subscription details from this email.

Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 2000)} // Limit to save tokens

Return JSON with: merchantName, planName, amount, currency, billingCycle, firstBillingDate, trialEndDate, cancellationUrl`;

    // Use OpenAI to extract structured data
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    // Parse and return ParsedSubscription object
  }
}
```

#### Background Jobs (Cron)

```typescript
// server/jobs/gmailScanJob.ts

// Run daily at 2am to scan all connected Gmail accounts for new subscription emails
async function scanAllGmailAccounts() {
  // Get all users with connected Gmail accounts
  const users = await db.query.users.findMany({
    where: isNotNull(users.gmailRefreshToken)
  });

  for (const user of users) {
    try {
      // Scan for emails since last scan
      const lastScan = user.lastGmailScan || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago if never scanned
      const messages = await gmailService.scanInbox(user.firebaseId, user.gmailRefreshToken, lastScan);

      // Process each email
      for (const message of messages) {
        const email = await gmailService.getEmail(user.gmailRefreshToken, message.id);

        // Parse email for subscription details
        const parsed = await emailParser.parseEmail(email.body, email.subject, email.from);

        if (parsed && parsed.confidence > 0.7) {
          // Check if subscription already exists
          const existing = await db.query.subscriptions.findFirst({
            where: and(
              eq(subscriptions.userId, user.firebaseId),
              eq(subscriptions.merchantName, parsed.merchantName)
            )
          });

          if (!existing) {
            // Create new subscription
            await db.insert(subscriptions).values({
              userId: user.firebaseId,
              ...parsed,
              sourceEmailId: message.id
            });

            // Send notification to user
            await sendEmail({
              to: user.email,
              subject: `✓ New subscription detected: ${parsed.merchantName}`,
              html: renderNewSubscriptionEmail(parsed)
            });
          }
        }
      }

      // Update last scan timestamp
      await db.update(users).set({ lastGmailScan: new Date() }).where(eq(users.firebaseId, user.firebaseId));
    } catch (error) {
      console.error(`Error scanning Gmail for user ${user.firebaseId}:`, error);
      // Log error but continue with next user
    }
  }
}

// server/jobs/reminderJob.ts

// Run daily at 9am user local time
async function sendTrialReminders() {
  // Find subscriptions with trial ending in 3 days
  const trialsEndingSoon = await db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.status, 'trial'),
      // trialEndDate is between now and 3 days from now
    )
  });

  // Send reminder emails
  for (const sub of trialsEndingSoon) {
    await sendEmail({
      to: sub.user.email,
      subject: `⏰ ${sub.merchantName} trial ends in 3 days`,
      html: renderTrialReminderEmail(sub)
    });

    // Log reminder sent
    await db.insert(reminderLogs).values({...});
  }
}

// Run daily to update next billing dates
async function updateBillingDates() {
  // Find subscriptions where nextBillingDate has passed
  // Calculate next billing date based on cycle
  // Update records
}
```

---

## 8. Success Metrics & KPIs

### North Star Metric
**Average number of subscriptions tracked per active user** - indicates product value and engagement

Target: 8-12 subscriptions per active user

---

### Launch Metrics (First 3 Months)

**Acquisition:**
- 1,000 signups (MVP launch target)
- 30% activation rate (users who add at least 1 subscription)
- Cost per acquisition: <$10

**Engagement:**
- 60% weekly active users (WAU)
- 2.5 sessions per week per user
- Average 8 subscriptions tracked per user

**Retention:**
- 40% Day 7 retention
- 25% Day 30 retention
- 60% email open rate for reminders

**Monetization:**
- 5% conversion to Pro ($9.99/month) within first month
- $1,000 MRR by Month 3

---

### Key Performance Indicators

**Product KPIs:**
- Email parsing accuracy: >85% (subscriptions correctly extracted)
- Time to add subscription: <30 seconds (forwarding method)
- Reminder open rate: >70%
- Cancellation action rate: >25% (users who act on trial reminders)

**Business KPIs:**
- Customer Acquisition Cost (CAC): <$15
- Lifetime Value (LTV): >$120 (12 months * $9.99)
- LTV:CAC ratio: >8:1
- Churn rate: <5% monthly

**User Satisfaction:**
- NPS Score: >40
- Customer satisfaction: >4.5/5 stars
- Support tickets per user: <0.1 per month

---

## 9. Pricing Strategy

### Free Tier
**Target:** Individual users with a few subscriptions

**Limits:**
- Up to 10 active subscriptions
- Email forwarding to unique address
- Basic dashboard and calendar
- Trial end reminders (3 days before)
- Email notifications

**Goal:** Hook users on the value, drive upgrades when they hit limits

---

### Pro Tier - $9.99/month
**Target:** Power users, content creators, small business owners

**Features:**
- **Unlimited subscriptions**
- Advanced reminders (customizable: 1, 3, 7 days)
- Weekly spending summary emails
- Subscription insights and trends
- Export data (CSV, Excel)
- Priority email support
- Multi-email address tracking
- Historical data (unlimited)

**Positioning:** "Less than the cost of one forgotten subscription per month"

---

### Annual Plan - $99/year (save 17%)
- All Pro features
- 2 months free vs monthly billing

---

### Future Tiers (Post-MVP)

**Business Tier - $29/month**
- Everything in Pro
- Multi-user access (up to 5 users)
- Team subscription management
- Approval workflows
- Slack/Teams integration
- Admin dashboard

**Enterprise - Custom Pricing**
- Unlimited users
- API access
- SSO (Single Sign-On)
- Custom integrations
- Dedicated support

---

## 10. Go-to-Market Strategy

### Target Launch Date
**April 1, 2026** (4 months from now for MVP development with Gmail OAuth integration)

---

### Phase 1: Pre-Launch (Month -1)

**Goal:** Build anticipation, collect 500 email signups

**Tactics:**
1. **Landing Page** with waitlist signup
   - Headline: "Never lose money to forgotten subscriptions again"
   - Explainer video (90 seconds)
   - Social proof: "Join 500+ people tracking their subscriptions"
   - Email capture with incentive: "Get 3 months Pro free at launch"

2. **Content Marketing**
   - Blog post: "I tracked 47 subscriptions and found $200/month in waste"
   - Guest post on Indie Hackers: "How I built a subscription tracker in 30 days"
   - Twitter/X thread about forgotten subscriptions problem

3. **Community Seeding**
   - Post in Reddit: r/SideProject, r/SaaS, r/ContentCreation
   - Share in Discord communities: AI tools, indie makers, creator economy
   - Product Hunt "Coming Soon" page

---

### Phase 2: Launch (Month 1)

**Goal:** 1,000 signups, get first 50 paying customers

**Tactics:**

1. **Product Hunt Launch**
   - Launch on Tuesday or Wednesday
   - Hunter outreach (find someone with following)
   - Prepare assets: screenshots, demo video, pitch
   - Engage in comments all day
   - Goal: Top 5 product of the day

2. **Outreach to Target Audiences**
   - Email waitlist: "🚀 EmailSubTracker is live!"
   - Twitter launch thread with demo video
   - Post in communities: Indie Hackers, Reddit (r/SaaS, r/Entrepreneur)
   - Reach out to content creator influencers for reviews

3. **Launch Offer**
   - First 100 users get Pro free for 3 months
   - Creates urgency and FOMO
   - Converts free users to Pro experience

4. **PR Outreach**
   - Submit to: TechCrunch, The Verge, Lifehacker
   - Angle: "Privacy-first alternative to Rocket Money"
   - Press kit: founder story, product screenshots, data about subscription waste

---

### Phase 3: Growth (Months 2-3)

**Goal:** 5,000 users, $5K MRR, refine product-market fit

**Tactics:**

1. **Content SEO**
   - Blog posts targeting keywords:
     - "how to track subscriptions without bank account"
     - "best free trial reminder app"
     - "subscription tracker for content creators"
   - Comparison pages: "EmailSubTracker vs Rocket Money", "EmailSubTracker vs SubTracker"

2. **Referral Program**
   - Give 1 month Pro free for every friend who signs up
   - Referred friend gets 1 month Pro free
   - Track with unique referral links

3. **Partnerships**
   - Partner with finance YouTubers and creators
   - Offer affiliate commission (20% recurring)
   - Create co-marketing content

4. **Paid Acquisition (if metrics validate)**
   - Google Ads: targeting "subscription tracking", "cancel free trial"
   - Facebook/Instagram: target content creators, small business owners
   - Budget: $1,000/month, optimize for <$10 CAC

5. **Product Iteration**
   - Weekly user interviews (5-10 users)
   - Analyze usage data and drop-off points
   - Ship improvements based on feedback
   - Focus on activation rate (get more users to add first subscription)

---

### Marketing Messaging

**Positioning Statement:**
"EmailSubTracker is the privacy-first subscription tracker for creators and professionals who want to avoid forgotten free trials and unwanted renewals—without connecting their bank account."

**Value Propositions:**
1. **Privacy-First** - No bank connection required, your financial data stays private
2. **Automatic** - Forward emails or connect inbox, subscriptions tracked automatically
3. **Never Forget Trials** - Get reminded before free trials convert to charges
4. **Made for Creators** - Designed for people juggling dozens of tools

**Key Messages by Persona:**
- **AI Tool Hunter:** "Stop losing money on forgotten AI subscriptions"
- **Content Creator:** "Track all your creator tools in one place"
- **Small Business:** "See exactly what your team is subscribed to"
- **Privacy-Conscious:** "Track subscriptions without sharing bank access"

---

## 11. Product Roadmap

### MVP (Months 1-4) - April 2026
- ✅ Gmail OAuth integration (read-only access)
- ✅ Automatic inbox scanning for subscriptions
- ✅ AI-powered email parsing (pattern matching + GPT-4o)
- ✅ Manual subscription entry
- ✅ Subscription dashboard with stats
- ✅ Trial end reminders (3-day and 1-day)
- ✅ Basic calendar view
- ✅ Free (10 subs) + Pro (unlimited) tiers
- ✅ Responsive web app

**Success Criteria:** 1,000 users, 50% activation (thanks to automation), $2K MRR

---

### Post-MVP Phase 1 (Months 5-7) - July 2026
- 🔄 Outlook/Microsoft 365 OAuth integration
- 🔄 Multiple email account support
- 🔄 Email forwarding option (for non-Gmail users)
- 🔄 Spending insights and analytics
- 🔄 Duplicate subscription detection
- 🔄 Enhanced merchant logo database
- 🔄 Category management
- 🔄 Historical email import (12 months)

**Success Criteria:** 5,000 users, 60% activation, $10K MRR

---

### Phase 2 (Months 8-10) - October 2026
- 🔮 Mobile apps (iOS + Android)
- 🔮 Browser extension (detect subscriptions while browsing)
- 🔮 Price change alerts
- 🔮 Spending trends over time
- 🔮 Export for taxes/expenses
- 🔮 Zapier integration
- 🔮 Cancellation link finder (deep link to cancel pages)

**Success Criteria:** 15,000 users, $25K MRR

---

### Phase 3 (Months 11-12) - December 2026
- 🔮 Team/Business tier
- 🔮 Multi-user accounts
- 🔮 Shared subscription tracking for families
- 🔮 Approval workflows
- 🔮 Slack/Teams notifications
- 🔮 API access for power users
- 🔮 ROI calculator (value per subscription)

**Success Criteria:** 30,000 users, $50K MRR, 10 business customers

---

### Future Considerations (Year 2+)
- 💡 Bill negotiation (partner with service like Trim)
- 💡 Subscription marketplace/discovery
- 💡 Usage tracking integration (API calls, storage used)
- 💡 Automatically cancel subscriptions on user's behalf
- 💡 Virtual cards for easy cancellation (like Privacy.com)
- 💡 AI recommendations for cheaper alternatives

---

## 12. Technical Requirements

### Infrastructure

**Hosting:**
- Deploy on Railway, Render, or Vercel (easy deploy from template)
- Estimated costs: $20-50/month for MVP

**Services:**
- Neon PostgreSQL (serverless) - included in template
- Firebase Auth + Storage - included in template
- **Gmail API** - Free (10,000 requests/day per user, sufficient for MVP)
- **Google OAuth 2.0** - Free, for Gmail authentication
- SendGrid (email sending for notifications) - $15/month (first 40K emails free)
- OpenAI API for email parsing - ~$100-200/month estimated (more usage with auto-scanning)
- Stripe for payments - 2.9% + $0.30 per transaction
- PostHog for analytics - free tier sufficient for MVP
- Brandfetch API for merchant logos - Free tier (100 requests/month)

**Additional Dependencies:**
- `googleapis` npm package - For Gmail API integration
- `google-auth-library` - For OAuth 2.0 authentication
- Encryption library for storing OAuth tokens securely

---

### Performance Requirements

**Response Times:**
- Dashboard load: <2 seconds
- Add/update subscription: <500ms
- Email parsing: <60 seconds from receipt to dashboard

**Reliability:**
- Uptime: 99.5% (allows ~3.5 hours downtime per month)
- Email parsing success rate: >85%
- Reminder delivery rate: >95%

**Scalability:**
- Support 10,000 users initially
- 100,000 subscriptions tracked
- 1,000 emails parsed per day

---

### Security & Privacy

**Data Protection:**
- All data encrypted at rest (Neon default)
- HTTPS only (TLS 1.3)
- Email content stored securely, deleted after parsing (30-day retention)
- User can delete account and all data

**Privacy Policy:**
- Clear disclosure: "We only read emails you forward to us"
- No selling of user data
- GDPR compliant (data export, deletion)
- CCPA compliant (California users)

**Authentication:**
- Firebase Auth (already in template)
- OAuth for Google/Microsoft email access (read-only scope)
- 2FA option for Pro users

---

## 13. Risks & Mitigations

### Risk 1: Email Parsing Accuracy
**Risk:** Subscription emails vary widely in format. Low accuracy frustrates users.

**Impact:** High - core value prop fails if parsing doesn't work

**Mitigation:**
- Start with pattern matching for top 20 services (covers 60% of use cases)
- Use AI (GPT-4o) as fallback for unstructured emails
- Allow users to manually correct parsing errors (improve ML over time)
- Show confidence score to users ("Medium confidence - please verify")
- Build merchant/pattern database over time

**Monitoring:** Track parsing success rate per merchant, iterate on failed patterns

---

### Risk 2: Gmail OAuth Permission Concerns
**Risk:** Users hesitate to grant email reading permissions, worried about privacy

**Impact:** High - low OAuth acceptance rate kills activation

**Mitigation:**
- Crystal clear privacy messaging on OAuth consent screen
- "We only read subscription emails, never personal emails"
- Show exactly what we scan for (receipts, invoices, confirmations)
- Badge on landing page: "Read-only access. We never send emails or modify your inbox"
- Offer manual subscription entry as alternative (Phase 2)
- Open-source the email parsing logic for transparency
- Blog post/video explaining our privacy approach

**Monitoring:** Track OAuth acceptance rate (target: >70%), survey users who decline

---

### Risk 3: Limited Differentiation from Competitors
**Risk:** Rocket Money adds email parsing, SubTracker adds automation

**Impact:** Medium - makes growth harder

**Mitigation:**
- Focus on privacy-first positioning (bank-free tracking)
- Excel at free trial tracking specifically (underserved niche)
- Target AI tool users specifically (competitors are generic)
- Build community (Discord, newsletter) to increase switching costs
- Ship features faster (indie advantage vs large companies)

**Monitoring:** Track where signups come from, survey users on why they chose us

---

### Risk 4: Monetization - Users Stay on Free Tier
**Risk:** 10 subscriptions is enough for most users, they never upgrade

**Impact:** High - need Pro conversions to be sustainable

**Mitigation:**
- Set free limit at 10 (tight enough to hit for power users)
- Show upgrade prompts when approaching limit (8/10 subscriptions)
- Make Pro features compelling (insights, trends, advanced reminders)
- Offer annual discount to improve LTV
- Test different pricing and limits in first 3 months

**Monitoring:** Track conversion rate, survey churned users, A/B test pricing

---

### Risk 5: Email Deliverability Issues
**Risk:** Reminder emails go to spam, users miss critical alerts

**Impact:** Medium - reduces value but doesn't break core product

**Mitigation:**
- Warm up sending domain properly
- Use reputable provider (SendGrid)
- Follow email best practices (SPF, DKIM, DMARC)
- Allow users to whitelist our sending address
- Offer SMS reminders for critical trials (Pro feature)

**Monitoring:** Track email open rates, bounce rates, spam reports

---

### Risk 6: Gmail API Rate Limits and Complexity
**Risk:** Gmail API has quota limits (10,000 requests/day per user). Complex OAuth flow may have bugs. Token refresh failures.

**Impact:** Medium-High - could prevent MVP from working at scale

**Mitigation:**
- Optimize Gmail API queries (use batch requests, efficient filters)
- Cache email data after first scan to reduce API calls
- Implement exponential backoff and retry logic for rate limit errors
- Thoroughly test OAuth flow (initial auth, token refresh, revocation)
- Monitor API usage per user, alert if approaching limits
- Have fallback: manual subscription entry if Gmail scan fails
- Use existing well-tested libraries (googleapis, google-auth-library)
- Build comprehensive error handling for OAuth edge cases

**Monitoring:** Track Gmail API usage, token refresh success rate, OAuth errors

---

## 14. Open Questions & Decisions Needed

### Questions to Validate with Users

1. **Pricing:** Is $9.99/month the right price point? Would $6.99 or $14.99 convert better?
2. **Free tier limit:** Is 10 subscriptions the right threshold? Should it be 5? 15?
3. **Reminder timing:** Are 3-day and 1-day reminders enough? Do users want 7-day?
4. **Gmail OAuth trust:** Will users trust us enough to connect their Gmail? What messaging resonates?
5. **Multi-email:** Do users want to track personal + business emails separately?
6. **Historical scan depth:** Is 6 months enough for initial scan, or do users want 12+ months?
7. **Scan frequency:** Daily scans sufficient, or do users want hourly/real-time?

### Technical Decisions

1. **Email parsing approach:**
   - Pure pattern matching (fast, limited)
   - Pure AI (slow, expensive, flexible)
   - Hybrid (pattern matching + AI fallback) ✅ Recommended

2. **OAuth token storage:**
   - Encrypt tokens at rest in database ✅ Recommended
   - Use separate secrets management service (AWS Secrets Manager, Vault)
   - Decision: Encrypt with app-level encryption key for MVP ✅

3. **Gmail scan frequency:**
   - Real-time via Gmail Push Notifications (complex)
   - Hourly scans (more API usage)
   - Daily scans (simpler, sufficient for MVP) ✅ Recommended

4. **Background jobs:**
   - Node-cron (simple, runs in-process) ✅ For MVP
   - BullMQ + Redis (robust, scales better) - Phase 2 if needed

5. **Logo/merchant database:**
   - Build our own
   - Use Clearbit API ($99/month)
   - Use Brandfetch API (free tier available) ✅ Recommended

6. **Mobile strategy:**
   - Responsive web app only (MVP) ✅
   - React Native app (Phase 2)
   - Native apps (Phase 3)

7. **Non-Gmail users:**
   - Outlook integration (Phase 2)
   - Manual entry only (MVP fallback) ✅
   - Email forwarding (Phase 2)

---

## 15. Success Criteria for MVP

**Launch Readiness Checklist:**
- [ ] User can sign up with Google OAuth (Firebase + Gmail OAuth combined)
- [ ] Gmail OAuth flow works correctly (auth, token storage, refresh)
- [ ] System scans Gmail inbox and finds subscription emails (tested with 10+ real inboxes)
- [ ] System successfully parses 20+ common subscription email formats
- [ ] Dashboard displays auto-detected subscriptions with correct data
- [ ] Trial reminder emails send 3 days and 1 day before end date
- [ ] User can manually add/edit/delete subscriptions
- [ ] Daily background job scans all connected Gmail accounts
- [ ] Stripe payment flow works for Pro upgrade
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] All auth flows work (login, logout, profile update, Gmail disconnect)
- [ ] Backend tests pass with >80% coverage
- [ ] Gmail API error handling works (rate limits, token expiry, etc.)
- [ ] OAuth token encryption working properly
- [ ] Error tracking and monitoring set up (PostHog)
- [ ] Privacy policy and terms of service published (with Gmail access disclosure)
- [ ] Onboarding tutorial is clear and tested with 10+ users

**Launch Success Metrics (End of Month 1):**
- ✅ 300+ signups
- ✅ 70%+ Gmail OAuth acceptance rate (users who complete OAuth flow)
- ✅ 50%+ activation rate (users with at least 1 auto-detected subscription)
- ✅ Average 5+ subscriptions auto-detected per user
- ✅ 15+ Pro subscribers ($150 MRR)
- ✅ 75%+ trial reminder email open rate
- ✅ <10 critical bugs reported
- ✅ 4.0+ star rating on Product Hunt
- ✅ 60+ daily active users by end of month

**Pivot/Kill Criteria:**
If after 4 months (end of MVP):
- <500 total signups → Marketing problem, adjust GTM strategy
- <50% Gmail OAuth acceptance → Privacy concerns too high, consider email forwarding fallback
- <30% activation rate → Auto-detection not working, major changes needed
- <3% Pro conversion → Pricing/value prop problem, reconsider business model
- <70% email parsing accuracy → Technical problem, need better patterns or AI model

---

## 16. Appendix

### User Research Insights

*To be filled in after conducting 10+ user interviews*

### Wireframes

*Link to Figma designs*

### Technical Specifications

*Link to detailed API documentation*

### Competitive Analysis Deep Dive

*Link to comprehensive competitor analysis spreadsheet*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 7, 2025 | Product Team | Initial PRD created with email forwarding as primary method |
| 2.0 | Nov 8, 2025 | Product Team | **Major update**: Changed primary method to Gmail OAuth integration with automatic inbox scanning. Updated timeline to 4 months, added Gmail service architecture, updated all user flows, risks, and success metrics |

---

**Next Steps:**
1. Review and approve updated PRD (v2.0) with founding team
2. Validate Gmail OAuth approach with 5-10 potential users
3. Create Figma mockups for:
   - Gmail OAuth consent flow with privacy messaging
   - Inbox scanning progress screen
   - Dashboard with auto-detected subscriptions
4. Set up development environment from template
5. Set up Google Cloud Project for Gmail API access
6. Sprint planning for Month 1:
   - Week 1-2: Gmail OAuth integration + token management
   - Week 3-4: Email scanning service + pattern matching
   - Week 5-6: Dashboard + subscription display
   - Week 7-8: AI parsing fallback + trial reminders
7. Begin user research (interview 10 target users about Gmail privacy concerns)

---

**Questions or Feedback?**
Contact: [your-email@emailsubtracker.com]
