/**
 * Google Ads Conversion Tracking for LovelyAnswers
 * 
 * Conversion Plan:
 * 1. SIGN_UP - User creates an account (Lead)
 * 2. ONBOARDING_COMPLETE - User finishes wizard setup (Qualified Lead)
 * 3. CHECKOUT_START - User initiates Stripe checkout (Add to Cart)
 * 4. PURCHASE - User completes subscription (Purchase - tracked via enhanced conversions)
 * 5. PAGE_VIEW_PRICING - User views pricing page (Key Page View)
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const ADS_ID = "AW-1880571409";

// Conversion labels from Google Ads account AW-1880571409
export const CONVERSION_EVENTS = {
  SIGN_UP: "AW-1880571409/7502250437",
  ONBOARDING_COMPLETE: "AW-1880571409/7502250230",
  CHECKOUT_START: "AW-1880571409/7502248279",
  PURCHASE: "AW-1880571409/7502219935",
  PAGE_VIEW_PRICING: "AW-1880571409/7502248288",
} as const;

function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

/** Fire when a user successfully signs up */
export function trackSignUp(email?: string) {
  gtag("event", "conversion", {
    send_to: CONVERSION_EVENTS.SIGN_UP,
    value: 5.0,
    currency: "USD",
  });
  // Also send GA4 event
  gtag("event", "sign_up", {
    method: "email",
  });
  console.log("[GTAG] Conversion: sign_up");
}

/** Fire when a user completes the onboarding wizard */
export function trackOnboardingComplete(websiteUrl?: string) {
  gtag("event", "conversion", {
    send_to: CONVERSION_EVENTS.ONBOARDING_COMPLETE,
    value: 10.0,
    currency: "USD",
  });
  gtag("event", "tutorial_complete", {
    website_url: websiteUrl,
  });
  console.log("[GTAG] Conversion: onboarding_complete");
}

/** Fire when a user clicks checkout */
export function trackCheckoutStart(plan: string, value: number) {
  gtag("event", "conversion", {
    send_to: CONVERSION_EVENTS.CHECKOUT_START,
    value,
    currency: "USD",
  });
  gtag("event", "begin_checkout", {
    value,
    currency: "USD",
    items: [{ item_name: `LovelyAnswers ${plan}`, price: value }],
  });
  console.log("[GTAG] Conversion: checkout_start", { plan, value });
}

/** Fire when a user completes a purchase (call from success page or webhook callback) */
export function trackPurchase(value: number, transactionId?: string) {
  gtag("event", "conversion", {
    send_to: CONVERSION_EVENTS.PURCHASE,
    value,
    currency: "USD",
    transaction_id: transactionId,
  });
  gtag("event", "purchase", {
    value,
    currency: "USD",
    transaction_id: transactionId,
    items: [{ item_name: "LovelyAnswers Subscription", price: value }],
  });
  console.log("[GTAG] Conversion: purchase", { value, transactionId });
}

/** Fire when a user views the pricing page */
export function trackPricingView() {
  gtag("event", "conversion", {
    send_to: CONVERSION_EVENTS.PAGE_VIEW_PRICING,
    value: 1.0,
    currency: "USD",
  });
  gtag("event", "view_item_list", {
    item_list_name: "Pricing Plans",
  });
  console.log("[GTAG] Conversion: pricing_view");
}
