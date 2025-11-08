import type { Express } from 'express';
import { gmailService, encryptToken } from '../lib/gmailService';
import { parseSubscriptionEmail } from '../lib/emailParser';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';
import { users, parsedEmails, subscriptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

export async function registerGmailRoutes(app: Express) {
  // ============================================================================
  // GMAIL OAUTH FLOW
  // ============================================================================

  /**
   * GET /api/gmail/connect
   * Step 1: Generate OAuth URL for user to authorize Gmail access
   */
  app.get('/api/gmail/connect', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    // Generate OAuth URL with user ID in state parameter
    const stateData = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrl = gmailService.getAuthUrl(stateData);

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Gmail auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/gmail/callback
 * Step 2: Handle OAuth callback from Google
 */
  app.get('/api/gmail/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?gmail_error=${error}`);
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Decode state to get user ID
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
    const userId = stateData.userId;

    if (!userId) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);

    if (!tokens.refresh_token) {
      return res.status(400).json({ error: 'No refresh token received. Please try again.' });
    }

    // Encrypt tokens before storing
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    const encryptedAccessToken = tokens.access_token ? encryptToken(tokens.access_token) : null;
    const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Update user record with Gmail OAuth tokens
    await db
      .update(users)
      .set({
        gmailRefreshToken: encryptedRefreshToken,
        gmailAccessToken: encryptedAccessToken,
        gmailTokenExpiry: tokenExpiry,
        gmailConnected: true,
        lastGmailScan: null, // Will be set on first scan
        updatedAt: new Date(),
      })
      .where(eq(users.firebaseId, userId));

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?gmail_connected=true`);
  } catch (error) {
    console.error('Error in Gmail callback:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?gmail_error=callback_failed`);
  }
});

/**
 * POST /api/gmail/disconnect
 * Revoke Gmail access and remove tokens
 */
  app.post('/api/gmail/disconnect', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    // Get user's refresh token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseId, userId))
      .limit(1);

    if (!user || !user.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Revoke token with Google
    try {
      await gmailService.revokeToken(user.gmailRefreshToken);
    } catch (error) {
      console.error('Error revoking token:', error);
      // Continue anyway - we'll clear local tokens
    }

    // Clear tokens from database
    await db
      .update(users)
      .set({
        gmailRefreshToken: null,
        gmailAccessToken: null,
        gmailTokenExpiry: null,
        gmailConnected: false,
        lastGmailScan: null,
        updatedAt: new Date(),
      })
      .where(eq(users.firebaseId, userId));

    res.json({ success: true, message: 'Gmail disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

/**
 * GET /api/gmail/status
 * Check if user has Gmail connected
 */
  app.get('/api/gmail/status', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    const [user] = await db
      .select({
        gmailConnected: users.gmailConnected,
        lastGmailScan: users.lastGmailScan,
      })
      .from(users)
      .where(eq(users.firebaseId, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      connected: user.gmailConnected,
      lastScan: user.lastGmailScan,
    });
  } catch (error) {
    console.error('Error checking Gmail status:', error);
    res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

// ============================================================================
// EMAIL SCANNING
// ============================================================================

/**
 * POST /api/gmail/scan
 * Manually trigger inbox scan for subscriptions
 */
  app.post('/api/gmail/scan', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.uid;

    // Get user's Gmail tokens
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseId, userId))
      .limit(1);

    if (!user || !user.gmailRefreshToken) {
      return res.status(400).json({ error: 'Gmail not connected' });
    }

    // Scan inbox (last 6 months on first scan, or since last scan)
    const sinceDate = user.lastGmailScan || undefined;
    const messages = await gmailService.scanInbox(user.gmailRefreshToken, sinceDate);

    console.log(`Found ${messages.length} potential subscription emails`);

    // Process emails in batches
    const batchSize = 10;
    let processedCount = 0;
    let newSubscriptions = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);

      for (const message of batch) {
        try {
          // Check if we already processed this email
          const [existing] = await db
            .select()
            .from(parsedEmails)
            .where(
              and(
                eq(parsedEmails.userId, userId),
                eq(parsedEmails.gmailMessageId, message.id)
              )
            )
            .limit(1);

          if (existing) {
            continue; // Skip already processed
          }

          // Fetch email details
          const emailDetails = await gmailService.getEmailDetails(user.gmailRefreshToken, message.id);

          // Parse email for subscription data
          const parseResult = await parseSubscriptionEmail(
            emailDetails.subject,
            emailDetails.from,
            emailDetails.body,
            emailDetails.snippet
          );

          // Store parsed email record
          const retentionUntil = new Date();
          retentionUntil.setDate(retentionUntil.getDate() + 30); // 30-day retention

          if (parseResult.success && parseResult.data) {
            // Create subscription
            const [subscription] = await db
              .insert(subscriptions)
              .values({
                userId,
                merchantName: parseResult.data.merchantName,
                planName: parseResult.data.planName,
                amount: parseResult.data.amount,
                currency: parseResult.data.currency,
                billingCycle: parseResult.data.billingCycle,
                firstBillingDate: parseResult.data.firstBillingDate,
                nextBillingDate: parseResult.data.nextBillingDate,
                trialEndDate: parseResult.data.trialEndDate,
                status: parseResult.data.status,
                confidence: parseResult.data.confidence,
                category: parseResult.data.category,
                isManualEntry: false,
              })
              .returning({ id: subscriptions.id });

            // Store parsed email reference
            await db.insert(parsedEmails).values({
              userId,
              gmailMessageId: message.id,
              fromEmail: emailDetails.from,
              subject: emailDetails.subject,
              receivedAt: emailDetails.receivedAt,
              emailSnippet: emailDetails.snippet.substring(0, 500),
              parsingStatus: 'success',
              extractedData: JSON.stringify(parseResult.data),
              subscriptionId: subscription.id,
              retentionUntil,
            });

            newSubscriptions++;
          } else {
            // Store failed parse
            await db.insert(parsedEmails).values({
              userId,
              gmailMessageId: message.id,
              fromEmail: emailDetails.from,
              subject: emailDetails.subject,
              receivedAt: emailDetails.receivedAt,
              emailSnippet: emailDetails.snippet.substring(0, 500),
              parsingStatus: 'failed',
              errorMessage: parseResult.error || 'Unknown error',
              retentionUntil,
            });
          }

          processedCount++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          // Continue with next message
        }
      }
    }

    // Update last scan timestamp
    await db
      .update(users)
      .set({
        lastGmailScan: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.firebaseId, userId));

    res.json({
      success: true,
      totalEmails: messages.length,
      processed: processedCount,
      newSubscriptions,
    });
  } catch (error) {
    console.error('Error scanning Gmail:', error);
    res.status(500).json({ error: 'Failed to scan Gmail inbox' });
  }
  });
}
