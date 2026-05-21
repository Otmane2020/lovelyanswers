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

    const user_data: any = {};
    if (email) user_data.em = [await sha256(email)];
    if (phone) user_data.ph = [await sha256(phone.replace(/\D/g, ""))];
    if (ip) user_data.client_ip_address = ip;
    if (user_agent) user_data.client_user_agent = user_agent;
    if (fbp) user_data.fbp = fbp;
    if (fbc) user_data.fbc = fbc;

    const custom_data: any = {};
    if (value !== undefined) custom_data.value = value;
    if (currency) custom_data.currency = currency;
    if (content_ids.length) custom_data.content_ids = content_ids;
    if (content_type) custom_data.content_type = content_type;

    const event: any = {
      event_name, event_time: Math.floor(Date.now() / 1000),
      action_source: "website", user_data, custom_data,
    };
    if (event_id) event.event_id = event_id;
    if (event_source_url) event.event_source_url = event_source_url;

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
        project_id, pixel_id, event_name, event_id, event_source_url,
        user_data, custom_data,
        test_event: !!test_event_code,
        sent_at: new Date().toISOString(),
        response: data,
      });
    }

    if (data.error) throw new Error(data.error.message);
    return new Response(JSON.stringify({ success: true, response: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
