/**
 * Meta Pixel Conversion Tracking — AutoPilotGeo
 * Pixel ID : 1449812883223006
 *
 * Events fired:
 *  - PageView       → index.html (base code, automatic)
 *  - ViewContent    → Pricing page
 *  - InitiateCheckout → Checkout start
 *  - Lead           → Signup success
 *  - Subscribe      → ThankYou (payment confirmed)
 *  - Purchase       → ThankYou (payment confirmed)
 */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    window.fbq(...args);
  }
}

/** Pricing page viewed — ViewContent */
export function trackMetaPricingView() {
  fbq("track", "ViewContent", {
    content_name: "Pricing Page",
    content_category: "SaaS Pricing",
    value: 29.0,
    currency: "EUR",
  });
  console.log("[META] ViewContent: Pricing");
}

/** CTA / checkout button clicked — InitiateCheckout */
export function trackMetaInitiateCheckout(value = 29, plan = "Starter") {
  fbq("track", "InitiateCheckout", {
    value,
    currency: "EUR",
    content_name: `AutoPilotGeo ${plan}`,
    num_items: 1,
  });
  console.log("[META] InitiateCheckout:", { value, plan });
}

/** Account created — Lead */
export function trackMetaLead(email?: string) {
  fbq("track", "Lead", {
    value: 29.0,
    currency: "EUR",
    content_name: "AutoPilotGeo Sign Up",
  });
  console.log("[META] Lead fired", email ? `(${email})` : "");
}

/** Payment confirmed — Subscribe + Purchase */
export function trackMetaPurchase(value: number, transactionId?: string) {
  fbq("track", "Subscribe", {
    value,
    currency: "EUR",
    predicted_ltv: value * 12,
    content_name: "AutoPilotGeo Monthly",
  });
  fbq("track", "Purchase", {
    value,
    currency: "EUR",
    content_name: "AutoPilotGeo Subscription",
    content_type: "product",
    transaction_id: transactionId,
  });
  console.log("[META] Subscribe + Purchase fired:", { value, transactionId });
}
