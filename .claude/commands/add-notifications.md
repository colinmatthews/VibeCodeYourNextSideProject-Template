# /add-notifications - Add User Notifications

You are a helpful assistant that guides users through adding notification features to their VibeCode Template app. This leverages existing user authentication, database, and email systems to create a comprehensive notification system.

## What This Command Does

Helps users add email notification functionality using existing integrations:
- User authentication system for user-specific notifications
- Database (Render PostgreSQL) for storing notification preferences
- Email system (SendGrid) for email notifications
- Existing UI components for notification preferences

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Email Notification Types:**
- [ ] What email notifications do users need?
  - a) Account notifications (profile changes, password resets)
  - b) Payment notifications (successful payments, failed charges)
  - c) Feature notifications (file uploads, AI completions)
  - d) System notifications (maintenance, updates)
  - e) Scheduled notifications (weekly summaries, reminders)

**Notification Triggers:**
- [ ] When should notifications be sent?
  - User account changes (profile, subscription)
  - System events (payments, uploads, AI completions)
  - User interactions (mentions, shares, comments)
  - Scheduled events (weekly summaries, reminders)
  - Admin announcements

**Email Preferences:**
- [ ] How much control should users have?
  - Simple on/off toggle for all email notifications
  - Granular control by notification type
  - Frequency settings (instant, daily digest, weekly)
  - Unsubscribe options for each category

## Step 2: Implementation Based on User Answers

### Option A: Email Notification System

If user wants email notification system:

1. **Create Email Preferences Database Schema**
   ```typescript
   // Add to shared/schema.ts
   export const emailPreferences = pgTable('email_preferences', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     category: text('category'), // 'payment', 'account', 'system', 'feature'
     enabled: boolean('enabled').default(true),
     frequency: text('frequency').$type<'instant' | 'daily' | 'weekly' | 'never'>().default('instant'),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });
   
   export const emailNotificationLog = pgTable('email_notification_log', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     category: text('category'),
     subject: text('subject'),
     sentAt: timestamp('sent_at').defaultNow(),
     status: text('status').$type<'sent' | 'failed' | 'bounced'>().default('sent'),
   });
   ```

2. **Create Email Notification Service**
   ```typescript
   // server/services/emailNotificationService.ts
   import { db } from '../db';
   import { emailPreferences, emailNotificationLog, users } from '../../shared/schema';
   import { eq, and } from 'drizzle-orm';
   import sgMail from '@sendgrid/mail';
   
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   
   export interface EmailNotificationData {
     userId: string;
     category: string;
     subject: string;
     htmlContent: string;
     textContent?: string;
     actionUrl?: string;
     actionText?: string;
   }
   
   export const emailNotificationService = {
     async sendNotification(data: EmailNotificationData) {
       // Get user preferences for this category
       const [preferences] = await db
         .select()
         .from(emailPreferences)
         .where(
           and(
             eq(emailPreferences.userId, data.userId),
             eq(emailPreferences.category, data.category)
           )
         );
   
       // Skip if notifications are disabled for this category
       if (preferences && !preferences.enabled) {
         console.log(`Email notification skipped for user ${data.userId}, category ${data.category}`);
         return;
       }
   
       // Get user email
       const [user] = await db
         .select({ email: users.email, firstName: users.firstName })
         .from(users)
         .where(eq(users.firebaseId, data.userId));
   
       if (!user?.email) {
         console.error(`No email found for user ${data.userId}`);
         return;
       }
   
       try {
         // Send email
         const msg = {
           to: user.email,
           from: process.env.SENDGRID_FROM_EMAIL!,
           subject: data.subject,
           html: this.generateEmailTemplate(data, user.firstName),
           text: data.textContent || this.stripHtml(data.htmlContent),
         };
   
         await sgMail.send(msg);
   
         // Log successful send
         await db
           .insert(emailNotificationLog)
           .values({
             userId: data.userId,
             category: data.category,
             subject: data.subject,
             status: 'sent',
           });
   
         console.log(`Email notification sent to ${user.email}`);
       } catch (error) {
         console.error('Error sending email notification:', error);
         
         // Log failed send
         await db
           .insert(emailNotificationLog)
           .values({
             userId: data.userId,
             category: data.category,
             subject: data.subject,
             status: 'failed',
           });
       }
     },
   
     generateEmailTemplate(data: EmailNotificationData, firstName?: string) {
       return `
         <!DOCTYPE html>
         <html>
         <head>
           <meta charset="utf-8">
           <title>${data.subject}</title>
           <style>
             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
             .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
             .content { padding: 20px; }
             .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
             .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
           </style>
         </head>
         <body>
           <div class="container">
             <div class="header">
               <h2>Hello ${firstName || 'there'}!</h2>
             </div>
             
             <div class="content">
               ${data.htmlContent}
               
               ${data.actionUrl ? `
                 <p>
                   <a href="${data.actionUrl}" class="button">
                     ${data.actionText || 'View Details'}
                   </a>
                 </p>
               ` : ''}
             </div>
             
             <div class="footer">
               <p>This email was sent to you because you have notifications enabled for this category.</p>
               <p><a href="${process.env.FRONTEND_URL}/settings/notifications">Manage your notification preferences</a></p>
             </div>
           </div>
         </body>
         </html>
       `;
     },
   
     stripHtml(html: string): string {
       return html.replace(/<[^>]*>/g, '');
     },
   
     async getUserPreferences(userId: string) {
       return await db
         .select()
         .from(emailPreferences)
         .where(eq(emailPreferences.userId, userId));
     },
   
     async updatePreferences(userId: string, preferences: Array<{ category: string; enabled: boolean; frequency: string }>) {
       for (const pref of preferences) {
         await db
           .insert(emailPreferences)
           .values({
             userId,
             category: pref.category,
             enabled: pref.enabled,
             frequency: pref.frequency,
           })
           .onConflictDoUpdate({
             target: [emailPreferences.userId, emailPreferences.category],
             set: {
               enabled: pref.enabled,
               frequency: pref.frequency,
               updatedAt: new Date(),
             },
           });
       }
     },
   };
   ```

3. **Create Email Notification API Routes**
   ```typescript
   // server/routes/emailNotificationRoutes.ts
   import express from 'express';
   import { emailNotificationService } from '../services/emailNotificationService';
   
   const router = express.Router();
   
   router.get('/email-preferences', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const preferences = await emailNotificationService.getUserPreferences(userId);
       res.json(preferences);
     } catch (error) {
       console.error('Error fetching email preferences:', error);
       res.status(500).json({ error: 'Failed to fetch email preferences' });
     }
   });
   
   router.put('/email-preferences', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const preferences = req.body;
       
       await emailNotificationService.updatePreferences(userId, preferences);
       res.json({ success: true });
     } catch (error) {
       console.error('Error updating email preferences:', error);
       res.status(500).json({ error: 'Failed to update email preferences' });
     }
   });
   
   router.post('/test-email/:category', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const category = req.params.category;
       
       await emailNotificationService.sendNotification({
         userId,
         category,
         subject: `Test Email - ${category}`,
         htmlContent: '<p>This is a test email to verify your notification preferences.</p>',
         actionUrl: `${process.env.FRONTEND_URL}/settings/notifications`,
         actionText: 'Update Preferences',
       });
       
       res.json({ success: true, message: 'Test email sent' });
     } catch (error) {
       console.error('Error sending test email:', error);
       res.status(500).json({ error: 'Failed to send test email' });
     }
   });
   
   export default router;
   ```

4. **Create Email Notification Templates**
   ```typescript
   // server/templates/emailTemplates.ts
   export const emailTemplates = {
     welcome: {
       subject: 'Welcome to Your App!',
       html: `
         <h2>Welcome aboard!</h2>
         <p>We're excited to have you as part of our community.</p>
         <p>Here's what you can do next:</p>
         <ul>
           <li>Complete your profile setup</li>
           <li>Upload your first file</li>
           <li>Explore our features</li>
         </ul>
       `,
     },
     
     paymentSuccess: {
       subject: 'Payment Successful - Welcome to Pro!',
       html: `
         <h2>Thank you for your payment!</h2>
         <p>Your Pro subscription has been activated successfully.</p>
         <p>You now have access to:</p>
         <ul>
           <li>Unlimited file uploads</li>
           <li>Priority support</li>
           <li>Advanced features</li>
         </ul>
       `,
     },
     
     fileUploadComplete: {
       subject: 'File Upload Complete',
       html: `
         <h2>Your file has been uploaded successfully!</h2>
         <p>File: <strong>{{fileName}}</strong></p>
         <p>Size: {{fileSize}}</p>
         <p>Uploaded: {{uploadDate}}</p>
       `,
     },
     
     weeklyDigest: {
       subject: 'Your Weekly Activity Summary',
       html: `
         <h2>Here's what happened this week</h2>
         <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
           <h3>Activity Summary</h3>
           <ul>
             <li>Files uploaded: {{filesCount}}</li>
             <li>Storage used: {{storageUsed}}</li>
             <li>Account status: {{accountStatus}}</li>
           </ul>
         </div>
       `,
     },
   };
   
   export function renderTemplate(templateName: keyof typeof emailTemplates, variables: Record<string, any>) {
     const template = emailTemplates[templateName];
     if (!template) {
       throw new Error(`Template ${templateName} not found`);
     }
     
     let html = template.html;
     let subject = template.subject;
     
     // Replace variables in template
     Object.entries(variables).forEach(([key, value]) => {
       const regex = new RegExp(`{{${key}}}`, 'g');
       html = html.replace(regex, String(value));
       subject = subject.replace(regex, String(value));
     });
     
     return { subject, html };
   }
   ```

### Option B: Email Notification Preferences

If user wants granular email notification controls:

1. **Create Email Notification Preferences Component**
   ```tsx
   // client/src/components/EmailNotificationPreferences.tsx
   import { useState, useEffect } from 'react';
   import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
   import { Switch } from './ui/switch';
   import { Label } from './ui/label';
   import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
   import { Button } from './ui/button';
   import { Mail, TestTube } from 'lucide-react';
   
   interface EmailPreference {
     category: string;
     enabled: boolean;
     frequency: 'instant' | 'daily' | 'weekly' | 'never';
   }
   
   const emailCategories = [
     { id: 'account', name: 'Account Updates', description: 'Password changes, profile updates, security alerts' },
     { id: 'payment', name: 'Billing & Payments', description: 'Payment confirmations, failed charges, subscription changes' },
     { id: 'system', name: 'System Notifications', description: 'Maintenance windows, system updates, service alerts' },
     { id: 'feature', name: 'Feature Updates', description: 'New features, product updates, tips and tricks' },
   ];
   
   export function EmailNotificationPreferences() {
     const [preferences, setPreferences] = useState<Record<string, EmailPreference>>({});
     const [loading, setLoading] = useState(true);
     const [saving, setSaving] = useState(false);
     const [testingEmail, setTestingEmail] = useState<string | null>(null);
   
     useEffect(() => {
       fetchPreferences();
     }, []);
   
     const fetchPreferences = async () => {
       try {
         const response = await fetch('/api/email-preferences');
         const data = await response.json();
         
         // Convert array to object for easier manipulation
         const prefsObj = data.reduce((acc: any, pref: any) => {
           acc[pref.category] = pref;
           return acc;
         }, {});
         
         // Fill in defaults for missing categories
         emailCategories.forEach(cat => {
           if (!prefsObj[cat.id]) {
             prefsObj[cat.id] = {
               category: cat.id,
               enabled: true,
               frequency: 'instant',
             };
           }
         });
         
         setPreferences(prefsObj);
       } catch (error) {
         console.error('Error fetching preferences:', error);
       } finally {
         setLoading(false);
       }
     };
   
     const updatePreference = (category: string, field: keyof EmailPreference, value: any) => {
       setPreferences(prev => ({
         ...prev,
         [category]: {
           ...prev[category],
           [field]: value,
         },
       }));
     };
   
     const savePreferences = async () => {
       setSaving(true);
       try {
         await fetch('/api/email-preferences', {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(Object.values(preferences)),
         });
       } catch (error) {
         console.error('Error saving preferences:', error);
       } finally {
         setSaving(false);
       }
     };
   
     const sendTestEmail = async (category: string) => {
       setTestingEmail(category);
       try {
         await fetch(`/api/test-email/${category}`, {
           method: 'POST',
         });
         alert('Test email sent! Check your inbox.');
       } catch (error) {
         console.error('Error sending test email:', error);
         alert('Failed to send test email. Please try again.');
       } finally {
         setTestingEmail(null);
       }
     };
   
     if (loading) {
       return <div>Loading email preferences...</div>;
     }
   
     return (
       <div className="space-y-6">
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Mail size={20} />
               Email Notification Preferences
             </CardTitle>
             <CardDescription>
               Choose when and how often you want to receive email notifications
             </CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-6">
               {emailCategories.map((category) => {
                 const pref = preferences[category.id];
                 return (
                   <div key={category.id} className="space-y-3 p-4 border rounded-lg">
                     <div>
                       <h4 className="font-medium">{category.name}</h4>
                       <p className="text-sm text-gray-600">{category.description}</p>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="flex items-center space-x-2">
                         <Switch
                           id={`${category.id}-enabled`}
                           checked={pref?.enabled || false}
                           onCheckedChange={(checked) =>
                             updatePreference(category.id, 'enabled', checked)
                           }
                         />
                         <Label htmlFor={`${category.id}-enabled`}>Enable emails</Label>
                       </div>
                       
                       <Select
                         value={pref?.frequency || 'instant'}
                         onValueChange={(value) =>
                           updatePreference(category.id, 'frequency', value)
                         }
                         disabled={!pref?.enabled}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="instant">Instant</SelectItem>
                           <SelectItem value="daily">Daily digest</SelectItem>
                           <SelectItem value="weekly">Weekly digest</SelectItem>
                           <SelectItem value="never">Never</SelectItem>
                         </SelectContent>
                       </Select>
                       
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => sendTestEmail(category.id)}
                         disabled={!pref?.enabled || testingEmail === category.id}
                       >
                         {testingEmail === category.id ? (
                           'Sending...'
                         ) : (
                           <>
                             <TestTube size={14} className="mr-1" />
                             Test Email
                           </>
                         )}
                       </Button>
                     </div>
                   </div>
                 );
               })}
             </div>
             
             <div className="mt-6 flex gap-2">
               <Button onClick={savePreferences} disabled={saving}>
                 {saving ? 'Saving...' : 'Save Preferences'}
               </Button>
               <Button
                 variant="outline"
                 onClick={() => {
                   // Disable all email notifications
                   const updatedPrefs = { ...preferences };
                   Object.keys(updatedPrefs).forEach(key => {
                     updatedPrefs[key].enabled = false;
                   });
                   setPreferences(updatedPrefs);
                 }}
               >
                 Disable All
               </Button>
             </div>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

### Option C: Email Notification Helpers

If user wants helper functions for common email scenarios:

1. **Create Email Notification Helpers**
   ```typescript
   // server/utils/emailNotificationHelpers.ts
   import { emailNotificationService } from '../services/emailNotificationService';
   import { renderTemplate } from '../templates/emailTemplates';
   
   export const emailHelpers = {
     async sendWelcomeEmail(userId: string) {
       const { subject, html } = renderTemplate('welcome', {});
       
       await emailNotificationService.sendNotification({
         userId,
         category: 'account',
         subject,
         htmlContent: html,
         actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
         actionText: 'Go to Dashboard',
       });
     },
   
     async sendPaymentSuccessEmail(userId: string, plan: string, amount: number) {
       const { subject, html } = renderTemplate('paymentSuccess', {
         plan,
         amount: `$${amount}`,
       });
       
       await emailNotificationService.sendNotification({
         userId,
         category: 'payment',
         subject,
         htmlContent: html,
         actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
         actionText: 'Access Pro Features',
       });
     },
   
     async sendFileUploadNotification(userId: string, fileName: string, fileSize: string) {
       const { subject, html } = renderTemplate('fileUploadComplete', {
         fileName,
         fileSize,
         uploadDate: new Date().toLocaleDateString(),
       });
       
       await emailNotificationService.sendNotification({
         userId,
         category: 'feature',
         subject,
         htmlContent: html,
         actionUrl: `${process.env.FRONTEND_URL}/files`,
         actionText: 'View Files',
       });
     },
   
     async sendWeeklyDigest(userId: string, stats: { filesCount: number; storageUsed: string; accountStatus: string }) {
       const { subject, html } = renderTemplate('weeklyDigest', {
         filesCount: stats.filesCount,
         storageUsed: stats.storageUsed,
         accountStatus: stats.accountStatus,
       });
       
       await emailNotificationService.sendNotification({
         userId,
         category: 'feature',
         subject,
         htmlContent: html,
         actionUrl: `${process.env.FRONTEND_URL}/dashboard`,
         actionText: 'View Dashboard',
       });
     },
   
     async sendCustomNotification(userId: string, category: string, data: {
       subject: string;
       title: string;
       message: string;
       actionUrl?: string;
       actionText?: string;
     }) {
       const htmlContent = `
         <h2>${data.title}</h2>
         <p>${data.message}</p>
       `;
       
       await emailNotificationService.sendNotification({
         userId,
         category,
         subject: data.subject,
         htmlContent,
         actionUrl: data.actionUrl,
         actionText: data.actionText,
       });
     },
   };
   ```

2. **Create Scheduled Email Service**
   ```typescript
   // server/services/scheduledEmailService.ts
   import cron from 'node-cron';
   import { db } from '../db';
   import { users, emailPreferences } from '../../shared/schema';
   import { eq } from 'drizzle-orm';
   import { emailHelpers } from '../utils/emailNotificationHelpers';
   
   export class ScheduledEmailService {
     start() {
       // Send weekly digest every Sunday at 9 AM
       cron.schedule('0 9 * * 0', async () => {
         await this.sendWeeklyDigests();
       });
       
       // Send monthly summary on 1st of each month at 10 AM
       cron.schedule('0 10 1 * *', async () => {
         await this.sendMonthlyReports();
       });
       
       console.log('Scheduled email service started');
     }
   
     async sendWeeklyDigests() {
       try {
         // Get all users who have weekly digest enabled
         const usersWithWeeklyDigest = await db
           .select({
             userId: users.firebaseId,
             email: users.email,
             firstName: users.firstName,
           })
           .from(users)
           .leftJoin(emailPreferences, eq(emailPreferences.userId, users.firebaseId))
           .where(eq(emailPreferences.frequency, 'weekly'));
   
         for (const user of usersWithWeeklyDigest) {
           // Calculate user stats for the week
           const stats = await this.calculateUserStats(user.userId);
           
           await emailHelpers.sendWeeklyDigest(user.userId, stats);
         }
         
         console.log(`Sent weekly digests to ${usersWithWeeklyDigest.length} users`);
       } catch (error) {
         console.error('Error sending weekly digests:', error);
       }
     }
   
     async sendMonthlyReports() {
       // Similar to weekly but for monthly reports
       console.log('Sending monthly reports...');
     }
   
     private async calculateUserStats(userId: string) {
       // Calculate user activity stats
       // This would query your database for user activity
       return {
         filesCount: 5,
         storageUsed: '250 MB',
         accountStatus: 'Active',
       };
     }
   }
   ```

## Step 3: Common Email Notification Triggers

Add email notification triggers throughout your app:

```typescript
// Example: In payment success handler
import { emailHelpers } from '../utils/emailNotificationHelpers';

// Payment success
await emailHelpers.sendPaymentSuccessEmail(
  user.firebaseId,
  'Pro',
  9.99
);

// File upload completion
await emailHelpers.sendFileUploadNotification(
  user.firebaseId,
  fileName,
  '2.5 MB'
);

// Welcome new user
await emailHelpers.sendWelcomeEmail(user.firebaseId);

// Custom notification
await emailHelpers.sendCustomNotification(
  user.firebaseId,
  'system',
  {
    subject: 'Account Security Alert',
    title: 'Security Update Required',
    message: 'We recommend updating your password for enhanced security.',
    actionUrl: '/settings/security',
    actionText: 'Update Security Settings',
  }
);
```

## Step 4: Testing Instructions

1. **Test Email Delivery**
   - [ ] Send test emails from preference settings
   - [ ] Verify emails arrive in inbox (check spam folder)
   - [ ] Test email formatting across different email clients
   - [ ] Test unsubscribe links work correctly

2. **Test Email Preferences**
   - [ ] Update preferences and verify they're saved
   - [ ] Test frequency settings (instant, daily, weekly)
   - [ ] Verify disabled categories don't send emails
   - [ ] Test "Disable All" functionality

3. **Test Email Templates**
   - [ ] Verify template variables are replaced correctly
   - [ ] Test responsive design on mobile email clients
   - [ ] Ensure action buttons work properly
   - [ ] Test email accessibility

## Step 5: Next Steps

After implementation:
- [ ] Set up email delivery monitoring and analytics
- [ ] Add email bounce and complaint handling
- [ ] Create more email templates for different scenarios
- [ ] Implement email scheduling for optimal delivery times
- [ ] Add email personalization features
- [ ] Set up email list segmentation
- [ ] Monitor email deliverability and sender reputation

## Remember

- Respect user preferences and provide easy unsubscribe options
- Don't overwhelm users with too many emails
- Make emails actionable with clear next steps
- Test email delivery across different email providers
- Follow email marketing best practices and regulations (CAN-SPAM, GDPR)
- Consider timezone-appropriate timing for scheduled emails
- Monitor email metrics (open rates, click rates, unsubscribes)
- Maintain good sender reputation by avoiding spam triggers