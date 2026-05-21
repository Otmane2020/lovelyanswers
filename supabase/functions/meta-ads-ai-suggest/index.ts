import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TEXT_PROMPTS: Record<string, (ctx: any) => string> = {
  interests: (c) => `Suggest 4-6 Meta Ads interest targets (comma-separated, no quotes, no numbering) for ${c.brand} (${c.site}). Objective: ${c.objective}. Countries: ${c.countries}. Business: ${c.biz}. Return ONLY the list.`,
  headline: (c) => `Write ONE Meta Ads headline (max 40 chars, no quotes, no emoji) in ${c.lang} for ${c.brand} (${c.site}). Objective: ${c.objective}. Business: ${c.biz}. Return ONLY the headline.`,
  primary_text: (c) => `Write ONE Meta Ads primary text (90-125 chars, no quotes, can use 1 emoji max) in ${c.lang} for ${c.brand} (${c.site}). Objective: ${c.objective}. Business: ${c.biz}. Hook + benefit + CTA. Return ONLY the text.`,
  description: (c) => `Write ONE Meta Ads description line (max 30 chars, no quotes, no emoji) in ${c.lang} for ${c.brand}. Return ONLY the text.`,
};

const FULL_CAMPAIGN_TOOL = {
  type: "function",
  function: {
    name: "build_campaign",
    description: "Return a complete Meta Ads campaign plan",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name, max 60 chars" },
        objective: { type: "string", enum: ["OUTCOME_TRAFFIC","OUTCOME_SALES","OUTCOME_LEADS","OUTCOME_ENGAGEMENT","OUTCOME_AWARENESS"] },
        daily_budget: { type: "number", description: "Daily budget in account currency, 5-50" },
        countries: { type: "string", description: "ISO codes comma-separated" },
        age_min: { type: "integer", minimum: 18, maximum: 65 },
        age_max: { type: "integer", minimum: 18, maximum: 65 },
        interests: { type: "string", description: "4-6 interest topics, comma-separated" },
        headline: { type: "string", description: "Max 40 chars" },
        primary_text: { type: "string", description: "90-125 chars" },
        description: { type: "string", description: "Max 30 chars" },
        cta: { type: "string", enum: ["SIGN_UP","LEARN_MORE","SHOP_NOW","GET_OFFER","SUBSCRIBE","DOWNLOAD","CONTACT_US","BOOK_TRAVEL"] },
        image_prompt: { type: "string", description: "Detailed visual prompt for the ad image, photorealistic, no text overlay" },
      },
      required: ["name","objective","daily_budget","countries","age_min","age_max","interests","headline","primary_text","cta","image_prompt"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { project_id, field, objective, countries, current, image_prompt } = await req.json();
    if (!project_id || !field) {
      return new Response(JSON.stringify({ error: "project_id and field required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: gs } = await supabase.from("generation_settings")
      .select("brand_name, website_url, language, business_description")
      .eq("project_id", project_id).maybeSingle();

    const ctx = {
      brand: gs?.brand_name || "the brand",
      site: gs?.website_url || "",
      lang: gs?.language || "en",
      biz: gs?.business_description || "",
      objective: objective || "OUTCOME_TRAFFIC",
      countries: countries || "global",
    };

    // === IMAGE GENERATION ===
    if (field === "image") {
      const prompt = image_prompt || `Photorealistic lifestyle ad for ${ctx.brand} — ${ctx.biz}. Bright, professional, social-media optimized, 1:1 square composition, no text overlay.`;
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: `Image gen failed: ${t}` }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const j = await r.json();
      const imageUrl = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) return new Response(JSON.stringify({ error: "No image returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      // Persist to storage bucket so Meta can fetch a stable URL
      const b64 = imageUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const path = `${project_id}/ai-${Date.now()}.png`;
      const { error: upErr } = await supabase.storage.from("meta-creatives").upload(path, bytes, { contentType: "image/png", upsert: false });
      if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: pub } = supabase.storage.from("meta-creatives").getPublicUrl(path);
      return new Response(JSON.stringify({ image_url: pub.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === FULL CAMPAIGN (structured) ===
    if (field === "full_campaign") {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are an expert Meta Ads strategist. Build a high-performing campaign brief from the brand context." },
            { role: "user", content: `Build a complete Meta Ads campaign for ${ctx.brand} (${ctx.site}).\nLanguage for copy: ${ctx.lang}.\nBusiness: ${ctx.biz}.\nPick the best objective, audience, budget, creative copy and image prompt.` },
          ],
          tools: [FULL_CAMPAIGN_TOOL],
          tool_choice: { type: "function", function: { name: "build_campaign" } },
        }),
      });
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, retry shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!r.ok) {
        const t = await r.text();
        return new Response(JSON.stringify({ error: `AI: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const j = await r.json();
      const call = j.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) return new Response(JSON.stringify({ error: "No tool call" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const plan = JSON.parse(call.function.arguments);
      return new Response(JSON.stringify({ plan }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // === SINGLE TEXT FIELD ===
    const buildPrompt = TEXT_PROMPTS[field];
    if (!buildPrompt) return new Response(JSON.stringify({ error: "unknown field" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const prompt = buildPrompt(ctx);
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert Meta Ads copywriter. Output only the requested text, no preamble, no quotes, no markdown." },
          { role: "user", content: current ? `${prompt}\n\nImprove this previous attempt: ${current}` : prompt },
        ],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, retry shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) {
      const t = await r.text();
      return new Response(JSON.stringify({ error: `AI: ${t}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const j = await r.json();
    const text = (j.choices?.[0]?.message?.content || "").trim().replace(/^["']|["']$/g, "");
    return new Response(JSON.stringify({ text }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
