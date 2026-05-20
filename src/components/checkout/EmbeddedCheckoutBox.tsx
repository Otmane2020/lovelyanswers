"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { Appearance, StripeElementsOptions } from "@stripe/stripe-js";
import { Loader2, Lock } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  plan: "starter" | "pro" | "agency";
  cycle: "monthly" | "annual";
  onError?: (msg: string) => void;
}

/**
 * Custom-styled Stripe checkout using Stripe Elements.
 * Renders directly inside our page (no Stripe-hosted iframe page),
 * uses a SetupIntent attached to a subscription with a 3-day trial.
 */
export function EmbeddedCheckoutBox({ plan, cycle, onError }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const init = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setClientSecret(null);
    setSubscriptionId(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-subscription-setup",
        { body: { plan, cycle } }
      );
      if (error) throw error;
      if (!data?.client_secret) throw new Error("Missing client_secret");
      if (!data?.subscription_id) throw new Error("Missing subscription_id");
      setClientSecret(data.client_secret);
      setSubscriptionId(data.subscription_id);
    } catch (e: any) {
      const msg = e?.message || "Failed to start checkout";
      setErrorMsg(msg);
      onErrorRef.current?.(msg);
    } finally {
      setLoading(false);
    }
  }, [plan, cycle]);

  useEffect(() => {
    init();
  }, [init]);

  const appearance = useMemo<Appearance>(
    () => ({
      theme: "stripe",
      variables: {
        colorPrimary: "#6366f1",
        colorBackground: "#ffffff",
        colorText: "#0f172a",
        colorDanger: "#ef4444",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        spacingUnit: "4px",
        borderRadius: "12px",
      },
      rules: {
        ".Input": {
          border: "1px solid hsl(214 32% 91%)",
          boxShadow: "none",
          padding: "12px",
        },
        ".Input:focus": {
          border: "1px solid #6366f1",
          boxShadow: "0 0 0 3px rgba(99,102,241,0.15)",
        },
        ".Label": {
          fontWeight: "500",
          fontSize: "13px",
          color: "#475569",
        },
        ".Tab, .Block": { borderRadius: "12px" },
      },
    }),
    []
  );

  const options = useMemo<StripeElementsOptions | null>(
    () =>
      clientSecret
        ? { clientSecret, appearance, loader: "auto" }
        : null,
    [clientSecret, appearance]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-background flex items-center justify-center h-[420px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMsg || !options || !subscriptionId) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {errorMsg || "Unable to load payment form."}
        <Button variant="outline" size="sm" className="mt-3" onClick={init}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <Elements stripe={getStripe()} options={options} key={clientSecret!}>
        <InnerForm subscriptionId={subscriptionId} />
      </Elements>
    </div>
  );
}

function InnerForm({ subscriptionId }: { subscriptionId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/thank-you?subscription_id=${encodeURIComponent(subscriptionId)}`,
      },
    });
    if (err) {
      setError(err.message || "Payment failed");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 rounded-xl"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Start 3-day free trial
          </>
        )}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        No charge today. Cancel anytime before day 4.
      </p>
    </form>
  );
}
