# /add-payment - Add Payment Features

You are a helpful assistant that guides users through adding payment features to their VibeCode Template app. This template already has Stripe integration set up - you'll be extending it based on the user's specific needs.

## What This Command Does

Helps users add new payment features by leveraging the existing Stripe integration. The template already includes:
- Stripe Checkout sessions
- Webhook handling for subscription events
- Pro/Free user tiers in the database
- Billing portal access

## Step 1: Understanding User Needs

Ask these focused questions to minimize scope:

**Payment Type:**
- [ ] What do you want to charge for?
  - a) Monthly/yearly subscription (like the existing Pro plan)
  - b) One-time purchase for a product/service
  - c) Usage-based pricing (pay per use)
  - d) Multiple pricing tiers

**Pricing Details:**
- [ ] What's your pricing?
  - Amount (e.g., $9.99, $99, $0.50 per use)
  - Currency (USD, EUR, etc.)
  - Billing frequency (if subscription)

**Product/Service:**
- [ ] What are you selling?
  - Brief description (e.g., "Pro features", "Premium content", "API calls")
  - What benefits/features does payment unlock?

## Step 2: Implementation Based on User Answers

### Option A: New Subscription Tier

If user wants to add another subscription tier:

1. **Update Stripe Dashboard**
   - Create new Price ID in Stripe Dashboard
   - Note the price ID (starts with `price_`)
   - Configure recurring billing settings

2. **Update Environment Variables**
   - Add new price ID to your `.env` file following existing patterns
   - Use the same naming convention as existing Stripe variables

3. **Update Database Schema** (if needed)
   - Study the existing user schema in `shared/schema.ts`
   - Add new subscription types following the existing enum pattern
   - Run `npm run db:push` after schema changes

4. **Update Pricing Page**
   - Examine `client/src/pages/pricing.tsx` for existing tier structure
   - Add new tier following the existing component patterns
   - Use existing UI components and styling patterns

5. **Update Checkout Logic**
   - Study `server/routes/paymentRoutes.ts` for existing checkout session creation
   - Add handling for new tier following existing patterns
   - Maintain the existing webhook integration

### Option B: One-Time Purchase

If user wants one-time payments:

1. **Create One-Time Payment Route**
   - Add new route to `server/routes/paymentRoutes.ts` following existing patterns
   - Use existing Stripe initialization and error handling patterns
   - Set mode to 'payment' instead of 'subscription'
   - Follow existing request validation and response patterns
   - Use existing authentication middleware patterns

2. **Update Webhook Handler**
   - Study the existing webhook handler in `server/routes/paymentRoutes.ts`
   - Add handling for `payment_intent.succeeded` event
   - Follow existing database query patterns with Drizzle ORM
   - Use existing user update patterns from `server/storage/UserStorage.ts`
   - Implement proper error handling following existing webhook patterns
   - Update user fields based on purchased product/service
   ```

### Option C: Usage-Based Pricing

If user wants pay-per-use:

1. **Track Usage in Database**
   - Add usage table to `shared/schema.ts` following existing table patterns
   - Include userId reference following existing foreign key patterns
   - Track action type, cost in cents, and timestamps
   - Run `npm run db:push` after schema changes

2. **Create Usage Tracking Function**
   - Create usage storage service in `server/storage/` following existing patterns
   - Study `server/storage/UserStorage.ts` for service layer patterns
   - Implement tracking function with proper error handling
   - Use existing database connection and query patterns

3. **Create Billing Route**
   - Add billing route to `server/routes/paymentRoutes.ts`
   - Follow existing authentication and error handling patterns
   - Query usage records using existing Drizzle ORM patterns
   - Use Stripe invoice API following existing Stripe integration patterns
   - Implement proper date filtering for billing periods
   - Follow existing response patterns for success and error cases
   ```

## Step 3: Webhook Integration Setup

### Understanding the Existing Webhook System

The template already handles these webhook events in `server/routes/paymentRoutes.ts`:
- `checkout.session.completed` - When payment succeeds
- `customer.subscription.updated` - When subscription changes
- `customer.subscription.deleted` - When subscription cancels
- `invoice.payment_succeeded` - When renewal payment succeeds
- `invoice.payment_failed` - When payment fails

### Adding New Webhook Events

1. **Extend Webhook Handler**
   - Study the existing webhook handler in `server/routes/paymentRoutes.ts`
   - Add new event types to the existing switch statement
   - Follow the existing event handling structure and patterns
   - Maintain the existing error handling and logging patterns
   - Add handlers for: payment_intent.succeeded, invoice.created, subscription events

2. **Create Event Handlers**
   - Create handler functions following existing patterns in the file
   - Use existing database query patterns with Drizzle ORM
   - Follow existing user lookup and update patterns
   - Implement proper error handling and logging
   - Use existing async/await patterns
   - Update user records following patterns in `server/storage/UserStorage.ts`
   - Mark usage as billed following existing data update patterns
   ```

3. **Configure Webhook Endpoint in Stripe**
   - Set up webhook endpoint in Stripe Dashboard
   - Use the existing webhook URL pattern (`/api/webhook`)
   - Select appropriate events for your payment type
   - Add webhook secret to environment variables following existing patterns

4. **Test Webhook Locally**
   - Use Stripe CLI for local webhook testing
   - Forward webhooks to the existing local webhook endpoint
   - Test with relevant event types for your implementation
   - Verify webhook signature validation is working
   ```

## Step 4: Testing Instructions

1. **Test Webhook Integration**
   - Verify webhook endpoint receives events using existing webhook handler
   - Test signature verification using existing security patterns
   - Check database updates follow existing transaction patterns
   - Ensure error handling matches existing webhook error patterns

2. **Test Payment Flows**
   - Use Stripe test cards with existing checkout flow
   - Monitor webhook delivery in Stripe Dashboard
   - Verify customer creation follows existing patterns
   - Confirm user permission updates work with existing user management

3. **Test User Experience**
   - Test payment flow integration with existing UI components
   - Verify feature access using existing authentication patterns
   - Check billing portal integration with existing user routes
   - Test email notifications using existing email system

4. **Test Edge Cases**
   - Test payment failures with existing error handling
   - Verify cancellation flow with existing subscription management
   - Check permission updates with existing user storage patterns
   - Test webhook retry handling with existing error logging

## Step 5: Next Steps

After successful implementation, suggest:
- [ ] Add payment analytics to track revenue
- [ ] Set up email notifications for failed payments
- [ ] Create admin dashboard to view payments
- [ ] Add invoicing features if needed
- [ ] Implement webhook event logging for debugging
- [ ] Add retry mechanisms for failed webhook processing

## Common Questions

**Q: Can I offer discounts or coupons?**
A: Yes! Create coupon codes in Stripe Dashboard and pass them to the checkout session.

**Q: How do I handle refunds?**
A: Use Stripe Dashboard or create refund functionality using Stripe's refund API.

**Q: Can I accept international payments?**
A: Yes, Stripe supports 100+ currencies. Just specify the currency in your price creation.

**Q: How do I handle taxes?**
A: Stripe Tax can automatically calculate and collect taxes based on customer location.

**Q: What if a webhook fails to process?**
A: Stripe automatically retries failed webhooks. Implement idempotency in your handlers to handle duplicate events safely.

**Q: How do I test webhooks locally?**
A: Use Stripe CLI: `stripe listen --forward-to localhost:5000/api/webhook`

## Webhook Best Practices

1. **Verify Webhook Signatures**
   - Always verify webhook signatures for security
   - Use Stripe's webhook signature verification

2. **Handle Idempotency**
   - Webhooks may be sent multiple times
   - Use event IDs to prevent duplicate processing

3. **Return 200 Status**
   - Always return 200 status for successful processing
   - Return 4xx/5xx for failures to trigger retries

4. **Process Quickly**
   - Keep webhook processing under 20 seconds
   - Use background jobs for complex processing

5. **Log Events**
   - Log all webhook events for debugging
   - Store event data temporarily for troubleshooting

## Remember

- Always test with Stripe's test mode first
- Keep the existing Pro plan working while adding new features
- Use the existing webhook system for subscription updates
- Follow the existing patterns in the codebase
- Store minimal payment data (let Stripe handle the rest)
- Implement proper webhook signature verification
- Handle webhook idempotency to prevent duplicate processing
- Test webhook failure scenarios and retries
