import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Publishable key — safe to expose client-side.
// Replace with your live key (pk_live_...) before going to production.
const STRIPE_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
  "pk_test_REPLACE_ME";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
