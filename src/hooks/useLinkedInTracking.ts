// LinkedIn Insight Tag Tracking Hook
// Partner ID: 8548802

declare global {
  interface Window {
    lintrk?: (action: string, data: { conversion_id: number }) => void;
  }
}

// LinkedIn conversion IDs - update these with your actual conversion IDs from LinkedIn Campaign Manager
const CONVERSION_IDS = {
  SIGN_UP: 19812466,    // Replace with your actual Sign Up conversion ID
  PURCHASE: 19812482,   // Replace with your actual Purchase conversion ID
};

export const trackLinkedInSignUp = () => {
  if (typeof window !== "undefined" && window.lintrk) {
    console.log("[LinkedIn] Tracking Sign Up conversion");
    window.lintrk("track", { conversion_id: CONVERSION_IDS.SIGN_UP });
  }
};

export const trackLinkedInPurchase = () => {
  if (typeof window !== "undefined" && window.lintrk) {
    console.log("[LinkedIn] Tracking Purchase conversion");
    window.lintrk("track", { conversion_id: CONVERSION_IDS.PURCHASE });
  }
};

export const useLinkedInTracking = () => {
  return {
    trackSignUp: trackLinkedInSignUp,
    trackPurchase: trackLinkedInPurchase,
  };
};
