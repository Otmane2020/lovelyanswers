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
    if (!token) throw new Error("Meta token missing");
    const { project_id, dry_run = true } = await req.json();
    if (!project_id) throw new Error("project_id required");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings } = await supabase.from("meta_optimization_settings").select("*").eq("project_id", project_id).maybeSingle();
    const minRoas = Number(settings?.min_roas ?? 1.5);
    const minSpend = Number(settings?.min_spend ?? 50);

    const [{ data: campaigns }, { data: ads }] = await Promise.all([
      supabase.from("meta_campaigns").select("campaign_id,name,status,daily_budget,spend,revenue,roas,conversions").eq("project_id", project_id),
      supabase.from("meta_ads").select("ad_id,name,status,spend,revenue,roas,conversions").eq("project_id", project_id),
    ]);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a Meta Ads ROAS optimizer. Min ROAS target: ${minRoas}. Min spend before action: $${minSpend}.
Analyze and propose actions. Return JSON {summary, actions: [{kind, target_type, target_id, target_name, amount, reason}]} where kind is one of pause | increase_budget | decrease_budget. amount is the new daily budget in account currency (not cents) for budget changes.

Campaigns: ${JSON.stringify(campaigns)}
Ads: ${JSON.stringify(ads)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);
    const parsed = JSON.parse((await aiRes.json()).choices?.[0]?.message?.content || "{}");
    const actions = parsed.actions || [];

    let applied = 0;
    if (!dry_run) {
      for (const a of actions) {
        try {
          if (a.kind === "pause") {
            await fetch(`${META_API}/${a.target_id}`, { method: "POST", body: new URLSearchParams({ status: "PAUSED", access_token: token }) });
          } else if (a.kind === "increase_budget" || a.kind === "decrease_budget") {
            await fetch(`${META_API}/${a.target_id}`, { method: "POST", body: new URLSearchParams({ daily_budget: String(Math.round(Number(a.amount) * 100)), access_token: token }) });
          }
          applied++;
        } catch (e) { console.error("apply action failed", a, e); }
      }
    }

    await supabase.from("meta_optimization_runs").insert({
      project_id, dry_run, summary: parsed.summary || "", actions, applied_count: applied,
    });

    return new Response(JSON.stringify({ success: true, dry_run, actions, applied, summary: parsed.summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("optimize error", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
