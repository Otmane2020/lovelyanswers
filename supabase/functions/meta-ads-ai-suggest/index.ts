import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { project_id, field, objective, countries, current } = await req.json();
    if (!project_id || !field) {
      return new Response(JSON.stringify({ error: "project_id and field required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: gs } = await supabase.from("generation_settings")
      .select("brand_name, website_url, language, business_description")
      .eq("project_id", project_id).maybeSingle();

    const brand = gs?.brand_name || "the brand";
    const site = gs?.website_url || "";
    const lang = gs?.language || "en";
    const biz = gs?.business_description || "";

    const fieldPrompts: Record<string, string> = {
      interests: `Suggest 4-6 Meta Ads interest targets (free text, comma-separated, no quotes, no numbering) for ${brand} (${site}). Objective: ${objective || "traffic"}. Countries: ${countries || "global"}. Business: ${biz}. Return ONLY the comma-separated list, nothing else.`,
      headline: `Write ONE Meta Ads headline (max 40 chars, no quotes, no emoji) in ${lang} for ${brand} (${site}). Objective: ${objective || "traffic"}. Business: ${biz}. Return ONLY the headline.`,
      primary_text: `Write ONE Meta Ads primary text (90-125 chars, no quotes, plain text, can use 1 emoji max) in ${lang} for ${brand} (${site}). Objective: ${objective || "traffic"}. Business: ${biz}. Hook + benefit + CTA. Return ONLY the text.`,
      description: `Write ONE Meta Ads description line (max 30 chars, no quotes, no emoji) in ${lang} for ${brand}. Objective: ${objective || "traffic"}. Return ONLY the text.`,
    };
    const prompt = fieldPrompts[field];
    if (!prompt) return new Response(JSON.stringify({ error: "unknown field" }), { status: 400, headers: corsHeaders });

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert Meta Ads copywriter. Output only the requested text, no preamble, no quotes, no markdown." },
          { role: "user", content: current ? `${prompt}\n\nRewrite/improve this previous attempt: ${current}` : prompt },
        ],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, retry shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await r.json();
    let text = (json.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
