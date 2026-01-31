import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

export const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

export const createCheckoutSession = async (priceId: string) => {
  const stripe = await stripePromise;
  
  if (!stripe) {
    console.error('Stripe has not loaded yet');
    return;
  }

  console.log('Redirecting to checkout for Price ID:', priceId);
  
  // In a production app, you would call your backend (Supabase Edge Function) here:
  /*
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId }
  });
  await stripe.redirectToCheckout({ sessionId: data.id });
  */
  
  alert(`In a production app, this would redirect you to Stripe Checkout for the $1 charge.\n\nPrice ID used: ${priceId}\n\nYou need a backend (like Supabase Edge Functions) to create a real Session ID.`);
};
