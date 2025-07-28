import { loadStripe, Stripe } from '@stripe/stripe-js';

// Initialize Stripe.js
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Get Stripe instance
export const getStripe = async (): Promise<Stripe | null> => {
  return await stripePromise;
};

// Enhanced checkout session creation with better typing and options
export async function createCheckoutSession(params: {
  firebaseId: string;
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  automaticTax?: boolean;
  collectPhoneNumber?: boolean;
}) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create checkout session');
  }

  return response.json();
}

// Enhanced redirect to checkout with better error handling
export async function redirectToCheckout(params: {
  firebaseId: string;
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
  allowPromotionCodes?: boolean;
  billingAddressCollection?: 'auto' | 'required';
  automaticTax?: boolean;
  collectPhoneNumber?: boolean;
}) {
  try {
    const { url } = await createCheckoutSession(params);
    window.location.href = url;
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
  const response = await fetch('/api/create-payment-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create payment intent');
  }

  return response.json();
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

  return result.paymentIntent;
}

// Create billing portal session
export async function createPortalSession(firebaseId: string) {
  const response = await fetch('/api/create-portal-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firebaseId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to create portal session');
  }

  return response.json();
}

// Redirect to billing portal
export async function redirectToPortal(firebaseId: string) {
  try {
    const { url } = await createPortalSession(firebaseId);
    window.location.href = url;
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