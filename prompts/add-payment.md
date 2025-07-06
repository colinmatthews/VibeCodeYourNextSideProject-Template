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

2. **Create Purchase Button Component**
   ```tsx
   // client/src/components/PurchaseButton.tsx
   export function PurchaseButton({ priceId, productName, amount }) {
     const handlePurchase = async () => {
       const response = await fetch('/api/create-one-time-session', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           priceId,
           successUrl: `${window.location.origin}/purchase-success`,
           cancelUrl: `${window.location.origin}/pricing`,
         }),
       });
       
       const { sessionId } = await response.json();
       const stripe = await getStripe();
       await stripe.redirectToCheckout({ sessionId });
     };
     
     return (
       <button onClick={handlePurchase}>
         Buy {productName} - ${amount}
       </button>
     );
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
   Add monthly billing logic to charge accumulated usage

## Step 3: Testing Instructions

1. **Test in Stripe Dashboard**
   - Use test card: 4242 4242 4242 4242
   - Check that webhooks are received
   - Verify customer is created

2. **Test User Experience**
   - [ ] Payment flow works smoothly
   - [ ] User gets access to paid features
   - [ ] Billing portal works for management
   - [ ] Email confirmations are sent

3. **Test Edge Cases**
   - [ ] Payment failures are handled gracefully
   - [ ] Subscription cancellations work
   - [ ] User permissions are updated correctly

## Step 4: Next Steps

After successful implementation, suggest:
- [ ] Add payment analytics to track revenue
- [ ] Set up email notifications for failed payments
- [ ] Create admin dashboard to view payments
- [ ] Add invoicing features if needed

## Common Questions

**Q: Can I offer discounts or coupons?**
A: Yes! Create coupon codes in Stripe Dashboard and pass them to the checkout session.

**Q: How do I handle refunds?**
A: Use Stripe Dashboard or create refund functionality using Stripe's refund API.

**Q: Can I accept international payments?**
A: Yes, Stripe supports 100+ currencies. Just specify the currency in your price creation.

**Q: How do I handle taxes?**
A: Stripe Tax can automatically calculate and collect taxes based on customer location.

## Remember

- Always test with Stripe's test mode first
- Keep the existing Pro plan working while adding new features
- Use the existing webhook system for subscription updates
- Follow the existing patterns in the codebase
- Store minimal payment data (let Stripe handle the rest)