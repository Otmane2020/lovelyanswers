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
    const { project_id, name, source_audience_id, country = "US", ratio = 0.01 } = await req.json();
    if (!project_id || !name || !source_audience_id) throw new Error("project_id, name, source_audience_id required");

    const params = new URLSearchParams({
      name, subtype: "LOOKALIKE", origin_audience_id: source_audience_id,
      lookalike_spec: JSON.stringify({ country, ratio, type: "similarity" }),
      access_token: token,
    });
    const res = await fetch(`${META_API}/${adAccountId}/customaudiences`, { method: "POST", body: params });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("meta_audiences").insert({
      project_id, audience_id: data.id, name, type: "LOOKALIKE",
      subtype: "LOOKALIKE", source_audience_id, rule: { country, ratio },
    });
    return new Response(JSON.stringify({ success: true, audience: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
