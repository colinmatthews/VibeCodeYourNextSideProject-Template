import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.OAUTH_TOKEN_ENCRYPTION_KEY || 'development-key-32-characters!', 'utf-8').subarray(0, 32);
const ALGORITHM = 'aes-256-gcm';

// ============================================================================
// ENCRYPTION / DECRYPTION
// ============================================================================

// Encrypt OAuth tokens before storing in database
export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Decrypt OAuth tokens when retrieving from database
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

// ============================================================================
// GMAIL SERVICE
// ============================================================================

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // --------------------------------------------------------------------------
  // OAUTH FLOW
  // --------------------------------------------------------------------------

  // Step 1: Generate OAuth URL for user to authorize
  getAuthUrl(state?: string): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Get refresh token
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
      prompt: 'consent', // Force consent screen to always get refresh token
      state: state // Pass user ID to retrieve after callback
    });
  }

  // Step 2: Exchange authorization code for tokens
  async getTokensFromCode(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Step 3: Test connection by getting user's email address
  async getUserEmail(refreshToken: string): Promise<string> {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return profile.data.emailAddress!;
  }

  // --------------------------------------------------------------------------
  // EMAIL SCANNING
  // --------------------------------------------------------------------------

  /**
   * Scan inbox for subscription-related emails
   * @param refreshToken - Encrypted refresh token from database
   * @param since - Only scan emails after this date (optional)
   * @param maxResults - Maximum number of messages to return (default: 500)
   * @returns Array of Gmail message IDs
   */
  async scanInbox(
    refreshToken: string,
    since?: Date,
    maxResults: number = 500
  ): Promise<Array<{ id: string; threadId: string }>> {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    // Build search query
    const queryParts = [
      // Subject line keywords
      'subject:(subscription OR receipt OR invoice OR "payment confirmation" OR trial OR billing OR membership)',
      // Common payment processors
      'OR from:(stripe.com OR paypal.com OR apple.com OR google.com OR "no-reply@" OR noreply@)',
      // Additional patterns
      'OR ("your subscription" OR "monthly charge" OR "annual renewal" OR "free trial")'
    ];

    // Add date filter if provided
    if (since) {
      const timestamp = Math.floor(since.getTime() / 1000);
      queryParts.push(`after:${timestamp}`);
    } else {
      // Default: last 6 months for initial scan
      queryParts.push('after:6m');
    }

    const query = queryParts.join(' ');

    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      });

      return response.data.messages || [];
    } catch (error) {
      console.error('Gmail API error:', error);
      throw new Error('Failed to scan Gmail inbox');
    }
  }

  /**
   * Get details of a specific email message
   * @param refreshToken - Encrypted refresh token
   * @param messageId - Gmail message ID
   * @returns Parsed email data
   */
  async getEmailDetails(refreshToken: string, messageId: string) {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    try {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      // Parse headers
      const headers = message.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const dateHeader = headers.find(h => h.name === 'Date')?.value || '';
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      // Extract body (simplified - handles plain text and HTML)
      let body = '';
      let snippet = message.data.snippet || '';

      // Try to get body from payload
      const payload = message.data.payload;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        // Multi-part message - find text/plain or text/html
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            break;
          } else if (part.mimeType === 'text/html' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }

      return {
        id: messageId,
        subject,
        from,
        receivedAt,
        body,
        snippet // Gmail's auto-generated snippet (first ~200 chars)
      };
    } catch (error) {
      console.error(`Error fetching email ${messageId}:`, error);
      throw new Error('Failed to fetch email details');
    }
  }

  /**
   * Get multiple email details in batch
   * @param refreshToken - Encrypted refresh token
   * @param messageIds - Array of Gmail message IDs
   * @returns Array of parsed email data
   */
  async getEmailDetailsBatch(
    refreshToken: string,
    messageIds: string[]
  ): Promise<Array<ReturnType<typeof this.getEmailDetails>>> {
    const promises = messageIds.map(id => this.getEmailDetails(refreshToken, id));
    return Promise.all(promises);
  }

  // --------------------------------------------------------------------------
  // TOKEN MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Refresh access token using refresh token
   * @param refreshToken - Encrypted refresh token
   * @returns New access token and expiry
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiry: Date;
  }> {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: credentials.access_token!,
      expiry: new Date(credentials.expiry_date || Date.now() + 3600 * 1000)
    };
  }

  /**
   * Revoke access token (disconnect Gmail)
   * @param refreshToken - Encrypted refresh token
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const decryptedToken = decryptToken(refreshToken);
    this.oauth2Client.setCredentials({ refresh_token: decryptedToken });

    await this.oauth2Client.revokeCredentials();
  }
}

// Export singleton instance
export const gmailService = new GmailService();
