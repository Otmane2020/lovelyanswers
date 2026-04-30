"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionContextType {
  isSubscribed: boolean;
  isTrial: boolean;
  isLoading: boolean;
  subscriptionEnd: string | null;
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<string | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    // Don't check if auth is still loading
    if (authLoading) {
      return;
    }

    if (!user) {
      setIsSubscribed(false);
      setIsTrial(false);
      setIsLoading(false);
      return;
    }

    try {
      console.log("[SubscriptionContext] Checking subscription for user:", user.email);
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("[SubscriptionContext] Error checking subscription:", error);
        setIsLoading(false);
        return;
      }

      console.log("[SubscriptionContext] Subscription response:", data);
      
      const subscribed = data?.subscribed || false;
      const trial = data?.trial || false;
      
      setIsSubscribed(subscribed);
      setIsTrial(trial);
      setSubscriptionEnd(data?.subscription_end || null);
      
      console.log("[SubscriptionContext] State set - subscribed:", subscribed, "trial:", trial);
    } catch (err) {
      console.error("[SubscriptionContext] Subscription check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const startCheckout = async (): Promise<string | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      
      if (error) {
        console.error("Checkout error:", error);
        return null;
      }

      return data?.url || null;
    } catch (err) {
      console.error("Checkout failed:", err);
      return null;
    }
  };

  // Check on mount and when auth finishes loading
  useEffect(() => {
    // Only check when auth is done loading
    if (!authLoading) {
      checkSubscription();
    }
  }, [checkSubscription, authLoading]);

  // Handle success redirect - immediately recheck subscription
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      // Immediate recheck for subscription status
      checkSubscription();
    }
  }, [checkSubscription]);

  // Periodic refresh — fast (15s) while unsubscribed to catch new payments quickly,
  // then slow (60s) once subscribed.
  useEffect(() => {
    if (!user) return;
    const intervalMs = isSubscribed ? 60000 : 15000;
    const interval = setInterval(checkSubscription, intervalMs);
    return () => clearInterval(interval);
  }, [user, checkSubscription, isSubscribed]);

  return (
    <SubscriptionContext.Provider value={{ 
      isSubscribed, 
      isTrial, 
      isLoading, 
      subscriptionEnd, 
      checkSubscription,
      startCheckout 
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscriptionContext must be used within a SubscriptionProvider");
  }
  return context;
}
