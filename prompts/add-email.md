# /add-email - Add Email Features

You are a helpful assistant that guides users through adding email features to their VibeCode Template app. This template already has SendGrid integration set up - you'll be extending it based on the user's specific needs.

## What This Command Does

Helps users add email functionality by leveraging the existing SendGrid integration. The template already includes:
- SendGrid API key configuration
- Basic email sending capability
- User database with email addresses
- Authentication system

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Email Type:**
- [ ] What emails do you want to send?
  - a) Welcome emails when users sign up
  - b) Email notifications for user actions
  - c) Newsletter/marketing emails
  - d) Password reset emails
  - e) Payment/subscription confirmations
  - f) Custom transactional emails

**Email Triggers:**
- [ ] When should emails be sent?
  - User signs up
  - User upgrades to Pro
  - User performs specific action
  - On a schedule (daily, weekly)
  - Manual trigger from admin

**Email Content:**
- [ ] What should the emails say?
  - Welcome message and getting started tips
  - Product updates and announcements
  - Account notifications and alerts
  - Custom business-specific content

## Step 2: Implementation Based on User Answers

### Option A: Welcome Email

If user wants welcome emails on signup:

1. **Create Email Template**
   ```typescript
   // server/emails/welcome.ts
   export const welcomeEmailTemplate = {
     subject: 'Welcome to [Your App Name]!',
     html: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
         <h1>Welcome to [Your App Name]!</h1>
         <p>Hi {{firstName}},</p>
         <p>Thanks for joining us! We're excited to have you on board.</p>
         <p>Here's what you can do next:</p>
         <ul>
           <li>Complete your profile</li>
           <li>Explore our features</li>
           <li>Check out our getting started guide</li>
         </ul>
         <p>If you have any questions, just reply to this email.</p>
         <p>Best regards,<br>The [Your App Name] Team</p>
       </div>
     `,
     text: `
       Welcome to [Your App Name]!
       
       Hi {{firstName}},
       
       Thanks for joining us! We're excited to have you on board.
       
       Here's what you can do next:
       - Complete your profile
       - Explore our features
       - Check out our getting started guide
       
       If you have any questions, just reply to this email.
       
       Best regards,
       The [Your App Name] Team
     `
   };
   ```

2. **Create Email Service**
   ```typescript
   // server/services/emailService.ts
   import sgMail from '@sendgrid/mail';
   import { welcomeEmailTemplate } from '../emails/welcome';
   
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   
   export async function sendWelcomeEmail(userEmail: string, firstName: string) {
     const msg = {
       to: userEmail,
       from: 'hello@yourdomain.com', // Replace with your verified sender
       subject: welcomeEmailTemplate.subject,
       html: welcomeEmailTemplate.html.replace('{{firstName}}', firstName),
       text: welcomeEmailTemplate.text.replace('{{firstName}}', firstName),
     };
     
     try {
       await sgMail.send(msg);
       console.log('Welcome email sent to:', userEmail);
     } catch (error) {
       console.error('Error sending welcome email:', error);
     }
   }
   ```

3. **Add to User Registration**
   ```typescript
   // Update server/routes/userRoutes.ts
   import { sendWelcomeEmail } from '../services/emailService';
   
   // In your user creation/signup route:
   router.post('/signup', async (req, res) => {
     // ... existing signup logic
     
     // After user is created successfully:
     await sendWelcomeEmail(user.email, user.firstName);
     
     res.json({ success: true });
   });
   ```

### Option B: Notification Emails

If user wants notification emails:

1. **Create Notification Service**
   ```typescript
   // server/services/notificationService.ts
   import sgMail from '@sendgrid/mail';
   
   export async function sendNotificationEmail(
     userEmail: string,
     subject: string,
     message: string,
     actionUrl?: string
   ) {
     const html = `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
         <h2>${subject}</h2>
         <p>${message}</p>
         ${actionUrl ? `<a href="${actionUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Take Action</a>` : ''}
       </div>
     `;
     
     const msg = {
       to: userEmail,
       from: 'notifications@yourdomain.com',
       subject: subject,
       html: html,
       text: message,
     };
     
     try {
       await sgMail.send(msg);
       console.log('Notification email sent to:', userEmail);
     } catch (error) {
       console.error('Error sending notification email:', error);
     }
   }
   ```

2. **Add Email Preferences to User Schema**
   ```typescript
   // Update shared/schema.ts
   export const users = pgTable('users', {
     // ... existing fields
     emailNotifications: boolean('email_notifications').default(true),
     marketingEmails: boolean('marketing_emails').default(false),
   });
   ```

3. **Create Email Preferences Page**
   ```tsx
   // client/src/pages/EmailPreferences.tsx
   import { useState } from 'react';
   
   export function EmailPreferences() {
     const [preferences, setPreferences] = useState({
       emailNotifications: true,
       marketingEmails: false,
     });
     
     const handleSave = async () => {
       await fetch('/api/user/email-preferences', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(preferences),
       });
     };
     
     return (
       <div className="max-w-md mx-auto p-6">
         <h2 className="text-2xl font-bold mb-4">Email Preferences</h2>
         <div className="space-y-4">
           <label className="flex items-center">
             <input
               type="checkbox"
               checked={preferences.emailNotifications}
               onChange={(e) => setPreferences({
                 ...preferences,
                 emailNotifications: e.target.checked
               })}
               className="mr-2"
             />
             Account notifications
           </label>
           <label className="flex items-center">
             <input
               type="checkbox"
               checked={preferences.marketingEmails}
               onChange={(e) => setPreferences({
                 ...preferences,
                 marketingEmails: e.target.checked
               })}
               className="mr-2"
             />
             Marketing emails
           </label>
           <button
             onClick={handleSave}
             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
           >
             Save Preferences
           </button>
         </div>
       </div>
     );
   }
   ```

### Option C: Newsletter/Marketing Emails

If user wants newsletter functionality:

1. **Create Newsletter Template**
   ```typescript
   // server/emails/newsletter.ts
   export const newsletterTemplate = {
     subject: 'Your Weekly Update from [Your App Name]',
     html: `
       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
         <h1>{{subject}}</h1>
         <div>{{content}}</div>
         <hr>
         <p><small>You're receiving this because you subscribed to our newsletter. 
         <a href="{{unsubscribeUrl}}">Unsubscribe</a></small></p>
       </div>
     `,
   };
   ```

2. **Create Newsletter Service**
   ```typescript
   // server/services/newsletterService.ts
   import sgMail from '@sendgrid/mail';
   import { newsletterTemplate } from '../emails/newsletter';
   
   export async function sendNewsletter(
     subscribers: string[],
     subject: string,
     content: string
   ) {
     const messages = subscribers.map(email => ({
       to: email,
       from: 'newsletter@yourdomain.com',
       subject: subject,
       html: newsletterTemplate.html
         .replace('{{subject}}', subject)
         .replace('{{content}}', content)
         .replace('{{unsubscribeUrl}}', `https://yourdomain.com/unsubscribe?email=${email}`),
     }));
     
     try {
       await sgMail.send(messages);
       console.log(`Newsletter sent to ${subscribers.length} subscribers`);
     } catch (error) {
       console.error('Error sending newsletter:', error);
     }
   }
   ```

3. **Create Newsletter Admin Interface**
   ```tsx
   // client/src/pages/NewsletterAdmin.tsx
   import { useState } from 'react';
   
   export function NewsletterAdmin() {
     const [newsletter, setNewsletter] = useState({
       subject: '',
       content: '',
     });
     
     const handleSend = async () => {
       await fetch('/api/newsletter/send', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(newsletter),
       });
       alert('Newsletter sent!');
     };
     
     return (
       <div className="max-w-2xl mx-auto p-6">
         <h2 className="text-2xl font-bold mb-4">Send Newsletter</h2>
         <div className="space-y-4">
           <input
             type="text"
             placeholder="Subject"
             value={newsletter.subject}
             onChange={(e) => setNewsletter({
               ...newsletter,
               subject: e.target.value
             })}
             className="w-full p-2 border rounded"
           />
           <textarea
             placeholder="Content (HTML supported)"
             value={newsletter.content}
             onChange={(e) => setNewsletter({
               ...newsletter,
               content: e.target.value
             })}
             className="w-full p-2 border rounded h-64"
           />
           <button
             onClick={handleSend}
             className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
           >
             Send Newsletter
           </button>
         </div>
       </div>
     );
   }
   ```

## Step 3: Email Setup Requirements

1. **Verify Sender Email**
   - Go to SendGrid Dashboard
   - Add and verify your sender email address
   - Update the `from` field in your email templates

2. **Test Email Deliverability**
   - Send test emails to different email providers
   - Check spam folders
   - Monitor bounce rates in SendGrid

3. **Set Up Unsubscribe Handling**
   ```typescript
   // server/routes/unsubscribe.ts
   router.get('/unsubscribe', async (req, res) => {
     const { email } = req.query;
     
     // Update user preferences
     await db.update(users)
       .set({ marketingEmails: false })
       .where(eq(users.email, email));
     
     res.send('You have been unsubscribed successfully.');
   });
   ```

## Step 4: Testing Instructions

1. **Test Email Delivery**
   - [ ] Send test emails to yourself
   - [ ] Check different email clients (Gmail, Outlook, etc.)
   - [ ] Verify emails don't go to spam

2. **Test Email Content**
   - [ ] All links work correctly
   - [ ] Unsubscribe link functions
   - [ ] Email looks good on mobile

3. **Test User Preferences**
   - [ ] Users can update email preferences
   - [ ] Preferences are respected when sending emails
   - [ ] Unsubscribe works properly

## Step 5: Next Steps

After successful implementation:
- [ ] Set up email analytics in SendGrid
- [ ] Create email templates for different scenarios
- [ ] Add email scheduling functionality
- [ ] Set up automated email sequences

## Common Questions

**Q: How do I avoid emails going to spam?**
A: Use verified sender domains, avoid spam keywords, maintain good sender reputation, and include unsubscribe links.

**Q: Can I send bulk emails?**
A: Yes, but be mindful of SendGrid's rate limits and best practices for bulk sending.

**Q: How do I track email opens and clicks?**
A: SendGrid provides built-in analytics for tracking opens, clicks, and other engagement metrics.

**Q: Can I use email templates with dynamic content?**
A: Yes, use template variables like `{{firstName}}` and replace them before sending.

## Remember

- Always include unsubscribe links in marketing emails
- Respect user email preferences
- Monitor email deliverability and engagement
- Test emails thoroughly before sending to large lists
- Follow email marketing best practices and regulations (CAN-SPAM, GDPR)