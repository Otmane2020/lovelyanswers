import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CUSTOMER-PORTAL] Starting portal session creation");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[CUSTOMER-PORTAL] User authenticated:", user.email);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found for this user");
    }

    const customerId = customers.data[0].id;
    const origin = req.headers.get("origin") || "https://aeoreply.lovable.dev";

    // This Stripe account is shared with several unrelated products (Starly,
    // Ranki.ai, ClipMotion, etc). The account's default portal configuration
    // has no product restriction, so without our own configuration a
    // customer opening "Manage billing" sees every other app's plans mixed
    // in as if they were AutoPilotGEO tiers — confusing and a real risk of
    // someone accidentally switching their subscription to the wrong
    // product entirely. Look for an AutoPilotGEO-scoped configuration first;
    // create it once (tagged via metadata) if it doesn't exist yet.
    const AUTOPILOT_GEO_PRODUCTS = [
      { product: "prod_UYOqKNzPfdM0ZL", prices: ["price_1U10c9Efti9t9nN95k2JZpYk", "price_1U10cIEfti9t9nN9nZHk8ZHA"] }, // Starter
      { product: "prod_UYOze2NYLIoGR4", prices: ["price_1TZIBYEfti9t9nN9lG9JGwUa", "price_1TZIBfEfti9t9nN9ZYClUCvF"] }, // Pro
      { product: "prod_UYOzY19UDxIw29", prices: ["price_1TZIBjEfti9t9nN9ToqTd8xu", "price_1TZIBnEfti9t9nN9fmZiURZR"] }, // Agency
    ];

    const existingConfigs = await stripe.billingPortal.configurations.list({ limit: 100 });
    let config = existingConfigs.data.find((c) => c.metadata?.app === "autopilotgeo");

    if (!config) {
      config = await stripe.billingPortal.configurations.create({
        business_profile: { headline: "AutoPilot GEO" },
        metadata: { app: "autopilotgeo" },
        features: {
          customer_update: { enabled: true, allowed_updates: ["name", "email", "address", "phone", "tax_id"] },
          invoice_history: { enabled: true },
          payment_method_update: { enabled: true },
          subscription_cancel: {
            enabled: true,
            mode: "immediately",
            proration_behavior: "create_prorations",
            cancellation_reason: { enabled: true, options: ["too_expensive", "switched_service", "unused", "other"] },
          },
          subscription_update: {
            enabled: true,
            default_allowed_updates: ["price", "promotion_code"],
            proration_behavior: "always_invoice",
            products: AUTOPILOT_GEO_PRODUCTS,
          },
        },
      });
      console.log("[CUSTOMER-PORTAL] Created AutoPilotGEO-scoped portal configuration:", config.id);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      configuration: config.id,
      return_url: `${origin}/geo?tab=settings`,
    });

    console.log("[CUSTOMER-PORTAL] Portal session created:", portalSession.id);

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("[CUSTOMER-PORTAL] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
