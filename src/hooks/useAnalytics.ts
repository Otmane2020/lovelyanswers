"use client";
/**
 * useAnalytics — lightweight wrapper around GA4 (gtag) + Microsoft Clarity.
 *
 * Usage:
 *   const { track } = useAnalytics();
 *   track("article_generated", { platform: "chatgpt", word_count: 1800 });
 *
 * All events are forwarded to:
 *   - GA4 (window.gtag)  — already loaded via index.html
 *   - Microsoft Clarity  — set as custom tag so you can filter sessions by event
 */


type EventParams = Record<string, string | number | boolean | undefined>;

// ---- Predefined event names (extend as needed) ----
export type AnalyticsEvent =
  | "article_generated"
  | "article_published"
  | "article_queued_for_review"
  | "cms_connected"
  | "cms_publish_success"
  | "cms_publish_error"
  | "ai_visibility_check"
  | "signup_started"
  | "signup_completed"
  | "checkout_started"
  | "subscription_activated"
  | "aeo_answer_generated"
  | "keyword_added"
  | "blog_post_viewed"
  | "tool_visibility_checker_used";

function sendGa4(event: string, params: EventParams) {
  if (typeof (window as any).gtag === "function") {
    (window as any).gtag("event", event, params);
  }
}

function sendClarity(event: string, params: EventParams) {
  if (typeof (window as any).clarity === "function") {
    // Clarity custom tags: key=event name, value=stringified main param
    (window as any).clarity("set", event, JSON.stringify(params));
  }
}

export function useAnalytics() {
  const track = (event: AnalyticsEvent, params: EventParams = {}) => {
    sendGa4(event, params);
    sendClarity(event, params);
  };

  /**
   * Track a conversion (e.g. signup, purchase).
   * Sends to GA4 as a standard conversion event.
   */
  const trackConversion = (label: string, value?: number) => {
    sendGa4("conversion", { send_to: "AW-1880571409", event_label: label, value });
    sendClarity("conversion", { label, value });
  };

  return { track, trackConversion };
}
