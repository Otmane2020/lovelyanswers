import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRICE_MONTHLY = "price_1Sw4JNEfti9t9nN9Z88uua20"; // $29/month
const PRICE_ANNUAL = "price_1Sw4LaEfti9t9nN97pvV9rYI"; // $279/year

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[CREATE-CHECKOUT] Starting checkout session creation");

    let plan = "monthly";
    let guestEmail: string | null = null;
    let isGuest = false;
    let embedded = false;

    try {
      const body = await req.json();
      plan = body.plan || "monthly";
      guestEmail = body.email || null;
      isGuest = body.guest === true;
      embedded = body.embedded === true;
    } catch {
      // Default values
    }

    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
    console.log("[CREATE-CHECKOUT] Plan:", plan, "Price ID:", priceId, "Guest:", isGuest, "Embedded:", embedded);

    let userEmail: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        console.log("[CREATE-CHECKOUT] Authenticated user:", userEmail);
      }
    }

    if (!userEmail && guestEmail && isGuest) {
      userEmail = guestEmail;
      console.log("[CREATE-CHECKOUT] Guest checkout with email:", userEmail);
    }

    if (!userEmail) {
      throw new Error("Email is required for checkout");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer found:", customerId);
    }

    const origin = req.headers.get("origin") || "https://lovelyanswers.lovable.app";

    if (embedded) {
      // Embedded checkout mode - return client_secret
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        ui_mode: "embedded",
        currency: "eur",
        return_url: `${origin}/dashboard?subscription=success`,
      });

      console.log("[CREATE-CHECKOUT] Embedded session created:", session.id);

      return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Legacy redirect mode
      const successUrl = isGuest
        ? `${origin}/auth?mode=signup&checkout=success`
        : `${origin}/dashboard?subscription=success`;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : userEmail,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: successUrl,
        cancel_url: `${origin}/onboarding`,
      });

      console.log("[CREATE-CHECKOUT] Redirect session created:", session.id);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
