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
    const url = new URL(req.url);
    const q = url.searchParams.get("q") || "";
    if (q.length < 2) return new Response(JSON.stringify({ data: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const res = await fetch(`${META_API}/search?type=adinterest&q=${encodeURIComponent(q)}&limit=15&access_token=${token}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return new Response(JSON.stringify({ data: data.data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message, data: [] }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
