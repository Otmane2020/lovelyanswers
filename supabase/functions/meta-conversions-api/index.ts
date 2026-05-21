import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const META_API = "https://graph.facebook.com/v21.0";

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_ACCESS_TOKEN");
    if (!token) throw new Error("Meta credentials not configured");
    const {
      project_id, pixel_id, event_name, event_id, event_source_url,
      value, currency = "USD", content_ids = [], content_type,
      email, phone, ip, user_agent, fbp, fbc,
      test_event_code,
    } = await req.json();
    if (!pixel_id || !event_name) throw new Error("pixel_id and event_name required");

    // Fallbacks so Meta CAPI never rejects with "Invalid parameter"
    const reqUA = user_agent || req.headers.get("user-agent") || "Mozilla/5.0 (LovableCAPI)";
    const reqIP = ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "0.0.0.0";
    const srcUrl = event_source_url || "https://www.facebook.com/test";

    const user_data: any = {
      client_user_agent: reqUA,
      client_ip_address: reqIP,
    };
    if (email) user_data.em = [await sha256(email)];
    if (phone) user_data.ph = [await sha256(phone.replace(/\D/g, ""))];
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const custom_data: any = {};
    if (value !== undefined) custom_data.value = value;
    if (currency) custom_data.currency = currency;
    if (content_ids.length) custom_data.content_ids = content_ids;
    if (content_type) custom_data.content_type = content_type;

    const event: any = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_source_url: srcUrl,
      user_data,
      custom_data,
      event_id: event_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };

    const body: any = { data: [event] };
    if (test_event_code) body.test_event_code = test_event_code;

    const res = await fetch(`${META_API}/${pixel_id}/events?access_token=${token}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (project_id) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("meta_conversions_events").insert({
        project_id, pixel_id, event_name, event_id: event.event_id, event_source_url: srcUrl,
        user_data, custom_data,
        test_event: !!test_event_code,
        sent_at: new Date().toISOString(),
        response: data,
      });
    }

    if (data.error) {
      const msg = data.error.error_user_msg || data.error.message || "Meta CAPI error";
      return new Response(JSON.stringify({ error: msg, meta_error: data.error, sent: body }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, response: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
