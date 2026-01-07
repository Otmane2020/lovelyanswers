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
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setIsSubscribed(false);
      setIsTrial(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) {
        console.error("Error checking subscription:", error);
        setIsLoading(false);
        return;
      }

      setIsSubscribed(data.subscribed || false);
      setIsTrial(data.trial || false);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (err) {
      console.error("Subscription check failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  // Check on mount and user change
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Handle success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(checkSubscription, 1000);
    }
  }, [checkSubscription]);

  // Periodic refresh
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

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
