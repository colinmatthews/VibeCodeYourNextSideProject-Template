# EmailSubTracker - Build Approach
## Step-by-Step Development Guide

**Version:** 1.0
**Timeline:** 4 months (16 weeks)
**Target Launch:** April 1, 2026

---

## ⚠️ IMPORTANT: Read This First

**Before starting development:**
1. ✅ Read `DATA_MODEL_ANALYSIS.md` - Understand all schema decisions
2. ✅ Read `FINAL_SCHEMA.md` - This is the **exact schema** to use
3. ✅ Use the code from `FINAL_SCHEMA.md` (not the simplified examples in this file)

**Key decisions already made:**
- ✅ Simplified MVP (4 tables)
- ✅ Allow duplicate subscriptions
- ✅ 30-day email retention
- ✅ Soft delete for users
- ✅ Enum for categories

---

## Overview

This document provides a practical, week-by-week approach to building EmailSubTracker from the VibeCode template. We'll build in incremental phases, testing each component before moving to the next.

**Core Philosophy:**
- ✅ Build the riskiest/most complex parts first (Gmail OAuth)
- ✅ Get something working end-to-end quickly (Week 4)
- ✅ Test with real Gmail accounts early and often
- ✅ Iterate on email parsing accuracy throughout development

---

## Phase 0: Pre-Development Setup (Week 0)
**Duration:** 3-5 days
**Goal:** Set up all required accounts, tools, and development environment

### Day 1-2: Account Setup

**1. Google Cloud Platform Setup**
```bash
# What you need to do:
1. Go to https://console.cloud.google.com
2. Create new project: "EmailSubTracker"
3. Enable Gmail API:
   - APIs & Services → Enable APIs and Services → Search "Gmail API" → Enable
4. Create OAuth 2.0 Credentials:
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: "EmailSubTracker OAuth"
   - Authorized redirect URIs:
     - http://localhost:5000/api/gmail/callback (development)
     - https://yourdomain.com/api/gmail/callback (production - add later)
5. Download client_secret.json
6. Copy Client ID and Client Secret to .env file
```

**2. Firebase Setup** (Already in template, but verify)
```bash
# Verify Firebase project exists:
1. Go to https://console.firebase.google.com
2. Make sure Authentication is enabled (Google Sign-In)
3. Make sure Storage is enabled
4. Verify you have service account JSON file
```

**3. OpenAI API Setup**
```bash
# For AI email parsing:
1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to .env file
4. Set usage limits ($20/month to start)
```

**4. Brandfetch API Setup**
```bash
# For merchant logos:
1. Go to https://brandfetch.com/api
2. Sign up for free tier (100 requests/month)
3. Get API key
4. Add to .env file
```

### Day 3: Local Development Environment

**1. Clone and Setup Template**
```bash
# On your Mac (in VS Code terminal):
cd ~/Documents
git clone https://github.com/colinmatthews/VibeCodeYourNextSideProject-Template.git EmailSubTracker
cd EmailSubTracker

# Install dependencies
npm install

# Install additional dependencies for Gmail
npm install googleapis google-auth-library
npm install --save-dev @types/google-auth-library
```

**2. Configure Environment Variables**
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add:
# ===== EXISTING (from template) =====
DATABASE_URL=your_neon_postgres_url
FIREBASE_SERVICE_ACCOUNT_KEY=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_API_KEY=...
# ... other Firebase vars

# ===== NEW FOR EMAILSUBTRACKER =====
# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/callback

# OpenAI (for email parsing)
OPENAI_API_KEY=sk-...

# Brandfetch (for logos)
BRANDFETCH_API_KEY=...

# Encryption (generate random 32-byte key)
OAUTH_TOKEN_ENCRYPTION_KEY=generate_random_32_char_string

# App URL
FRONTEND_URL=http://localhost:5173
```

**3. Database Setup**
```bash
# Start the dev server to test everything works
npm run dev

# Should see:
# - Frontend at http://localhost:5173
# - Backend at http://localhost:5000
```

### Day 4-5: Remove Unnecessary Template Features

**Files to Delete:**
```bash
# Remove AI chat features (we're repurposing OpenAI for parsing)
rm -rf client/src/pages/ai-chat.tsx
rm -rf client/src/components/assistant-ui/
rm -rf server/routes/aiRoutes.ts
rm -rf server/routes/threadRoutes.ts

# Remove file upload features (not needed)
rm -rf client/src/pages/files.tsx
rm -rf client/src/components/FileUpload.tsx
rm -rf client/src/components/FileList.tsx
rm -rf server/routes/fileRoutes.ts
rm -rf server/lib/firebaseStorage.ts

# Remove items (we'll replace with subscriptions)
rm -rf server/routes/itemRoutes.ts
```

**Database Schema Updates:**
```bash
# Edit shared/schema.ts:
1. Remove: items, files, aiThreads, aiMessages tables
2. Keep: users table (we'll add fields to it)
3. Add: subscriptions, parsedEmails, reminderLogs tables (from PRD)
```

---

## Phase 1: Gmail OAuth Foundation (Weeks 1-2)
**Goal:** Get Gmail OAuth working, store tokens, retrieve emails

### Week 1: OAuth Flow Implementation

**Day 1-2: Database Schema Setup**

**⚠️ IMPORTANT:** Use the complete schema from `FINAL_SCHEMA.md`, not simplified examples.

**Steps:**
1. Open `shared/schema.ts`
2. Remove old tables: `items`, `files`, `aiThreads`, `aiMessages`
3. Copy the complete schema from `FINAL_SCHEMA.md`
4. Paste into `shared/schema.ts`

**The schema includes:**
- ✅ Users table (with Gmail OAuth fields)
- ✅ Subscriptions table (with all indexes)
- ✅ ParsedEmails table (with 30-day retention)
- ✅ ReminderLogs table (with unique constraints)

**Run migration:**
```bash
npm run db:generate
# Review the generated SQL in server/migrations/
npm run db:migrate
# Verify tables created
```

**Verify in database:**
```sql
-- Check all tables exist
\dt

-- Should see:
-- users, subscriptions, parsed_emails, reminder_logs
```

**Day 3-4: Gmail Service**

**File:** `server/lib/gmailService.ts` (create new file)
```typescript
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.OAUTH_TOKEN_ENCRYPTION_KEY!, 'utf-8');
const ALGORITHM = 'aes-256-gcm';

// Encrypt OAuth tokens before storing
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Decrypt OAuth tokens when retrieving
export function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Step 1: Generate OAuth URL for user to click
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  // Step 2: Exchange code for tokens
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Step 3: Test the connection by getting user's email
  async getUserEmail(refreshToken: string): Promise<string> {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return profile.data.emailAddress!;
  }
}

export const gmailService = new GmailService();
```

**Day 5: Gmail Routes**

**File:** `server/routes/gmailRoutes.ts` (create new file)
```typescript
import { Router } from 'express';
import { gmailService, encryptToken } from '../lib/gmailService';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/gmail/connect - Start OAuth flow
router.get('/connect', requireAuth, async (req, res) => {
  try {
    const authUrl = gmailService.getAuthUrl();

    // Store user's firebaseId in session so we can retrieve it in callback
    // (You might need to set up express-session for this)
    // For now, we'll pass it as state parameter
    const stateData = {
      userId: req.user!.uid,
      timestamp: Date.now()
    };

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const urlWithState = `${authUrl}&state=${state}`;

    res.json({ authUrl: urlWithState });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// GET /api/gmail/callback - OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const userId = stateData.userId;

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return res.status(400).send('No refresh token received. Please revoke access and try again.');
    }

    // Encrypt tokens before storing
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;

    // Update user record
    await db.update(users)
      .set({
        gmailRefreshToken: encryptedRefreshToken,
        gmailAccessToken: encryptedAccessToken,
        gmailTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        gmailConnected: true,
        updatedAt: new Date()
      })
      .where(eq(users.firebaseId, userId));

    // Redirect to frontend with success message
    res.redirect(`${process.env.FRONTEND_URL}?gmail_connected=true`);
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}?gmail_error=true`);
  }
});

// GET /api/gmail/status - Check if Gmail is connected
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseId, req.user!.uid)
    });

    res.json({
      connected: user?.gmailConnected || false,
      lastScan: user?.lastGmailScan || null
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

// POST /api/gmail/disconnect - Disconnect Gmail
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    await db.update(users)
      .set({
        gmailRefreshToken: null,
        gmailAccessToken: null,
        gmailTokenExpiry: null,
        gmailConnected: false,
        lastGmailScan: null,
        updatedAt: new Date()
      })
      .where(eq(users.firebaseId, req.user!.uid));

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

export default router;
```

**Register routes in:** `server/routes/index.ts`
```typescript
import gmailRoutes from './gmailRoutes';

// Add to registerRoutes function:
app.use('/api/gmail', gmailRoutes);
```

### Week 2: Test OAuth Flow & Retrieve Emails

**Day 1-2: Frontend OAuth Button**

**File:** `client/src/pages/dashboard.tsx` (modify existing)
```typescript
import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/queryClient';

export default function Dashboard() {
  const [gmailStatus, setGmailStatus] = useState({ connected: false, lastScan: null });
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Check Gmail connection status on load
    checkGmailStatus();
  }, []);

  const checkGmailStatus = async () => {
    try {
      const data = await apiGet('/api/gmail/status');
      setGmailStatus(data);
    } catch (error) {
      console.error('Error checking Gmail status:', error);
    }
  };

  const connectGmail = async () => {
    try {
      setConnecting(true);
      const data = await apiGet('/api/gmail/connect');

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Gmail:', error);
      setConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      await apiPost('/api/gmail/disconnect');
      setGmailStatus({ connected: false, lastScan: null });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {/* Gmail Connection Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gmail Connection</h2>

        {!gmailStatus.connected ? (
          <div>
            <p className="text-gray-600 mb-4">
              Connect your Gmail account to automatically detect subscriptions
            </p>
            <button
              onClick={connectGmail}
              disabled={connecting}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {connecting ? 'Connecting...' : 'Connect Gmail'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-green-600 mb-2">✓ Gmail connected</p>
            {gmailStatus.lastScan && (
              <p className="text-sm text-gray-600 mb-4">
                Last scan: {new Date(gmailStatus.lastScan).toLocaleString()}
              </p>
            )}
            <button
              onClick={disconnectGmail}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Disconnect Gmail
            </button>
          </div>
        )}
      </div>

      {/* Subscriptions will go here later */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Subscriptions</h2>
        <p className="text-gray-600">No subscriptions detected yet. Connect Gmail to start scanning.</p>
      </div>
    </div>
  );
}
```

**Day 3: Test OAuth Flow**

**Manual Testing Steps:**
```bash
1. Start dev server: npm run dev
2. Sign in with Google (Firebase Auth)
3. Go to Dashboard
4. Click "Connect Gmail"
5. Verify:
   - Redirects to Google OAuth consent screen
   - Shows correct permissions (read-only Gmail)
   - After approving, redirects back to app
   - Dashboard shows "Gmail connected"
6. Check database:
   - User record has gmailRefreshToken (encrypted)
   - gmailConnected is true
7. Test disconnect:
   - Click "Disconnect Gmail"
   - Verify tokens are cleared in database
```

**Day 4-5: Retrieve Test Emails**

**Add to:** `server/lib/gmailService.ts`
```typescript
// Add this method to GmailService class:
async getRecentSubscriptionEmails(refreshToken: string, maxResults: number = 10) {
  const decryptedToken = decryptToken(refreshToken);
  this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

  const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

  // Search for subscription-related emails
  const query = [
    'subject:(subscription OR receipt OR invoice OR "payment confirmation" OR trial)',
    'OR from:(stripe.com OR paypal.com)',
    'newer_than:30d' // Last 30 days
  ].join(' ');

  const response = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults
  });

  return response.data.messages || [];
}

async getEmailDetails(refreshToken: string, messageId: string) {
  const decryptedToken = decryptToken(refreshToken);
  this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

  const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

  const message = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  // Parse the message
  const headers = message.data.payload?.headers || [];
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const from = headers.find(h => h.name === 'From')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';

  // Extract body (simplified - handles plain text)
  let body = '';
  if (message.data.payload?.body?.data) {
    body = Buffer.from(message.data.payload.body.data, 'base64').toString('utf-8');
  }

  return {
    id: messageId,
    subject,
    from,
    date,
    body: body.substring(0, 5000) // Limit body size
  };
}
```

**Test Route:** `server/routes/gmailRoutes.ts`
```typescript
// Add test route (remove before production):
router.get('/test-scan', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseId, req.user!.uid)
    });

    if (!user?.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Get recent emails
    const messages = await gmailService.getRecentSubscriptionEmails(user.gmailRefreshToken, 5);

    // Get details for first message
    const details = messages.length > 0
      ? await gmailService.getEmailDetails(user.gmailRefreshToken, messages[0].id!)
      : null;

    res.json({
      totalFound: messages.length,
      messages: messages.map(m => m.id),
      sampleEmail: details
    });
  } catch (error) {
    console.error('Error testing Gmail scan:', error);
    res.status(500).json({ error: 'Failed to scan Gmail' });
  }
});
```

**Test manually:**
```bash
# In browser console or Postman:
GET http://localhost:5000/api/gmail/test-scan

# Should return:
{
  "totalFound": 5,
  "messages": ["abc123", "def456", ...],
  "sampleEmail": {
    "subject": "Your Stripe receipt",
    "from": "stripe.com",
    ...
  }
}
```

**✅ Milestone 1 Complete:** You can connect Gmail and retrieve subscription emails!

---

## Phase 2: Email Parsing & Subscription Detection (Weeks 3-4)
**Goal:** Parse emails and extract subscription details

### Week 3: Pattern Matching Parser

**Day 1-2: Subscriptions Table**

**File:** `shared/schema.ts`
```typescript
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),

  // Subscription details
  merchantName: text("merchant_name").notNull(),
  planName: text("plan_name"),
  category: text("category"),
  logoUrl: text("logo_url"),

  // Billing
  amount: text("amount").notNull(), // Store as text to avoid decimal issues
  currency: text("currency").notNull().default("USD"),
  billingCycle: text("billing_cycle", {
    enum: ["monthly", "annual", "quarterly", "weekly", "custom"]
  }).notNull(),

  // Dates
  firstBillingDate: timestamp("first_billing_date"),
  nextBillingDate: timestamp("next_billing_date"),
  trialEndDate: timestamp("trial_end_date"),
  cancelledDate: timestamp("cancelled_date"),

  // Status
  status: text("status", {
    enum: ["active", "trial", "cancelled", "paused"]
  }).notNull().default("active"),

  // Metadata
  sourceEmailId: text("source_email_id"),
  isManualEntry: boolean("is_manual_entry").notNull().default(false),
  confidence: text("confidence"), // "high", "medium", "low"

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const parsedEmails = pgTable("parsed_emails", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.firebaseId),

  gmailMessageId: text("gmail_message_id").notNull(),
  fromEmail: text("from_email").notNull(),
  subject: text("subject").notNull(),
  receivedAt: timestamp("received_at").notNull(),

  parsingStatus: text("parsing_status", {
    enum: ["pending", "success", "failed", "skipped"]
  }).notNull().default("pending"),

  subscriptionId: integer("subscription_id").references(() => subscriptions.id),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

Run migration:
```bash
npm run db:generate
npm run db:migrate
```

**Day 3-4: Email Parser - Stripe Pattern**

**File:** `server/lib/emailParser.ts` (create new)
```typescript
interface ParsedSubscription {
  merchantName: string;
  planName?: string;
  amount: string;
  currency: string;
  billingCycle: 'monthly' | 'annual' | 'quarterly' | 'weekly';
  firstBillingDate?: Date;
  trialEndDate?: Date;
  confidence: 'high' | 'medium' | 'low';
}

export class EmailParser {

  async parseEmail(
    subject: string,
    from: string,
    body: string
  ): Promise<ParsedSubscription | null> {

    // Step 1: Try pattern matching based on sender
    if (from.includes('stripe.com')) {
      return this.parseStripeEmail(subject, body);
    }

    if (from.includes('paypal.com')) {
      return this.parsePayPalEmail(subject, body);
    }

    // Step 2: Generic patterns
    return this.parseGenericEmail(subject, body);
  }

  private parseStripeEmail(subject: string, body: string): ParsedSubscription | null {
    // Look for amount pattern: $XX.XX or $X,XXX.XX
    const amountMatch = body.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (!amountMatch) return null;

    const amount = amountMatch[1].replace(',', '');

    // Look for merchant name (usually in subject or early in body)
    let merchantName = 'Unknown Service';
    const merchantMatch = subject.match(/receipt from (.+)/i);
    if (merchantMatch) {
      merchantName = merchantMatch[1].trim();
    }

    // Detect billing cycle
    let billingCycle: 'monthly' | 'annual' | 'quarterly' | 'weekly' = 'monthly';
    if (body.includes('annual') || body.includes('yearly') || body.includes('12 months')) {
      billingCycle = 'annual';
    } else if (body.includes('quarterly') || body.includes('3 months')) {
      billingCycle = 'quarterly';
    } else if (body.includes('weekly') || body.includes('7 days')) {
      billingCycle = 'weekly';
    }

    // Look for trial period
    let trialEndDate: Date | undefined;
    const trialMatch = body.match(/trial ends? (?:on )?(.+?)(?:\.|,|\n)/i);
    if (trialMatch) {
      trialEndDate = new Date(trialMatch[1]);
    }

    return {
      merchantName,
      amount,
      currency: 'USD', // Stripe default (could detect from currency symbol)
      billingCycle,
      trialEndDate,
      confidence: 'high' // Stripe emails are well-structured
    };
  }

  private parsePayPalEmail(subject: string, body: string): ParsedSubscription | null {
    // Similar pattern matching for PayPal emails
    // TODO: Implement based on PayPal email format
    return null;
  }

  private parseGenericEmail(subject: string, body: string): ParsedSubscription | null {
    // Generic fallback patterns
    // Look for common subscription indicators
    const hasSubscription =
      subject.toLowerCase().includes('subscription') ||
      body.toLowerCase().includes('recurring payment') ||
      body.toLowerCase().includes('monthly charge');

    if (!hasSubscription) return null;

    // Extract amount
    const amountMatch = body.match(/\$(\d+(?:\.\d{2})?)/);
    if (!amountMatch) return null;

    return {
      merchantName: 'Unknown Service',
      amount: amountMatch[1],
      currency: 'USD',
      billingCycle: 'monthly',
      confidence: 'low'
    };
  }
}

export const emailParser = new EmailParser();
```

**Day 5: Test Parser**

**File:** `server/routes/gmailRoutes.ts`
```typescript
import { emailParser } from '../lib/emailParser';

// Add test route:
router.get('/test-parser', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseId, req.user!.uid)
    });

    if (!user?.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Get one subscription email
    const messages = await gmailService.getRecentSubscriptionEmails(user.gmailRefreshToken, 1);
    if (messages.length === 0) {
      return res.json({ message: 'No subscription emails found' });
    }

    const email = await gmailService.getEmailDetails(user.gmailRefreshToken, messages[0].id!);
    const parsed = await emailParser.parseEmail(email.subject, email.from, email.body);

    res.json({
      email: {
        subject: email.subject,
        from: email.from
      },
      parsed
    });
  } catch (error) {
    console.error('Error testing parser:', error);
    res.status(500).json({ error: 'Failed to test parser' });
  }
});
```

Test with your own Gmail:
```bash
GET http://localhost:5000/api/gmail/test-parser

# Should return parsed subscription details
```

### Week 4: AI Fallback Parser & Save to Database

**Day 1-2: OpenAI Parser**

**Add to:** `server/lib/emailParser.ts`
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export class EmailParser {
  // ... existing methods

  async parseWithAI(
    subject: string,
    from: string,
    body: string
  ): Promise<ParsedSubscription | null> {
    try {
      const prompt = `Extract subscription details from this email. Return JSON only.

Subject: ${subject}
From: ${from}
Body: ${body.substring(0, 2000)}

Extract:
- merchantName (company/service name)
- planName (if mentioned, e.g., "Pro", "Plus", "Premium")
- amount (number only, no currency symbol)
- currency (USD, EUR, etc.)
- billingCycle (monthly, annual, quarterly, or weekly)
- trialEndDate (ISO date string if mentioned, null otherwise)

Return JSON in this exact format:
{
  "merchantName": "...",
  "planName": "...",
  "amount": "...",
  "currency": "...",
  "billingCycle": "...",
  "trialEndDate": "..."
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0
      });

      const content = completion.choices[0].message.content;
      if (!content) return null;

      const result = JSON.parse(content);

      return {
        merchantName: result.merchantName || 'Unknown Service',
        planName: result.planName,
        amount: result.amount,
        currency: result.currency || 'USD',
        billingCycle: result.billingCycle || 'monthly',
        trialEndDate: result.trialEndDate ? new Date(result.trialEndDate) : undefined,
        confidence: 'medium' // AI parsing is less reliable than patterns
      };
    } catch (error) {
      console.error('Error parsing with AI:', error);
      return null;
    }
  }

  // Update main parseEmail method to use AI as fallback:
  async parseEmail(
    subject: string,
    from: string,
    body: string
  ): Promise<ParsedSubscription | null> {

    // Try pattern matching first
    let result = null;

    if (from.includes('stripe.com')) {
      result = this.parseStripeEmail(subject, body);
    } else if (from.includes('paypal.com')) {
      result = this.parsePayPalEmail(subject, body);
    } else {
      result = this.parseGenericEmail(subject, body);
    }

    // If pattern matching worked and has high confidence, return it
    if (result && result.confidence === 'high') {
      return result;
    }

    // Otherwise, try AI parsing
    const aiResult = await this.parseWithAI(subject, from, body);

    // Return whichever has higher confidence (or AI result if pattern failed)
    return aiResult || result;
  }
}
```

**Day 3-4: Subscription Storage**

**File:** `server/storage/SubscriptionStorage.ts` (create new)
```typescript
import { db } from '../db';
import { subscriptions, parsedEmails } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export class SubscriptionStorage {

  async createSubscription(data: {
    userId: string;
    merchantName: string;
    planName?: string;
    amount: string;
    currency: string;
    billingCycle: string;
    firstBillingDate?: Date;
    trialEndDate?: Date;
    status: string;
    sourceEmailId?: string;
    confidence?: string;
  }) {
    const [subscription] = await db.insert(subscriptions)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    return subscription;
  }

  async findDuplicate(userId: string, merchantName: string) {
    return await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.merchantName, merchantName),
        eq(subscriptions.status, 'active')
      )
    });
  }

  async recordParsedEmail(data: {
    userId: string;
    gmailMessageId: string;
    fromEmail: string;
    subject: string;
    receivedAt: Date;
    parsingStatus: string;
    subscriptionId?: number;
    errorMessage?: string;
  }) {
    await db.insert(parsedEmails).values({
      ...data,
      createdAt: new Date()
    });
  }

  async getSubscriptionsByUser(userId: string) {
    return await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, userId),
      orderBy: (subs, { desc }) => [desc(subs.createdAt)]
    });
  }
}

export const subscriptionStorage = new SubscriptionStorage();
```

**Day 5: Manual Scan Endpoint**

**File:** `server/routes/gmailRoutes.ts`
```typescript
import { emailParser } from '../lib/emailParser';
import { subscriptionStorage } from '../storage/SubscriptionStorage';

// POST /api/gmail/scan - Manually trigger inbox scan
router.post('/scan', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.firebaseId, req.user!.uid)
    });

    if (!user?.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Get subscription emails (last 6 months, max 100)
    const messages = await gmailService.getRecentSubscriptionEmails(
      user.gmailRefreshToken,
      100
    );

    let successCount = 0;
    let failedCount = 0;

    for (const message of messages) {
      try {
        // Get email details
        const email = await gmailService.getEmailDetails(
          user.gmailRefreshToken,
          message.id!
        );

        // Parse email
        const parsed = await emailParser.parseEmail(
          email.subject,
          email.from,
          email.body
        );

        if (!parsed) {
          // Record failed parse
          await subscriptionStorage.recordParsedEmail({
            userId: user.firebaseId,
            gmailMessageId: message.id!,
            fromEmail: email.from,
            subject: email.subject,
            receivedAt: new Date(email.date),
            parsingStatus: 'failed',
            errorMessage: 'Could not extract subscription details'
          });
          failedCount++;
          continue;
        }

        // Check for duplicate
        const duplicate = await subscriptionStorage.findDuplicate(
          user.firebaseId,
          parsed.merchantName
        );

        if (duplicate) {
          await subscriptionStorage.recordParsedEmail({
            userId: user.firebaseId,
            gmailMessageId: message.id!,
            fromEmail: email.from,
            subject: email.subject,
            receivedAt: new Date(email.date),
            parsingStatus: 'skipped',
            subscriptionId: duplicate.id
          });
          continue;
        }

        // Create subscription
        const subscription = await subscriptionStorage.createSubscription({
          userId: user.firebaseId,
          merchantName: parsed.merchantName,
          planName: parsed.planName,
          amount: parsed.amount,
          currency: parsed.currency,
          billingCycle: parsed.billingCycle,
          trialEndDate: parsed.trialEndDate,
          status: parsed.trialEndDate ? 'trial' : 'active',
          sourceEmailId: message.id!,
          confidence: parsed.confidence
        });

        // Record successful parse
        await subscriptionStorage.recordParsedEmail({
          userId: user.firebaseId,
          gmailMessageId: message.id!,
          fromEmail: email.from,
          subject: email.subject,
          receivedAt: new Date(email.date),
          parsingStatus: 'success',
          subscriptionId: subscription.id
        });

        successCount++;

      } catch (error) {
        console.error('Error processing email:', error);
        failedCount++;
      }
    }

    // Update last scan timestamp
    await db.update(users)
      .set({ lastGmailScan: new Date() })
      .where(eq(users.firebaseId, user.firebaseId));

    res.json({
      totalProcessed: messages.length,
      subscriptionsCreated: successCount,
      failed: failedCount
    });

  } catch (error) {
    console.error('Error scanning Gmail:', error);
    res.status(500).json({ error: 'Failed to scan Gmail' });
  }
});
```

**Test the full flow:**
```bash
# 1. Connect Gmail (if not already)
# 2. Trigger scan:
POST http://localhost:5000/api/gmail/scan

# Should return:
{
  "totalProcessed": 15,
  "subscriptionsCreated": 8,
  "failed": 7
}

# 3. Check database - should see subscriptions in subscriptions table
```

**✅ Milestone 2 Complete:** You can scan Gmail and create subscriptions!

---

## Phase 3: Dashboard & UI (Weeks 5-6)
**Goal:** Display subscriptions beautifully, add CRUD operations

### Week 5: Subscription Routes & Dashboard

**Day 1-2: Subscription API Routes**

**File:** `server/routes/subscriptionRoutes.ts` (create new)
```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { subscriptionStorage } from '../storage/SubscriptionStorage';
import { db } from '../db';
import { subscriptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /api/subscriptions - List all subscriptions
router.get('/', requireAuth, async (req, res) => {
  try {
    const subs = await subscriptionStorage.getSubscriptionsByUser(req.user!.uid);
    res.json(subs);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/subscriptions/stats - Dashboard statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const subs = await subscriptionStorage.getSubscriptionsByUser(req.user!.uid);

    // Calculate monthly cost
    const monthlyCost = subs.reduce((total, sub) => {
      const amount = parseFloat(sub.amount);
      if (sub.billingCycle === 'monthly') {
        return total + amount;
      } else if (sub.billingCycle === 'annual') {
        return total + (amount / 12);
      } else if (sub.billingCycle === 'quarterly') {
        return total + (amount / 3);
      }
      return total;
    }, 0);

    // Count by status
    const statusCounts = {
      active: subs.filter(s => s.status === 'active').length,
      trial: subs.filter(s => s.status === 'trial').length,
      cancelled: subs.filter(s => s.status === 'cancelled').length
    };

    res.json({
      total: subs.length,
      monthlyCost: monthlyCost.toFixed(2),
      annualCost: (monthlyCost * 12).toFixed(2),
      statusCounts
    });
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// POST /api/subscriptions - Manually add subscription
router.post('/', requireAuth, async (req, res) => {
  try {
    const { merchantName, planName, amount, currency, billingCycle } = req.body;

    // Validation
    if (!merchantName || !amount || !billingCycle) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const subscription = await subscriptionStorage.createSubscription({
      userId: req.user!.uid,
      merchantName,
      planName,
      amount: amount.toString(),
      currency: currency || 'USD',
      billingCycle,
      status: 'active',
      isManualEntry: true,
      confidence: 'high'
    });

    res.json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// PATCH /api/subscriptions/:id - Update subscription
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verify ownership
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, parseInt(id))
    });

    if (!existing || existing.userId !== req.user!.uid) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const [updated] = await db.update(subscriptions)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, parseInt(id)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// DELETE /api/subscriptions/:id - Delete subscription
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.id, parseInt(id))
    });

    if (!existing || existing.userId !== req.user!.uid) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await db.delete(subscriptions)
      .where(eq(subscriptions.id, parseInt(id)));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// POST /api/subscriptions/:id/cancel - Mark as cancelled
router.post('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [updated] = await db.update(subscriptions)
      .set({
        status: 'cancelled',
        cancelledDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(subscriptions.id, parseInt(id)),
        eq(subscriptions.userId, req.user!.uid)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
```

Register in `server/routes/index.ts`:
```typescript
import subscriptionRoutes from './subscriptionRoutes';
app.use('/api/subscriptions', subscriptionRoutes);
```

**Day 3-5: Dashboard UI**

**File:** `client/src/pages/dashboard.tsx` (complete rewrite)
```typescript
import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Subscription {
  id: number;
  merchantName: string;
  planName?: string;
  amount: string;
  currency: string;
  billingCycle: string;
  status: string;
  trialEndDate?: string;
  confidence?: string;
}

interface Stats {
  total: number;
  monthlyCost: string;
  annualCost: string;
  statusCounts: {
    active: number;
    trial: number;
    cancelled: number;
  };
}

export default function Dashboard() {
  const [gmailStatus, setGmailStatus] = useState({ connected: false, lastScan: null });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusData, subsData, statsData] = await Promise.all([
        apiGet('/api/gmail/status'),
        apiGet('/api/subscriptions'),
        apiGet('/api/subscriptions/stats')
      ]);

      setGmailStatus(statusData);
      setSubscriptions(subsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectGmail = async () => {
    try {
      const data = await apiGet('/api/gmail/connect');
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Error connecting Gmail:', error);
    }
  };

  const scanGmail = async () => {
    try {
      setScanning(true);
      await apiPost('/api/gmail/scan', {});
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error scanning Gmail:', error);
    } finally {
      setScanning(false);
    }
  };

  const deleteSubscription = async (id: number) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      await apiDelete(`/api/subscriptions/${id}`);
      await loadData();
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Track all your subscriptions in one place</p>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-600 mt-1">
                {stats.statusCounts.active} active, {stats.statusCounts.trial} trials
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Monthly Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${stats.monthlyCost}</div>
              <p className="text-sm text-gray-600 mt-1">${stats.annualCost}/year</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Gmail Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {gmailStatus.connected ? (
                <div>
                  <div className="text-green-600 font-semibold">✓ Connected</div>
                  <Button
                    onClick={scanGmail}
                    disabled={scanning}
                    className="mt-2 w-full"
                    variant="outline"
                  >
                    {scanning ? 'Scanning...' : 'Scan for new subscriptions'}
                  </Button>
                </div>
              ) : (
                <Button onClick={connectGmail} className="w-full">
                  Connect Gmail
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Subscriptions</CardTitle>
          <CardDescription>
            {subscriptions.length === 0
              ? 'No subscriptions found. Connect Gmail to start scanning.'
              : `Showing ${subscriptions.length} subscription${subscriptions.length === 1 ? '' : 's'}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-4">Connect your Gmail account to automatically detect subscriptions</p>
              {!gmailStatus.connected && (
                <Button onClick={connectGmail}>Connect Gmail</Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map(sub => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{sub.merchantName}</h3>
                      {sub.planName && (
                        <span className="text-sm text-gray-600">({sub.planName})</span>
                      )}
                      {sub.status === 'trial' && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Trial
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      ${sub.amount}/{sub.billingCycle}
                      {sub.trialEndDate && (
                        <span className="ml-2">
                          • Trial ends {new Date(sub.trialEndDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteSubscription(sub.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**✅ Milestone 3 Complete:** Beautiful dashboard showing subscriptions!

---

**(Continuing in next message due to length...)**

Would you like me to continue with Weeks 7-16 covering:
- Trial reminders
- Background jobs
- Testing
- Deployment
- Go-to-market

Or would you prefer to start building Weeks 1-6 first and come back to this document later?
