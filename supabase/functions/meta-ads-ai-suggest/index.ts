import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Primary: Lovable AI Gateway. Fallback: OpenRouter free models when credits exhausted/rate-limited.
const LAI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const LAI_TEXT_MODEL = "google/gemini-2.5-flash";
const LAI_TOOL_MODEL = "google/gemini-2.5-flash";
const OR_URL = "https://openrouter.ai/api/v1/chat/completions";
const OR_FREE_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

async function callLovableAI(body: any) {
  const r = await fetch(LAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function callOpenRouter(body: any) {
  return await fetch(OR_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://autopilotgeo.com",
      "X-Title": "AdsFlow",
    },
    body: JSON.stringify(body),
  });
}

// Try Lovable AI first; on any error fall back to OpenRouter free model.
async function callAIWithFallback(body: any) {
  try {
    const r = await callLovableAI(body);
    if (r.ok) return r;
    const text = await r.clone().text();
    console.warn(`[meta-ads-ai-suggest] Lovable AI ${r.status}: ${text.slice(0, 200)} — falling back to OpenRouter`);
  } catch (e) {
    console.warn(`[meta-ads-ai-suggest] Lovable AI threw: ${e instanceof Error ? e.message : e} — falling back`);
  }
  const fallbackBody = { ...body, model: OR_FREE_MODEL };
  // OpenRouter free llama doesn't reliably support tool_choice; drop tools and ask for JSON.
  if (fallbackBody.tools) {
    delete fallbackBody.tools;
    delete fallbackBody.tool_choice;
    fallbackBody.response_format = { type: "json_object" };
  }
  return await callOpenRouter(fallbackBody);
}




const TEXT_PROMPTS: Record<string, (ctx: any) => string> = {
  interests: (c) => `You are a Meta Ads targeting strategist. Generate a HIGHLY SPECIALIZED audience for:

Brand: ${c.brand}
Website: ${c.site}
Business: ${c.biz}
Target audience profile: ${c.audience}
Business type: ${c.btype}
Competitors: ${c.competitors}
Language/market: ${c.lang}
Countries: ${c.countries}
Age range: ${c.age_min}-${c.age_max}
Campaign objective: ${c.objective}

Pick 6-10 NICHE Meta Ads interest targets that this exact buyer persona would follow on Facebook/Instagram. Mix:
- 2-3 direct category interests (what they buy)
- 2-3 lifestyle/behavior interests (how they live)
- 1-2 competitor brands or adjacent brands they follow
- 1-2 media/influencers/publications they consume

Rules:
- Use REAL interest names that exist in Meta Ads Manager (brands, publications, public figures, hobbies).
- No generic words like "shopping", "online", "internet".
- Comma-separated, no numbering, no quotes, no explanation.
Return ONLY the comma-separated list.`,
  headline: (c) => `Write ONE Meta Ads headline (max 40 chars, no quotes, no emoji) in ${c.lang} for ${c.brand} (${c.site}). Objective: ${c.objective}. Business: ${c.biz}. Audience: ${c.audience}. Return ONLY the headline.`,
  primary_text: (c) => `Write ONE Meta Ads primary text (90-125 chars, no quotes, can use 1 emoji max) in ${c.lang} for ${c.brand} (${c.site}). Objective: ${c.objective}. Business: ${c.biz}. Audience: ${c.audience}. Hook + benefit + CTA. Return ONLY the text.`,
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
    const { project_id, field, objective, countries, current, image_prompt, age_min, age_max } = await req.json();
    if (!project_id || !field) {
      return new Response(JSON.stringify({ error: "project_id and field required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const [{ data: gs }, { data: proj }] = await Promise.all([
      supabase.from("generation_settings")
        .select("brand_name, website_url, language, business_description, target_audiences, competitors, tone")
        .eq("project_id", project_id).maybeSingle(),
      supabase.from("projects")
        .select("brand_name, website_url, language, business_description, business_type, audience, competitors")
        .eq("id", project_id).maybeSingle(),
    ]);

    const competitorsArr = [
      ...(gs?.competitors || []),
      ...(proj?.competitors || []),
    ].filter(Boolean);
    const audienceStr = [
      proj?.audience,
      ...(gs?.target_audiences || []),
    ].filter(Boolean).join(" | ") || "general consumers";

    const ctx = {
      brand: gs?.brand_name || proj?.brand_name || "the brand",
      site: gs?.website_url || proj?.website_url || "",
      lang: gs?.language || proj?.language || "en",
      biz: gs?.business_description || proj?.business_description || "",
      btype: proj?.business_type || "",
      audience: audienceStr,
      competitors: competitorsArr.slice(0, 8).join(", ") || "none provided",
      tone: gs?.tone || "professional",
      objective: objective || "OUTCOME_TRAFFIC",
      countries: countries || "global",
      age_min: age_min ?? 25,
      age_max: age_max ?? 65,
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
      const r = await callAIWithFallback({
        model: LAI_TOOL_MODEL,
        messages: [
          { role: "system", content: "You are an expert Meta Ads strategist. Build a high-performing campaign brief from the brand context." },
          { role: "user", content: `Build a complete Meta Ads campaign for ${ctx.brand} (${ctx.site}).\nLanguage for copy: ${ctx.lang}.\nBusiness: ${ctx.biz}.\nAudience: ${ctx.audience}.\nCompetitors: ${ctx.competitors}.\nPick the best objective, audience, budget, creative copy and image prompt.` },
        ],
        tools: [FULL_CAMPAIGN_TOOL],
        tool_choice: { type: "function", function: { name: "build_campaign" } },
      });
      if (!r.ok) {
        const t = await r.text();
        console.error("[full_campaign] AI failed:", r.status, t);
        return new Response(JSON.stringify({ error: r.status === 429 ? "AI temporarily busy, please retry in a moment." : "AI service unavailable, please retry." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const j = await r.json();
      const call = j.choices?.[0]?.message?.tool_calls?.[0];
      let args: any;
      if (call) {
        args = typeof call.function.arguments === "string" ? JSON.parse(call.function.arguments) : call.function.arguments;
      } else {
        // Fallback path (OpenRouter without tools): parse JSON content
        const content = j.choices?.[0]?.message?.content || "";
        try { args = JSON.parse(content); } catch { 
          return new Response(JSON.stringify({ error: "No tool call" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      return new Response(JSON.stringify({ plan: args }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    }

    // === SINGLE TEXT FIELD ===
    const buildPrompt = TEXT_PROMPTS[field];
    if (!buildPrompt) return new Response(JSON.stringify({ error: "unknown field" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const prompt = buildPrompt(ctx);
    const r = await callAIWithFallback({
      model: LAI_TEXT_MODEL,
      messages: [
        { role: "system", content: "You are an expert Meta Ads copywriter. Output only the requested text, no preamble, no quotes, no markdown." },
        { role: "user", content: current ? `${prompt}\n\nImprove this previous attempt: ${current}` : prompt },
      ],
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("[text field] AI failed:", r.status, t);
      return new Response(JSON.stringify({ error: r.status === 429 ? "AI temporarily busy, please retry in a moment." : "AI service unavailable, please retry." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
