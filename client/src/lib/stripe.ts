
import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

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
