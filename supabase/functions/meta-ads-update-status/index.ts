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
    if (!token) throw new Error("Meta credentials not configured");
    const { id, status } = await req.json();
    if (!id || !status) throw new Error("id and status required");
    if (!["ACTIVE", "PAUSED", "DELETED"].includes(status)) throw new Error("Invalid status");

    const params = new URLSearchParams({ status, access_token: token });
    const res = await fetch(`${META_API}/${id}`, { method: "POST", body: params });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
