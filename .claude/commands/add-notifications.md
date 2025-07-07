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
   - Study the existing schema in `shared/schema.ts` for patterns
   - Add email preferences table following existing naming conventions
   - Include categories for different notification types (payment, account, system, feature)
   - Add frequency settings (instant, daily, weekly, never)
   - Create notification log table for tracking sent emails
   - Use the existing timestamp and foreign key patterns
   - Run `npm run db:push` after schema changes

2. **Create Email Notification Service**
   - Create a service in `server/services/` following existing patterns
   - Study the existing SendGrid setup in `server/lib/sendgrid.ts`
   - Use the existing database connection patterns from `server/db.ts`
   - Follow the Drizzle ORM query patterns from `server/storage/` files
   - Implement preference checking before sending emails
   - Create reusable email template generation
   - Add logging for sent/failed emails
   - Include proper error handling following existing patterns
   - Implement HTML email templates with action buttons
   - Add unsubscribe links in email footers
   ```

3. **Create Email Notification API Routes**
   - Create routes in `server/routes/` following existing file patterns
   - Study `server/routes/userRoutes.ts` for authentication middleware usage
   - Use the existing `requiresAuth` middleware pattern
   - Follow the existing error handling and response patterns
   - Implement GET route for fetching user preferences
   - Create PUT route for updating preferences
   - Add test email route for users to verify settings
   - Register routes in `server/routes/index.ts` following existing patterns
   ```

4. **Create Email Notification Templates**
   - Create a templates directory in `server/templates/`
   - Define reusable email templates for different scenarios
   - Implement template variable replacement system
   - Create templates for: welcome, payment success, file upload, weekly digest
   - Use inline CSS for better email client compatibility
   - Include proper template validation and error handling
   - Make templates customizable with placeholder variables
   ```

### Option B: Email Notification Preferences

If user wants granular email notification controls:

1. **Create Email Notification Preferences Component**
   - Look at existing preference pages (e.g., `client/src/pages/settings.tsx`) for structure
   - Use existing UI components from `client/src/components/ui/`
   - Follow the existing form patterns and state management
   - Create categories for different notification types
   - Implement frequency controls (instant, daily, weekly, never)
   - Add test email functionality for each category
   - Include bulk operations (disable all)
   - Follow existing loading and error state patterns
   - Use the existing fetch patterns for API calls
   - Apply consistent styling with Tailwind classes
   ```

### Option C: Email Notification Helpers

If user wants helper functions for common email scenarios:

1. **Create Email Notification Helpers**
   - Create utility functions in `server/utils/` following existing patterns
   - Build helper functions for common notification scenarios
   - Integrate with the email template system
   - Create functions for: welcome emails, payment success, file uploads, weekly digests
   - Include custom notification helper for flexible use cases
   - Use environment variables for action URLs
   - Implement proper template variable replacement
   - Follow existing error handling patterns
   ```

2. **Create Scheduled Email Service**
   - Create a scheduled service using node-cron for timed emails
   - Set up weekly digest emails for users who opted in
   - Implement monthly report functionality
   - Query users with specific frequency preferences
   - Calculate user activity statistics for digest content
   - Follow existing database query patterns
   - Add proper error handling and logging
   - Initialize the service in the main server file
   ```

## Step 3: Common Email Notification Triggers

**Integration with Existing Flows:**
- Study existing webhook handlers in `server/routes/webhookRoutes.ts` for payment success triggers
- Add email notifications to existing file upload completion in `server/routes/fileRoutes.ts`
- Integrate welcome emails with existing user registration flow
- Add notifications to existing subscription change handlers
- Look at existing route patterns for proper trigger placement
- Follow existing async/await patterns when adding notification calls
- Ensure notifications don't block critical user flows
- Add proper error handling so failed emails don't break main functionality
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