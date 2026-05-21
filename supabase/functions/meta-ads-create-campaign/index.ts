import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    const adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !adAccountId) throw new Error("Meta credentials not configured");

    const { name, objective = "OUTCOME_TRAFFIC", daily_budget = 1000, status = "PAUSED" } = await req.json();
    if (!name) throw new Error("name required");

    const params = new URLSearchParams({
      name,
      objective,
      status,
      special_ad_categories: "[]",
      daily_budget: String(daily_budget),
      access_token: token,
    });

    const res = await fetch(`${META_API}/${adAccountId}/campaigns`, {
      method: "POST",
      body: params,
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return new Response(JSON.stringify({ success: true, campaign: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
