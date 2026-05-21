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
    const {
      name, campaign_id, daily_budget = 1000, optimization_goal = "LINK_CLICKS",
      billing_event = "IMPRESSIONS", bid_amount,
      countries = ["US"], age_min = 18, age_max = 65, genders,
      interests = [], custom_audiences = [], lookalike_audiences = [],
      status = "PAUSED", start_time, end_time,
    } = await req.json();
    if (!name || !campaign_id) throw new Error("name and campaign_id required");

    const targeting: any = {
      geo_locations: { countries },
      age_min, age_max,
      publisher_platforms: ["facebook", "instagram"],
      facebook_positions: ["feed", "story"],
      instagram_positions: ["stream", "story", "reels"],
    };
    if (genders?.length) targeting.genders = genders;
    if (interests.length) targeting.flexible_spec = [{ interests: interests.map((i: any) => ({ id: i.id, name: i.name })) }];
    if (custom_audiences.length) targeting.custom_audiences = custom_audiences.map((id: string) => ({ id }));
    if (lookalike_audiences.length) {
      targeting.custom_audiences = [...(targeting.custom_audiences || []), ...lookalike_audiences.map((id: string) => ({ id }))];
    }

    const body: any = {
      name, campaign_id, status,
      daily_budget: String(daily_budget),
      billing_event, optimization_goal,
      targeting: JSON.stringify(targeting),
      access_token: token,
    };
    if (bid_amount) body.bid_amount = String(bid_amount);
    if (start_time) body.start_time = start_time;
    if (end_time) body.end_time = end_time;

    const params = new URLSearchParams(body);
    const res = await fetch(`${META_API}/${adAccountId}/adsets`, { method: "POST", body: params });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return new Response(JSON.stringify({ success: true, adset: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
