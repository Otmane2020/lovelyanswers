"use client";
import { useCallback, useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  plan: "starter" | "pro" | "agency";
  cycle: "monthly" | "annual";
  onError?: (msg: string) => void;
}

/**
 * Stripe Embedded Checkout — renders the card form inside our page.
 * No redirect to stripe.com. Card is captured but not charged during the
 * 3-day trial; auto-charged on day 4 unless the user cancels.
 */
export function EmbeddedCheckoutBox({ plan, cycle, onError }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(`${plan}-${cycle}`);

  const fetchClientSecret = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, cycle, ui_mode: "embedded" },
      });
      if (error) throw error;
      if (!data?.client_secret) throw new Error("Missing client_secret");
      setClientSecret(data.client_secret);
      return data.client_secret as string;
    } catch (e: any) {
      console.error("[EmbeddedCheckout] init failed:", e);
      onError?.(e?.message || "Failed to start checkout");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [plan, cycle, onError]);

  useEffect(() => {
    setClientSecret(null);
    setCheckoutKey(`${plan}-${cycle}`);
  }, [plan, cycle]);

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden min-h-[520px]">
      {loading && !clientSecret && (
        <div className="flex items-center justify-center h-[520px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <EmbeddedCheckoutProvider
        key={checkoutKey}
        stripe={getStripe()}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
