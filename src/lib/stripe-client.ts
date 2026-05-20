import { loadStripe, type Stripe } from "@stripe/stripe-js";

// Publishable key — safe to expose client-side.
const STRIPE_PUBLISHABLE_KEY =
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
  "pk_live_51OkmX3Efti9t9nN9Mlecdj4IgnmMGkECjdGaN85Qg6QJ1KoVOF3KQmX7Cj9aOQiTnolZG7MhJ2qSLS85QqEwJOpM00UBMNxh2H";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
}
