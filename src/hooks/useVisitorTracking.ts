import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate a unique visitor ID (persisted in localStorage)
const getVisitorId = (): string => {
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("visitor_id", visitorId);
  }
  return visitorId;
};

// Generate a unique session ID (persisted in sessionStorage)
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("session_id");
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem("session_id", sessionId);
  }
  return sessionId;
};

// Parse UTM and tracking parameters from URL
const getTrackingParams = () => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    // UTM Parameters
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    utm_content: params.get("utm_content"),
    utm_term: params.get("utm_term"),
    
    // Facebook specific
    fbclid: params.get("fbclid"),
    fb_campaign_id: params.get("campaign_id") || params.get("fb_campaign_id"),
    fb_adset_id: params.get("adset_id") || params.get("fb_adset_id"),
    fb_ad_id: params.get("ad_id") || params.get("fb_ad_id"),
    
    // Google specific
    gclid: params.get("gclid"),
  };
};

// Detect device type
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

// Detect browser
const getBrowser = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("SamsungBrowser")) return "Samsung Browser";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
};

// Detect OS
const getOS = (): string => {
  const ua = navigator.userAgent;
  if (ua.includes("Win")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Unknown";
};

export const useVisitorTracking = () => {
  const location = useLocation();
  const sessionStartTime = useRef<number>(Date.now());
  const currentPageStartTime = useRef<number>(Date.now());
  const isSessionTracked = useRef<boolean>(false);
  const pageViewsCount = useRef<number>(0);

  // Track new session
  const trackSession = useCallback(async () => {
    if (isSessionTracked.current) return;
    
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    const trackingParams = getTrackingParams();
    
    try {
      const sessionData = {
        visitor_id: visitorId,
        session_id: sessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        landing_page: window.location.pathname,
        
        // UTM and tracking params
        ...trackingParams,
        
        // Device info
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        
        last_page: window.location.pathname,
      };

      await supabase.from("visitor_sessions").insert(sessionData);
      isSessionTracked.current = true;
      
      // Store tracking params in sessionStorage for later reference
      if (trackingParams.utm_source || trackingParams.fbclid || trackingParams.gclid) {
        sessionStorage.setItem("tracking_params", JSON.stringify(trackingParams));
      }
    } catch (error) {
      console.error("Error tracking session:", error);
    }
  }, []);

  // Track page view
  const trackPageView = useCallback(async (pagePath: string) => {
    const visitorId = getVisitorId();
    const sessionId = getSessionId();
    
    try {
      // Calculate time on previous page
      const timeOnPreviousPage = Math.floor((Date.now() - currentPageStartTime.current) / 1000);
      
      // Insert new page view
      await supabase.from("page_views").insert({
        session_id: sessionId,
        visitor_id: visitorId,
        page_path: pagePath,
        page_title: document.title,
        time_on_page_seconds: 0,
      });

      pageViewsCount.current += 1;

      // Update session with new page count and last page
      await supabase
        .from("visitor_sessions")
        .update({
          page_views: pageViewsCount.current,
          last_page: pagePath,
          is_bounce: pageViewsCount.current <= 1,
        })
        .eq("session_id", sessionId);

      // Reset page start time
      currentPageStartTime.current = Date.now();
    } catch (error) {
      console.error("Error tracking page view:", error);
    }
  }, []);

  // Update session duration before leaving
  const updateSessionDuration = useCallback(async () => {
    const sessionId = getSessionId();
    const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
    
    try {
      await supabase
        .from("visitor_sessions")
        .update({ session_duration_seconds: duration })
        .eq("session_id", sessionId);
    } catch (error) {
      console.error("Error updating session duration:", error);
    }
  }, []);

  // Mark conversion (when user signs up or logs in)
  const trackConversion = useCallback(async (userId: string) => {
    const sessionId = getSessionId();
    
    try {
      await supabase
        .from("visitor_sessions")
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
          user_id: userId,
        })
        .eq("session_id", sessionId);
    } catch (error) {
      console.error("Error tracking conversion:", error);
    }
  }, []);

  // Track session on mount
  useEffect(() => {
    trackSession();
    
    // Update duration on page unload
    const handleUnload = () => {
      updateSessionDuration();
    };
    
    window.addEventListener("beforeunload", handleUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [trackSession, updateSessionDuration]);

  // Track page views on route change
  useEffect(() => {
    if (isSessionTracked.current) {
      trackPageView(location.pathname);
    }
  }, [location.pathname, trackPageView]);

  return { trackConversion };
};

// Helper to get Facebook tracking URL parameters for links
export const getFacebookTrackingParams = () => {
  const storedParams = sessionStorage.getItem("tracking_params");
  if (storedParams) {
    try {
      return JSON.parse(storedParams);
    } catch {
      return null;
    }
  }
  return getTrackingParams();
};
