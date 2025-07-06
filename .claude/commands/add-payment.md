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
   - Create new Price ID in Stripe
   - Note the price ID (starts with `price_`)

2. **Update Environment Variables**
   ```env
   STRIPE_PRICE_ID_PREMIUM="price_your_new_price_id"
   ```

3. **Update Database Schema** (if needed)
   Add new subscription type to `shared/schema.ts`:
   ```typescript
   subscriptionType: text("subscription_type").$type<"free" | "pro" | "premium">().default("free"),
   ```

4. **Update Pricing Page**
   Add new pricing tier to `client/src/pages/pricing.tsx`

5. **Update Checkout Logic**
   Modify `server/routes/paymentRoutes.ts` to handle new tier

### Option B: One-Time Purchase

If user wants one-time payments:

1. **Create One-Time Payment Route**
   ```typescript
   // Add to server/routes/paymentRoutes.ts
   router.post('/create-one-time-session', async (req, res) => {
     const { priceId, successUrl, cancelUrl } = req.body;
     
     const session = await stripe.checkout.sessions.create({
       payment_method_types: ['card'],
       line_items: [{
         price: priceId,
         quantity: 1,
       }],
       mode: 'payment', // One-time payment
       success_url: successUrl,
       cancel_url: cancelUrl,
       customer_email: req.user.email,
     });
     
     res.json({ sessionId: session.id });
   });
   ```

2. **Update Webhook Handler**
   Add one-time payment handling to `server/routes/paymentRoutes.ts`:
   ```typescript
   // Add to existing webhook handler
   if (event.type === 'payment_intent.succeeded') {
     const paymentIntent = event.data.object;
     const customerId = paymentIntent.customer;
     
     // Find user by Stripe customer ID
     const user = await db.select().from(users).where(eq(users.stripeCustomerId, customerId));
     
     if (user.length > 0) {
       // Grant access to purchased product/service
       await db.update(users)
         .set({ 
           // Update relevant fields based on what was purchased
           // For example, if it's a feature unlock:
           // hasFeatureX: true,
           // purchasedAt: new Date()
         })
         .where(eq(users.firebaseId, user[0].firebaseId));
     }
   }
   ```

### Option C: Usage-Based Pricing

If user wants pay-per-use:

1. **Track Usage in Database**
   Add usage tracking table to `shared/schema.ts`:
   ```typescript
   export const usage = pgTable('usage', {
     id: serial('id').primaryKey(),
     userId: text('user_id').references(() => users.firebaseId),
     action: text('action'), // e.g., 'api_call', 'generation'
     cost: integer('cost'), // in cents
     createdAt: timestamp('created_at').defaultNow(),
   });
   ```

2. **Create Usage Tracking Function**
   ```typescript
   // server/storage/usage.ts
   export async function trackUsage(userId: string, action: string, cost: number) {
     await db.insert(usage).values({
       userId,
       action,
       cost,
       createdAt: new Date(),
     });
   }
   ```

3. **Create Billing Route**
   Add monthly billing logic to charge accumulated usage:
   ```typescript
   // server/routes/paymentRoutes.ts
   router.post('/create-usage-invoice', async (req, res) => {
     try {
       const userId = req.user.firebaseId;
       const user = await db.select().from(users).where(eq(users.firebaseId, userId));
       
       if (!user[0]?.stripeCustomerId) {
         return res.status(400).json({ error: 'No Stripe customer found' });
       }
       
       // Get usage for billing period
       const usageRecords = await db.select().from(usage)
         .where(eq(usage.userId, userId))
         // Add date filter for billing period
         
       const totalCost = usageRecords.reduce((sum, record) => sum + record.cost, 0);
       
       if (totalCost > 0) {
         // Create invoice item
         await stripe.invoiceItems.create({
           customer: user[0].stripeCustomerId,
           amount: totalCost,
           currency: 'usd',
           description: 'Usage charges',
         });
         
         // Create and send invoice
         const invoice = await stripe.invoices.create({
           customer: user[0].stripeCustomerId,
           auto_advance: true,
         });
         
         await stripe.invoices.finalizeInvoice(invoice.id);
         
         res.json({ invoiceId: invoice.id, amount: totalCost });
       } else {
         res.json({ message: 'No usage to bill' });
       }
     } catch (error) {
       console.error('Billing error:', error);
       res.status(500).json({ error: 'Failed to create invoice' });
     }
   });
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
   ```typescript
   // Add to existing webhook handler in server/routes/paymentRoutes.ts
   
   // Handle additional events based on your payment type
   switch (event.type) {
     case 'payment_intent.succeeded':
       // Handle one-time payments
       await handleOneTimePayment(event.data.object);
       break;
       
     case 'invoice.created':
       // Handle usage-based billing
       await handleUsageInvoice(event.data.object);
       break;
       
     case 'customer.subscription.trial_will_end':
       // Send trial ending notification
       await handleTrialEnding(event.data.object);
       break;
       
     case 'payment_method.attached':
       // Handle new payment method
       await handleNewPaymentMethod(event.data.object);
       break;
   }
   ```

2. **Create Event Handlers**
   ```typescript
   // Add these functions to server/routes/paymentRoutes.ts
   
   async function handleOneTimePayment(paymentIntent: any) {
     try {
       const customerId = paymentIntent.customer;
       const user = await db.select().from(users)
         .where(eq(users.stripeCustomerId, customerId));
       
       if (user.length > 0) {
         // Update user with purchased features
         await db.update(users)
           .set({ 
             // Add purchased features based on payment metadata
             isPremium: true,
             purchasedAt: new Date()
           })
           .where(eq(users.firebaseId, user[0].firebaseId));
       }
     } catch (error) {
       console.error('Error handling one-time payment:', error);
     }
   }
   
   async function handleUsageInvoice(invoice: any) {
     try {
       const customerId = invoice.customer;
       const user = await db.select().from(users)
         .where(eq(users.stripeCustomerId, customerId));
       
       if (user.length > 0) {
         // Mark usage as billed
         await db.update(usage)
           .set({ billed: true })
           .where(eq(usage.userId, user[0].firebaseId));
       }
     } catch (error) {
       console.error('Error handling usage invoice:', error);
     }
   }
   ```

3. **Configure Webhook Endpoint in Stripe**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhook`
   - Select events you want to listen to
   - Copy webhook secret to environment variables

4. **Test Webhook Locally**
   ```bash
   # Install Stripe CLI
   stripe listen --forward-to localhost:5000/api/webhook
   
   # Test webhook events
   stripe trigger checkout.session.completed
   stripe trigger payment_intent.succeeded
   ```

## Step 4: Testing Instructions

1. **Test Webhook Integration**
   - [ ] Webhook endpoint receives events
   - [ ] Events are properly verified (signature check)
   - [ ] Database updates correctly on events
   - [ ] Error handling works for failed webhooks

2. **Test Payment Flows**
   - [ ] Use test card: 4242 4242 4242 4242
   - [ ] Check webhook delivery in Stripe Dashboard
   - [ ] Verify customer is created/updated
   - [ ] Confirm user permissions are updated

3. **Test User Experience**
   - [ ] Payment flow works smoothly
   - [ ] User gets access to paid features immediately
   - [ ] Billing portal works for management
   - [ ] Email confirmations are sent

4. **Test Edge Cases**
   - [ ] Payment failures are handled gracefully
   - [ ] Subscription cancellations work
   - [ ] User permissions are updated correctly
   - [ ] Failed webhook retries work

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