import { useCallback, useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Get or create session ID for onboarding tracking
const getOnboardingSessionId = (): string => {
  let sessionId = sessionStorage.getItem("onboarding_session_id");
  if (!sessionId) {
    sessionId = `onb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem("onboarding_session_id", sessionId);
  }
  return sessionId;
};

// Get visitor ID (same as visitor tracking)
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
};

// Get device type
const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return "mobile";
  }
  return "desktop";
};

// Get UTM params
const getUtmParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
};

interface OnboardingSessionData {
  current_step?: number;
  website_url?: string;
  language?: string;
  email?: string;
  brand_name?: string;
  business_description?: string;
  cms?: string;
  competitors?: string[];
  keywords?: any;
  traffic_potential?: number;
  audiences?: string[];
  completed_at?: string;
  checkout_started_at?: string;
  converted_at?: string;
}

export const useOnboardingSession = () => {
  const sessionId = useRef(getOnboardingSessionId());
  const visitorId = useRef(getVisitorId());
  const isInitialized = useRef(false);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  // Initialize session on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initSession = async () => {
      const utmParams = getUtmParams();
      
      try {
        // Upsert session (insert or update if exists)
        await supabase
          .from("onboarding_sessions")
          .upsert({
            session_id: sessionId.current,
            visitor_id: visitorId.current,
            device_type: getDeviceType(),
            referrer: document.referrer || null,
            ...utmParams,
          }, {
            onConflict: "session_id",
          });
      } catch (error) {
        console.error("[ONBOARDING SESSION] Init error:", error);
      }
    };

    initSession();
  }, []);

  // Update session data
  const updateSession = useCallback(async (data: OnboardingSessionData) => {
    try {
      await supabase
        .from("onboarding_sessions")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId.current);
    } catch (error) {
      console.error("[ONBOARDING SESSION] Update error:", error);
    }
  }, []);

  // Track step change
  const trackStep = useCallback(async (step: number, additionalData?: Partial<OnboardingSessionData>) => {
    await updateSession({
      current_step: step,
      ...additionalData,
    });
  }, [updateSession]);

  // Quick language detection for step 1 with 5s client-side timeout
  const detectLanguage = useCallback(async (url: string): Promise<string | null> => {
    if (!url) return null;
    
    setIsDetectingLanguage(true);
    
    // Create a promise that rejects after 5 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 5000);
    });
    
    try {
      // Race between the actual request and the timeout
      const result = await Promise.race([
        supabase.functions.invoke('firecrawl-scrape-fast', {
          body: { url },
        }),
        timeoutPromise,
      ]);

      const { data: res, error } = result as { data: any; error: any };

      if (error || !res?.success) {
        console.log('[LANG DETECT] Failed or no success:', error?.message || 'unknown');
        setIsDetectingLanguage(false);
        return null;
      }

      const detected = res.data?.language;
      if (detected && typeof detected === 'string') {
        console.log('[LANG DETECT] Detected:', detected);
        setDetectedLanguage(detected);
        setIsDetectingLanguage(false);
        return detected;
      }
    } catch (err) {
      // Silent fail on timeout or other errors - user can choose manually
      console.log('[LANG DETECT] Timeout or error, user will choose manually');
    }
    
    setIsDetectingLanguage(false);
    return null;
  }, []);

  // Mark checkout started
  const trackCheckoutStarted = useCallback(async (email: string) => {
    await updateSession({
      email,
      checkout_started_at: new Date().toISOString(),
    });
  }, [updateSession]);

  // Mark as completed (reached pricing)
  const trackCompleted = useCallback(async () => {
    await updateSession({
      completed_at: new Date().toISOString(),
    });
  }, [updateSession]);

  // Mark as converted (after payment)
  const trackConverted = useCallback(async () => {
    await updateSession({
      converted_at: new Date().toISOString(),
    });
  }, [updateSession]);

  return {
    sessionId: sessionId.current,
    trackStep,
    updateSession,
    detectLanguage,
    isDetectingLanguage,
    detectedLanguage,
    trackCheckoutStarted,
    trackCompleted,
    trackConverted,
  };
};
