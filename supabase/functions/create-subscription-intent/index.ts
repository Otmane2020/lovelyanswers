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

/**
 * Creates a subscription that bills immediately and hands back the
 * PaymentIntent secret so the card can be charged with Stripe Elements,
 * inside our own onboarding. No trial: the first invoice is due on creation.
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
    const promoCodeInput: string = typeof body.promoCode === "string" ? body.promoCode.trim() : "";

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
      ["active", "past_due"].includes(s.status)
    );
    if (active) {
      return new Response(
        JSON.stringify({ alreadySubscribed: true, status: active.status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve the promo code before creating anything — an invalid code
    // must fail loudly here, not silently charge full price.
    let promotionCodeId: string | undefined;
    let appliedDiscount: { code: string; percentOff: number | null; amountOff: number | null } | undefined;
    if (promoCodeInput) {
      const matches = await stripe.promotionCodes.list({ code: promoCodeInput, active: true, limit: 1 });
      const promo = matches.data[0];
      if (!promo) {
        return new Response(JSON.stringify({ error: "That promo code isn't valid or has expired." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      promotionCodeId = promo.id;
      appliedDiscount = {
        code: promo.code,
        percentOff: promo.coupon.percent_off ?? null,
        amountOff: promo.coupon.amount_off ?? null,
      };
      console.log("[SUB-INTENT] promo code applied:", promo.code, promo.id);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { supabase_user_id: userData.user.id, plan },
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : {}),
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;
    if (!paymentIntent?.client_secret) {
      throw new Error("Stripe did not return a payment intent for the subscription");
    }

    console.log("[SUB-INTENT] subscription:", subscription.id, "status:", subscription.status);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        customerId: customer.id,
        plan,
        discount: appliedDiscount ?? null,
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
