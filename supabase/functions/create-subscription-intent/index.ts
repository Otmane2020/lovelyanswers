import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Founding prices on "AutoPilot GEO — Starter" (prod_UYOqKNzPfdM0ZL).
const PRICE_MONTHLY =
  Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "price_1U10c9Efti9t9nN95k2JZpYk"; // $9.99/month
const PRICE_ANNUAL =
  Deno.env.get("STRIPE_PRICE_ANNUAL") ?? "price_1U10cIEfti9t9nN9nZHk8ZHA"; // $95.88/year

const TRIAL_DAYS = 3;

/**
 * Creates a trialing subscription and hands back the SetupIntent secret so the
 * card can be collected with Stripe Elements, inside our own onboarding.
 *
 * Because the subscription starts on a trial there is nothing to charge yet, so
 * Stripe issues a `pending_setup_intent` rather than a PaymentIntent — the card
 * is saved now and first billed on day 4.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const plan: string = body.plan === "annual" ? "annual" : "monthly";
    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;

    // The caller must be signed in — the subscription is tied to their account.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email;
    console.log("[SUB-INTENT] plan:", plan, "price:", priceId, "user:", userData.user.id);

    // Reuse the customer if this email already has one.
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ??
      (await stripe.customers.create({
        email,
        metadata: { supabase_user_id: userData.user.id },
      }));

    // Don't create a second subscription if one is already live.
    const currentSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
    });
    const active = currentSubs.data.find((s) =>
      ["active", "trialing", "past_due"].includes(s.status)
    );
    if (active) {
      return new Response(
        JSON.stringify({ alreadySubscribed: true, status: active.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_DAYS,
      payment_behavior: "default_incomplete",
      // No card saved by the end of the trial → cancel rather than silently
      // leaving a subscription that can never bill.
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["pending_setup_intent"],
      metadata: { supabase_user_id: userData.user.id, plan },
    });

    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent | null;
    if (!setupIntent?.client_secret) {
      throw new Error("Stripe did not return a setup intent for the trialing subscription");
    }

    console.log("[SUB-INTENT] subscription:", subscription.id, "status:", subscription.status);

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
        subscriptionId: subscription.id,
        customerId: customer.id,
        trialDays: TRIAL_DAYS,
        plan,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[SUB-INTENT] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
