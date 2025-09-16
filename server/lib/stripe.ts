import Stripe from 'stripe';

let client: Stripe | null = null;
let configuredKey: string | null = null;
let warnedMissingKey = false;

export function getStripeClient(): Stripe | null {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    client = null;
    configuredKey = null;
    if (!warnedMissingKey) {
      console.warn('[Stripe] STRIPE_SECRET_KEY not configured; skipping Stripe operation.');
      warnedMissingKey = true;
    }
    return null;
  }

  if (!client || configuredKey !== apiKey) {
    client = new Stripe(apiKey);
    configuredKey = apiKey;
    warnedMissingKey = false;
  }

  return client;
}
