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
  - c) Payment/subscription confirmations
  - d) Custom transactional emails

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
   - Create a new email template file following the existing project structure
   - Define subject line and HTML/text content with placeholder variables
   - Use template variables like `{{firstName}}` for personalization
   - Style emails using inline CSS for better email client compatibility

2. **Create Email Service**
   - Examine `server/lib/sendgrid.ts` for the existing SendGrid setup pattern
   - Create a service that uses the existing SendGrid configuration
   - Follow the error handling patterns found in other server services
   - Look at `server/storage/` files for examples of service layer patterns
   - Implement proper logging using the existing console.log patterns

3. **Add to User Registration**
   - Study `server/routes/userRoutes.ts` to understand the existing user creation flow
   - Add email sending after successful user creation in the database
   - Follow the existing async/await and error handling patterns
   - Ensure email sending doesn't block the user registration response

### Option B: Notification Emails

If user wants notification emails:

1. **Create Notification Service**
   - Build a flexible notification service that can handle different email types
   - Reference the existing SendGrid setup in `server/lib/sendgrid.ts`
   - Create reusable HTML email templates with action buttons
   - Follow the async/await patterns used throughout the server code
   - Implement proper error logging following existing patterns

2. **Add Email Preferences to User Schema**
   - Study the existing user schema in `shared/schema.ts`
   - Add boolean fields for different email preference categories
   - Follow the existing column naming conventions (snake_case)
   - Run `npm run db:push` after schema changes

3. **Create Email Preferences Page**
   - Look at existing pages in `client/src/pages/` for component structure
   - Use existing UI components from `client/src/components/ui/`
   - Follow the existing form patterns (see `UserProfileForm.tsx` for reference)
   - Use the existing fetch patterns for API calls
   - Apply consistent styling using Tailwind classes as seen in other components


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
   - Create an unsubscribe route following patterns in `server/routes/`
   - Use the existing database update patterns from `server/storage/UserStorage.ts`
   - Implement proper query parameter validation
   - Return appropriate success messages following existing API response patterns
   - Consider adding a simple unsubscribe confirmation page

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