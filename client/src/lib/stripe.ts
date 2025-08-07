import { loadStripe, Stripe } from '@stripe/stripe-js';
import { apiPost, apiJson } from './queryClient';

// Initialize Stripe.js
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Get Stripe instance
export const getStripe = async (): Promise<Stripe | null> => {
  return await stripePromise;
};

// Enhanced checkout session creation with better typing and options
export async function createCheckoutSession(params: {
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  automaticTax?: boolean;
  collectPhoneNumber?: boolean;
} = {}) {
  const response = await apiPost('/api/create-checkout-session', params);
  return apiJson(response);
}

// Enhanced redirect to checkout with better error handling
export async function redirectToCheckout(params: {
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  automaticTax?: boolean;
  collectPhoneNumber?: boolean;
} = {}) {
  try {
    const session = await createCheckoutSession(params) as { url: string };
    window.location.href = session.url;
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}

// Create Payment Intent for custom payment flows
export async function createPaymentIntent(params: {
  amount: number;
  currency: string;
  paymentMethodTypes?: string[];
  automaticPaymentMethods?: boolean;
  metadata?: Record<string, string>;
}) {
  const response = await apiPost('/api/create-payment-intent', params);
  return apiJson(response);
}

// Confirm payment intent with payment method
export async function confirmPayment(
  stripe: Stripe,
  clientSecret: string,
  paymentMethod: any,
  returnUrl?: string
) {
  const result = await stripe.confirmPayment({
    clientSecret,
    confirmParams: {
      payment_method: paymentMethod,
      return_url: returnUrl || window.location.origin + '/dashboard?payment=success',
    },
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if ('paymentIntent' in result) {
    return result.paymentIntent;
  }
  throw new Error('Payment confirmation failed');
}

// Create billing portal session
export async function createPortalSession() {
  const response = await apiPost('/api/create-portal-session', {});
  return apiJson(response);
}

// Redirect to billing portal
export async function redirectToPortal() {
  try {
    const session = await createPortalSession() as { url: string };
    window.location.href = session.url;
  } catch (error) {
    console.error('Error redirecting to portal:', error);
    throw error;
  }
}

// Format currency for display
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100); // Convert cents to dollars
}

// Stripe error handling helper
export function handleStripeError(error: any): string {
  if (error?.type === 'card_error') {
    return error.message || 'Your card was declined.';
  } else if (error?.type === 'validation_error') {
    return error.message || 'Invalid payment information.';
  } else if (error?.type === 'api_error') {
    return 'Something went wrong with our payment system. Please try again.';
  } else {
    return error.message || 'An unexpected error occurred.';
  }
}