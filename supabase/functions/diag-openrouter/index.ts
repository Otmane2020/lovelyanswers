import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("OPENROUTER_API_KEY");
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const out: Record<string, unknown> = {
    hasOpenRouterKey: !!key,
    hasLovableKey: !!lovable,
  };

  if (key) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: "Return JSON {\"ok\":true}" }],
      }),
    });
    out.openrouterStatus = res.status;
    out.openrouterBody = (await res.text()).slice(0, 800);
  }

  if (lovable) {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + lovable, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: "Return JSON {\"ok\":true}" }],
      }),
    });
    out.lovableStatus = res.status;
    out.lovableBody = (await res.text()).slice(0, 500);
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
