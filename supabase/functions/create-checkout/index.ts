import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Founding prices on "AutoPilot GEO — Starter" (prod_UYOqKNzPfdM0ZL).
// Annual is -20% ($7.99/mo billed yearly), matching the other products' convention.
// Overridable per environment so a price change never needs a redeploy.
const PRICE_MONTHLY =
  Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "price_1U10c9Efti9t9nN95k2JZpYk"; // $9.99/month
const PRICE_ANNUAL =
  Deno.env.get("STRIPE_PRICE_ANNUAL") ?? "price_1U10cIEfti9t9nN9nZHk8ZHA"; // $95.88/year

export const TRIAL_DAYS = 3;

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

    // Get request body
    let plan = "monthly";
    let guestEmail: string | null = null;
    let isGuest = false;

    try {
      const body = await req.json();
      plan = body.plan || "monthly";
      guestEmail = body.email || null;
      isGuest = body.guest === true;
    } catch {
      // Default to monthly if no body
    }

    const priceId = plan === "annual" ? PRICE_ANNUAL : PRICE_MONTHLY;
    console.log("[CREATE-CHECKOUT] Plan:", plan, "Price ID:", priceId, "Guest:", isGuest);

    let userEmail: string | null = null;

    // Try to get authenticated user first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      if (data.user?.email) {
        userEmail = data.user.email;
        console.log("[CREATE-CHECKOUT] Authenticated user:", userEmail);
      }
    }

    // If no authenticated user but guest email provided, use that
    if (!userEmail && guestEmail && isGuest) {
      userEmail = guestEmail;
      console.log("[CREATE-CHECKOUT] Guest checkout with email:", userEmail);
    }

    // If still no email, error
    if (!userEmail) {
      throw new Error("Email is required for checkout");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer already exists
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-CHECKOUT] Existing customer found:", customerId);
    }

    const origin = req.headers.get("origin") || "https://autopilotgeo.com";

    // Determine success URL — redirect to thank-you page with session_id
    const successUrl = isGuest 
      ? `${origin}/auth?mode=signup&checkout=success`
      : `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`;

    // 3-day trial: the landing and onboarding both advertise "no charge until
    // day 4", so the subscription must not bill on creation.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: TRIAL_DAYS },
      success_url: successUrl,
      cancel_url: `${origin}/onboarding`,
    });

    console.log("[CREATE-CHECKOUT] Session created:", session.id);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CREATE-CHECKOUT] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
