import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    const { project_id } = await req.json().catch(() => ({ project_id: null }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Account info
    const acctRes = await fetch(
      `${META_API}/${adAccountId}?fields=name,currency,timezone_name,account_status,business&access_token=${token}`,
    );
    const acct = await acctRes.json();
    if (acct.error) throw new Error(acct.error.message);

    if (project_id) {
      await supabase.from("meta_ad_accounts").upsert({
        project_id,
        account_id: adAccountId,
        business_id: acct.business?.id,
        name: acct.name,
        currency: acct.currency,
        timezone: acct.timezone_name,
        status: String(acct.account_status),
      }, { onConflict: "project_id,account_id" });
    }

    // Campaigns + insights
    const camRes = await fetch(
      `${META_API}/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(last_30d){spend,impressions,clicks,ctr,cpc,actions}&limit=50&access_token=${token}`,
    );
    const camData = await camRes.json();
    if (camData.error) throw new Error(camData.error.message);

    const campaigns = (camData.data || []).map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      const conv = (ins.actions || []).find((a: any) => a.action_type === "purchase")?.value || 0;
      return {
        project_id,
        campaign_id: c.id,
        account_id: adAccountId,
        name: c.name,
        objective: c.objective,
        status: c.status,
        daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        spend: Number(ins.spend || 0),
        impressions: Number(ins.impressions || 0),
        clicks: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0),
        cpc: Number(ins.cpc || 0),
        conversions: Number(conv),
        start_time: c.start_time,
        stop_time: c.stop_time,
        last_synced_at: new Date().toISOString(),
      };
    });

    if (project_id && campaigns.length > 0) {
      await supabase.from("meta_campaigns").upsert(campaigns, { onConflict: "project_id,campaign_id" });
    }

    return new Response(JSON.stringify({
      success: true,
      account: { id: adAccountId, name: acct.name, currency: acct.currency, status: acct.account_status },
      campaigns,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("meta-ads-sync error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
