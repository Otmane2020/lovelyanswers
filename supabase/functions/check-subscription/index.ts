import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// VIP emails with permanent unlimited access
const VIP_EMAILS = [
  "oben.rockman@gmail.com",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is VIP (permanent unlimited access)
    if (VIP_EMAILS.includes(user.email.toLowerCase())) {
      logStep("VIP user detected - granting unlimited access", { email: user.email });
      
      // Give VIP users max credits
      await supabaseClient
        .from("credits")
        .upsert({
          user_id: user.id,
          credits_total: 99999,
          credits_used: 0,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: true,
        trial: false,
        product_id: "vip_unlimited",
        subscription_end: "2099-12-31T23:59:59.999Z",
        credits_total: 99999
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial: false,
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active or trialing subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    const activeOrTrialingSub = subscriptions.data.find(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeOrTrialingSub) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        trial: false,
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(activeOrTrialingSub.current_period_end * 1000).toISOString();
    const productId = activeOrTrialingSub.items.data[0]?.price?.product as string;
    const isTrialing = activeOrTrialingSub.status === "trialing";

    logStep("Active subscription found", { 
      subscriptionId: activeOrTrialingSub.id, 
      status: activeOrTrialingSub.status,
      productId,
      endDate: subscriptionEnd 
    });

    // Update credits based on subscription
    const creditsTotal = isTrialing ? 50 : 500; // 50 for trial, 500 for paid
    
    await supabaseClient
      .from("credits")
      .upsert({
        user_id: user.id,
        credits_total: creditsTotal,
        credits_used: 0,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    logStep("Credits updated", { creditsTotal });

    return new Response(JSON.stringify({
      subscribed: true,
      trial: isTrialing,
      product_id: productId,
      subscription_end: subscriptionEnd,
      credits_total: creditsTotal
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
