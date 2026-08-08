import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getUsableSecret } from "../_shared/env-guard.ts";

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
  "oben.rocman@gmail.com",
  "expertt.webdev@gmail.com",
  "otmane.benyahya@sweetdeco.com",
  "starlinko.app@gmail.com",
  "support@meubleoccasion.com",
  "support@audit-aeo.com",
  "contact@webify-app.com",
  "canapedeluxe.com@gmail.com",
  "clipmotion.ai@gmail.com",
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

    const stripeKey = getUsableSecret("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set or looks like a placeholder — check Project Settings > Edge Functions > Secrets in Supabase");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header - returning unsubscribed");
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

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    // Handle auth errors gracefully (e.g., after logout)
    if (userError || !userData.user?.email) {
      logStep("Auth error or no user - returning unsubscribed", { error: userError?.message });
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
    
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is VIP (permanent unlimited access)
    const userEmail = user.email || "";
    if (VIP_EMAILS.includes(userEmail.toLowerCase())) {
      logStep("VIP user detected - granting unlimited access", { email: userEmail });
      
      // Give VIP users max credits
      await supabaseClient
        .from("credits")
        .upsert({
          user_id: user.id,
          credits_total: 99999,
          credits_used: 0,
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });

      // Check if VIP user has locked content and unlock it
      const { data: userProjects } = await supabaseClient
        .from("projects")
        .select("id")
        .eq("user_id", user.id);

      if (userProjects && userProjects.length > 0) {
        const projectId = userProjects[0].id;
        const { data: lockedArticles } = await supabaseClient
          .from("articles")
          .select("id")
          .eq("project_id", projectId)
          .eq("status", "locked")
          .limit(1);

        const { data: lockedAnswers } = await supabaseClient
          .from("answers")
          .select("id")
          .eq("project_id", projectId)
          .eq("answer", "Content locked — subscribe to unlock.")
          .limit(1);

        const hasLockedContent = (lockedArticles && lockedArticles.length > 0) || 
                                  (lockedAnswers && lockedAnswers.length > 0);

        if (hasLockedContent) {
          logStep("VIP user has locked content - triggering unlock", { projectId });
          const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
          // Fire and forget - don't await to avoid delaying the response
          fetch(`${supabaseUrl}/functions/v1/unlock-articles`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${req.headers.get("Authorization")?.replace("Bearer ", "") || serviceRoleKey}`,
              "Content-Type": "application/json",
            },
          }).catch((e) => logStep("Unlock trigger error (ignored)", { error: String(e) }));
        }
      }

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

    logStep("Fetched subscriptions", { 
      count: subscriptions.data.length,
      statuses: subscriptions.data.map((s: any) => s.status)
    });

    const activeOrTrialingSub = subscriptions.data.find(
      (sub: any) => sub.status === "active" || sub.status === "trialing"
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

    // Access subscription properties directly
    const sub = activeOrTrialingSub as any;
    const isTrialing = sub.status === "trialing";
    const productId = sub.items?.data?.[0]?.price?.product as string || null;
    
    // Parse subscription end date - handle both trial_end and current_period_end
    let subscriptionEnd: string | null = null;
    const endTimestamp = isTrialing ? sub.trial_end : sub.current_period_end;
    
    if (endTimestamp && typeof endTimestamp === 'number') {
      try {
        subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
      } catch (dateError) {
        logStep("Error parsing subscription end date", { error: String(dateError) });
      }
    }

    logStep("Active subscription found", { 
      subscriptionId: sub.id, 
      status: sub.status,
      isTrialing,
      productId,
      endDate: subscriptionEnd,
      rawEndTimestamp: endTimestamp
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
