# VibeCode Template - Stripe Checkout Integration

This template now uses **Stripe Checkout** for a simplified payment flow instead of manual payment method management.

## Stripe Integration

### Environment Variables Required

Make sure to set these environment variables:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...           # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook endpoint secret from Stripe Dashboard
STRIPE_PRICE_ID_PRO=price_...           # Price ID for your Pro subscription

# Client-side
VITE_STRIPE_PUBLIC_KEY=pk_test_...      # Your Stripe publishable key
```

### How It Works

1. **Simple Upgrade Flow**: Users click "Upgrade to Pro" → Redirected to Stripe Checkout
2. **Automatic Fulfillment**: Webhooks handle subscription activation automatically
3. **Success Handling**: Users return to dashboard with success confirmation
4. **Subscription Management**: Users can manage subscriptions through Stripe's billing portal

### API Endpoints

- `POST /api/create-checkout-session` - Creates a new Stripe Checkout session
- `POST /api/create-portal-session` - Creates a Stripe billing portal session
- `POST /api/webhook` - Handles Stripe webhook events

### Webhook Events Handled

- `checkout.session.completed` - Activates subscription after successful payment
- `customer.subscription.updated` - Handles subscription status changes
- `customer.subscription.deleted` - Downgrades user to free plan
- `invoice.payment_succeeded` - Renews subscription
- `invoice.payment_failed` - Logs failed payments

### Testing

1. Use Stripe's test mode with test cards
2. Use Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3000/api/webhook`
3. Test successful payments with card `4242 4242 4242 4242`
4. Test failed payments with card `4000 0000 0000 0002`

### Benefits of Stripe Checkout

✅ **Simplified Code**: Removed 400+ lines of payment method management  
✅ **Better UX**: Professional checkout experience  
✅ **Mobile Optimized**: Works perfectly on all devices  
✅ **Security**: No sensitive payment data in frontend  
✅ **International**: Built-in support for multiple payment methods  
✅ **Promotion Codes**: Built-in support for discount codes  
✅ **Tax Calculation**: Automatic tax calculation

---

## Development

```bash
npm install
npm run dev
```

## Deployment

Make sure to:
1. Set production Stripe keys
2. Configure webhook endpoint in Stripe Dashboard
3. Set `STRIPE_WEBHOOK_SECRET` from webhook settings 
4. Configure Stripe billing portal at Settings > Billing > Customer portal in Stripe Dashboard 