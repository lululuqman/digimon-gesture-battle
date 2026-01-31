import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

export const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

export const createCheckoutSession = async (paymentLink: string) => {
  if (!paymentLink) {
    console.error('Payment Link is missing');
    alert('Payment Link is missing. Please create a Payment Link in Stripe Dashboard and add VITE_STRIPE_PAYMENT_LINK to your .env file.');
    return;
  }

  console.log('Redirecting to Payment Link:', paymentLink);
  window.location.href = paymentLink;
};
