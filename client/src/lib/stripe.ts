import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface PaymentMethodResponse {
  paymentMethods: Array<{
    id: string;
    card: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  }>;
}

export async function handlePayment(amount: number) {
  const stripe = await stripePromise;
  if (!stripe) throw new Error("Stripe failed to initialize");

  const response = await fetch("/api/create-payment-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount }),
  });

  const { clientSecret } = await response.json();
  return stripe.confirmCardPayment(clientSecret);
}

export async function fetchPaymentMethods(userId: string): Promise<PaymentMethodResponse> {
  const response = await fetch(`/api/payment-methods?userId=${userId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch payment methods');
  }
  return response.json();
}

export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete payment method');
  }
}

export async function setupPaymentMethod(stripe: Stripe, elements: any): Promise<string> {
  const { error, setupIntent } = await stripe.confirmSetup({
    elements,
    redirect: 'if_required',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!setupIntent?.payment_method) {
    throw new Error('No payment method was created');
  }

  return setupIntent.payment_method;
}