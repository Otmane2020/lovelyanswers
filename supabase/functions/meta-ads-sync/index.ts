import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

function metric(insights: any, type: string) {
  return Number((insights?.actions || []).find((a: any) => a.action_type === type)?.value || 0);
}
function revenue(insights: any) {
  return Number((insights?.action_values || []).find((a: any) => a.action_type === "purchase")?.value || 0);
}

function pixelSnippet(pixelId: string) {
  return `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    let adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!token || !adAccountId) throw new Error("Meta credentials not configured");
    if (!adAccountId.startsWith("act_")) adAccountId = `act_${adAccountId}`;
    const { project_id, insights_only = false } = await req.json().catch(() => ({}));

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Account + page
    const acctRes = await fetch(`${META_API}/${adAccountId}?fields=name,currency,timezone_name,account_status,business,promote_pages{id,name}&access_token=${token}`);
    const acct = await acctRes.json();
    if (acct.error) throw new Error(acct.error.message);

    const page = acct.promote_pages?.data?.[0];
    let pageId = page?.id || null;
    let pageName = page?.name || null;
    let igActorId: string | null = null;

    if (pageId) {
      // Try to fetch the Instagram business account linked to the Page
      const igRes = await fetch(`${META_API}/${pageId}?fields=instagram_business_account{id,username}&access_token=${token}`);
      const igData = await igRes.json();
      igActorId = igData?.instagram_business_account?.id || null;
    }

    if (project_id) {
      await supabase.from("meta_ad_accounts").upsert({
        project_id, account_id: adAccountId, business_id: acct.business?.id,
        name: acct.name, currency: acct.currency, timezone: acct.timezone_name,
        status: String(acct.account_status),
        page_id: pageId, page_name: pageName, instagram_actor_id: igActorId,
      }, { onConflict: "project_id,account_id" });
    }

    // Pixels
    let pixelsCount = 0;
    if (project_id && !insights_only) {
      const pxRes = await fetch(`${META_API}/${adAccountId}/adspixels?fields=id,name,code,last_fired_time,is_unavailable&access_token=${token}`);
      const pxData = await pxRes.json();
      if (!pxData.error && pxData.data) {
        const rows = pxData.data.map((p: any) => ({
          project_id,
          pixel_id: p.id,
          name: p.name || `Pixel ${p.id}`,
          code_snippet: p.code || pixelSnippet(p.id),
          last_fired_at: p.last_fired_time || null,
          is_capi_enabled: false,
        }));
        if (rows.length) {
          await supabase.from("meta_pixels").upsert(rows, { onConflict: "project_id,pixel_id" });
          pixelsCount = rows.length;
        }
      }
    }

    // Custom audiences
    let audiencesCount = 0;
    if (project_id && !insights_only) {
      const auRes = await fetch(`${META_API}/${adAccountId}/customaudiences?fields=id,name,subtype,approximate_count_lower_bound,description,operation_status&limit=100&access_token=${token}`);
      const auData = await auRes.json();
      if (!auData.error && auData.data) {
        const rows = auData.data.map((a: any) => ({
          project_id,
          audience_id: a.id,
          name: a.name,
          type: a.subtype || "CUSTOM",
          approximate_count: a.approximate_count_lower_bound || 0,
          rule: {},
        }));
        if (rows.length) {
          await supabase.from("meta_audiences").upsert(rows, { onConflict: "project_id,audience_id" });
          audiencesCount = rows.length;
        }
      }
    }

    // Campaigns + insights
    const insightsFields = "spend,impressions,clicks,ctr,cpc,actions,action_values";
    const camRes = await fetch(`${META_API}/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,insights.date_preset(last_30d){${insightsFields}}&limit=100&access_token=${token}`);
    const camData = await camRes.json();
    if (camData.error) throw new Error(camData.error.message);

    const today = new Date().toISOString().slice(0, 10);
    const campaigns = (camData.data || []).map((c: any) => {
      const ins = c.insights?.data?.[0] || {};
      const conv = metric(ins, "purchase") || metric(ins, "lead");
      const rev = revenue(ins);
      const spend = Number(ins.spend || 0);
      return {
        project_id, campaign_id: c.id, account_id: adAccountId, name: c.name,
        objective: c.objective, status: c.status,
        daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        spend, impressions: Number(ins.impressions || 0), clicks: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0), cpc: Number(ins.cpc || 0),
        conversions: conv, revenue: rev,
        roas: spend > 0 ? rev / spend : 0, cpa: conv > 0 ? spend / conv : 0,
        start_time: c.start_time, stop_time: c.stop_time,
        last_synced_at: new Date().toISOString(),
      };
    });
    let campaignsUpserted = 0;
    if (project_id && campaigns.length) {
      const { error: cErr } = await supabase.from("meta_campaigns").upsert(campaigns, { onConflict: "project_id,campaign_id" });
      if (cErr) console.error("campaigns upsert error:", cErr);
      else campaignsUpserted = campaigns.length;
      const snaps = campaigns.map((c: any) => ({
        project_id, level: "campaign", ref_id: c.campaign_id, ref_name: c.name,
        snapshot_date: today, spend: c.spend, revenue: c.revenue, conversions: c.conversions,
        impressions: c.impressions, clicks: c.clicks, roas: c.roas, cpa: c.cpa,
      }));
      const { error: sErr } = await supabase.from("meta_roas_snapshots").upsert(snaps, { onConflict: "project_id,level,ref_id,snapshot_date" });
      if (sErr) console.error("snapshots upsert error:", sErr);
    }

    // Ad Sets
    const adsetRes = await fetch(`${META_API}/${adAccountId}/adsets?fields=id,name,campaign_id,status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,start_time,end_time,targeting,insights.date_preset(last_30d){${insightsFields}}&limit=200&access_token=${token}`);
    const adsetData = await adsetRes.json();
    const adsets = (adsetData.data || []).map((a: any) => {
      const ins = a.insights?.data?.[0] || {};
      const conv = metric(ins, "purchase") || metric(ins, "lead");
      const rev = revenue(ins);
      const spend = Number(ins.spend || 0);
      const t = a.targeting || {};
      const summary = [
        t.geo_locations?.countries?.join(","),
        t.age_min && t.age_max ? `${t.age_min}-${t.age_max}` : null,
        t.flexible_spec?.[0]?.interests?.length ? `${t.flexible_spec[0].interests.length} interests` : null,
      ].filter(Boolean).join(" • ");
      return {
        project_id, adset_id: a.id, campaign_id: a.campaign_id, name: a.name, status: a.status,
        daily_budget: a.daily_budget ? Number(a.daily_budget) / 100 : null,
        lifetime_budget: a.lifetime_budget ? Number(a.lifetime_budget) / 100 : null,
        optimization_goal: a.optimization_goal, billing_event: a.billing_event,
        bid_amount: a.bid_amount ? Number(a.bid_amount) / 100 : null,
        start_time: a.start_time, end_time: a.end_time, targeting: t, targeting_summary: summary,
        spend, impressions: Number(ins.impressions || 0), clicks: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0), cpc: Number(ins.cpc || 0),
        conversions: conv, revenue: rev,
        roas: spend > 0 ? rev / spend : 0, cpa: conv > 0 ? spend / conv : 0,
        last_synced_at: new Date().toISOString(),
      };
    });
    if (project_id && adsets.length) {
      const { error: asErr } = await supabase.from("meta_adsets").upsert(adsets, { onConflict: "project_id,adset_id" });
      if (asErr) console.error("adsets upsert error:", asErr);
    }

    // Ads
    const adRes = await fetch(`${META_API}/${adAccountId}/ads?fields=id,name,adset_id,campaign_id,status,creative{id,thumbnail_url,object_story_spec,image_url,video_id},preview_shareable_link,insights.date_preset(last_30d){${insightsFields}}&limit=200&access_token=${token}`);
    const adData = await adRes.json();
    const ads = (adData.data || []).map((a: any) => {
      const ins = a.insights?.data?.[0] || {};
      const conv = metric(ins, "purchase") || metric(ins, "lead");
      const rev = revenue(ins);
      const spend = Number(ins.spend || 0);
      return {
        project_id, ad_id: a.id, adset_id: a.adset_id, campaign_id: a.campaign_id,
        name: a.name, status: a.status, creative: a.creative || {},
        preview_url: a.preview_shareable_link || null,
        spend, impressions: Number(ins.impressions || 0), clicks: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0), cpc: Number(ins.cpc || 0),
        conversions: conv, revenue: rev,
        roas: spend > 0 ? rev / spend : 0,
        last_synced_at: new Date().toISOString(),
      };
    });
    if (project_id && ads.length) {
      await supabase.from("meta_ads").upsert(ads, { onConflict: "project_id,ad_id" });
    }

    return new Response(JSON.stringify({
      success: true,
      account: { id: adAccountId, name: acct.name, currency: acct.currency, status: acct.account_status, page_id: pageId, page_name: pageName, instagram_actor_id: igActorId },
      counts: { campaigns: campaigns.length, adsets: adsets.length, ads: ads.length, pixels: pixelsCount, audiences: audiencesCount },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("meta-ads-sync error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
