"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  subscribed: boolean;
  trial: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  creditsTotal: number;
  isLoading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    trial: false,
    productId: null,
    subscriptionEnd: null,
    creditsTotal: 0,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false, subscribed: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        setStatus(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setStatus({
        subscribed: data.subscribed || false,
        trial: data.trial || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        creditsTotal: data.credits_total || 0,
        isLoading: false,
      });
    } catch (err) {
      console.error("Subscription check failed:", err);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // window.open() only survives popup blockers when it runs synchronously
  // inside the click handler — call it BEFORE the await so the tab is
  // already open (blank), then point it at the real URL once we have it.
  // Opening it after the await (the old code) meant the browser no longer
  // saw it as user-gesture-triggered and silently blocked it: no error,
  // nothing visibly happens, which is exactly "the button doesn't work".
  const startCheckout = async () => {
    const tab = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) {
        console.error("Checkout error:", error);
        tab?.close();
        throw new Error("Failed to create checkout session");
      }

      if (data?.url) {
        if (tab) tab.location.href = data.url;
        else window.location.href = data.url; // popup blocked — fall back to same-tab redirect
      } else {
        tab?.close();
      }
    } catch (err) {
      tab?.close();
      console.error("Checkout failed:", err);
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    const tab = window.open("about:blank", "_blank");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) {
        console.error("Portal error:", error);
        tab?.close();
        throw new Error("Failed to open customer portal");
      }

      if (data?.url) {
        if (tab) tab.location.href = data.url;
        else window.location.href = data.url; // popup blocked — fall back to same-tab redirect
      } else {
        tab?.close();
      }
    } catch (err) {
      tab?.close();
      console.error("Portal failed:", err);
      throw err;
    }
  };

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Check subscription on URL param (after checkout redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      // Remove param and recheck
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(checkSubscription, 1000);
    }
  }, [checkSubscription]);

  // Periodic refresh every 60 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  return {
    ...status,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
