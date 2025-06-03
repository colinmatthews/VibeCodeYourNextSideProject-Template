// Utility function to create a checkout session
export async function createCheckoutSession(params: {
  firebaseId: string;
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
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

// Utility function to redirect to checkout
export async function redirectToCheckout(params: {
  firebaseId: string;
  mode?: 'subscription' | 'payment';
  priceId?: string;
  successUrl?: string;
  cancelUrl?: string;
}) {
  try {
    const { url } = await createCheckoutSession(params);
    window.location.href = url;
  } catch (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
}