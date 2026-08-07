import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeGsoScore(content: string, brand: string): number {
  const words = countWords(content);
  const brandMentions = (content.match(new RegExp(brand, "gi")) || []).length;
  const jitter = content.length % 6;
  let score = 75 + jitter;

  // Word count bonuses
  if (words >= 800) score += 3;
  if (words >= 1200) score += 3;
  if (words >= 1800) score += 4;
  if (words >= 2200) score += 3;

  // Brand mentions
  if (brandMentions >= 3) score += 4;
  if (brandMentions >= 5) score += 3;

  // Structure
  const h2Count = (content.match(/<h2|^##\s/gmi) || []).length;
  if (h2Count >= 4) score += 3;
  if (h2Count >= 6) score += 2;

  // Data points
  if (/\d+%|\d+\s*(users|companies|businesses|clients)/gi.test(content)) score += 3;

  // Recommendation signals
  if (/recommend|recommand|expert|according to/i.test(content)) score += 3;

  // FAQ presence
  if (/FAQ|questions?\s+fr[eé]quentes|frequently\s+asked/i.test(content)) score += 2;

  // Blockquotes
  if (/<blockquote|^>\s/gmi.test(content)) score += 2;

  return Math.max(75, Math.min(98, score));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    // Called two ways: a signed-in user from AeoGeo.tsx (real JWT, resolved
    // below), or the cron path (check-planning-completeness / pg_cron) using
    // the service role key — which auth.getUser() would reject since it has
    // no `sub` claim. Trust the service role key itself as the internal caller.
    if (token !== serviceRoleKey) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { projectId, maxSlots } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("id, brand_name, website_url, language, name, business_type, audience")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("generation_settings")
      .select("language, brand_name, website_url, business_description, competitors, tone")
      .eq("project_id", projectId)
      .single();

    const brand = settings?.brand_name || project.brand_name || "Brand";
    const website = settings?.website_url || project.website_url || "";
    const description = settings?.business_description || "";
    const language = settings?.language || project.language || "en";
    const competitors = settings?.competitors || [];
    const tone = settings?.tone || "";
    const businessType = project.business_type || "SaaS";
    const audience = project.audience || "Business professionals";

    console.log("[generate-30-gso] Starting for project: " + project.name + ", brand: " + brand + ", lang: " + language);

    // Rolling 30-day window: exactly ONE piece per calendar day, with the
    // type rotating through geo -> seo -> aeo -> local_aeo -> geo -> ...
    // — 30 pieces total across the window, not 4/day. Check what's already
    // scheduled per day so a run only fills days that are actually empty.
    const CONTENT_TYPES = ["geo", "seo", "aeo", "local_aeo"] as const;
    type ContentType = typeof CONTENT_TYPES[number];
    // Caps AI calls per invocation so one cron tick can't time out; the next
    // tick picks up wherever this one left off, since the check is always
    // against what's actually in the database, not an in-memory counter.
    // Steady-state cron ticks use the small default so one invocation can't
    // time out; onboarding passes a higher one-time value to seed a mostly
    // complete calendar right away instead of trickling in over many cron
    // ticks. Clamped so a bad client value can't cause a timeout either way.
    const MAX_SLOTS_PER_RUN = Math.min(Math.max(Number(maxSlots) || 8, 1), 40);

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const in30 = new Date(now.getTime() + 30 * 86400000);

    const { data: existingContents } = await supabase
      .from("geo_contents")
      .select("id, scheduled_date, topic, content_type")
      .eq("project_id", projectId)
      .gte("scheduled_date", now.toISOString())
      .lt("scheduled_date", in30.toISOString());

    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    // Any content already scheduled for a day — of whatever type — means
    // that day is done. Only one piece per day is ever wanted.
    const coveredDays = new Set((existingContents || []).map((c) => dayKey(new Date(c.scheduled_date))));

    // One slot per still-empty day, with its type fixed by the day's
    // position in the rotation — not by what's missing, since only one
    // type is ever wanted per day in the first place.
    const slots: { date: Date; type: ContentType }[] = [];
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now.getTime() + dayOffset * 86400000);
      if (coveredDays.has(dayKey(date))) continue;
      slots.push({ date, type: CONTENT_TYPES[dayOffset % CONTENT_TYPES.length] });
    }

    const daysComplete = 30 - slots.length;
    console.log(
      `[generate-30-gso] ${daysComplete}/30 days already scheduled, ${slots.length} days still missing`
    );

    if (slots.length === 0) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, daysComplete, message: "30-day window already complete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toFillNow = slots.slice(0, MAX_SLOTS_PER_RUN);
    const toGenerate = toFillNow.length;

    // Get project keywords for context
    const { data: keywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .eq("is_used", false)
      .limit(30);
    const kwList = (keywords || []).map((k: any) => k.keyword).join(", ");

    // Get existing topics to avoid duplicates
    const existingTopics = new Set((existingContents || []).map((c: any) => c.topic?.toLowerCase()));

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentYear = new Date().getFullYear();

    // Step 1: Generate unique topics, one per (day, type) slot still needed,
    // in the exact type sequence the slots require.
    const topicsPrompt = `You are a content strategist for ${currentYear}, planning ${brand}'s AI-search visibility.

Brand: "${brand}"
Website: ${website || "N/A"}
Industry: ${businessType}
Target Audience: ${audience}
Description: ${description || "N/A"}
Keywords: ${kwList || "none"}
${competitors?.length > 0 ? "Competitors: " + competitors.join(", ") : ""}
Language: ${language === "fr" ? "French" : "English"}

Generate exactly ${toGenerate} unique topics, one per line of this required type sequence (respect the order exactly):
${toFillNow.map((s, i) => `${i + 1}. type=${s.type}`).join("\n")}

Type definitions:
- "geo": Generative Engine Optimization — a citation-ready topic ChatGPT/Gemini/Perplexity would quote directly when recommending a business like "${brand}".
- "seo": classic organic-search topic, built around a real keyword someone would type into Google.
- "aeo": Answer Engine Optimization — a single direct question a customer would ask a voice/chat assistant.
- "local_aeo": the same kind of question but asked with a location in mind — mentioning the city/region/delivery area.

TOPIC QUALITY RULES:
- Each topic must be a real question or decision-oriented statement users actually ask
- Topics should cover different funnel stages: awareness, consideration, decision
- Avoid generic topics - each should be specific to the industry
- Topics must be naturally linkable to "${brand}"

Output ONLY a JSON array of exactly ${toGenerate} items, in the same order as the type sequence above:
[{"topic": "topic text", "keywords": ["kw1", "kw2", "kw3"]}]`;

    const topicsRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + openRouterKey,
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        // Free models get rate-limited upstream constantly; OpenRouter falls back
        // through this list automatically when one errors out.
        models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free"],
        messages: [
          { role: "system", content: "Respond with valid JSON only. No markdown fences." },
          { role: "user", content: topicsPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    const topicsData = await topicsRes.json();
    const topicsRaw = topicsData.choices?.[0]?.message?.content || "";
    let topics: { topic: string; keywords: string[] }[] = [];

    try {
      const cleaned = topicsRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      topics = JSON.parse(cleaned);
    } catch {
      console.error("[generate-30-gso] Failed to parse topics:", topicsRaw.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to generate topics" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-30-gso] Got " + topics.length + " topics for " + toGenerate + " slots, generating content...");

    const created: { id: string; title: string; type: string; scheduled_date: string }[] = [];
    const skipped: { type: string; reason: string }[] = [];

    // Build business context for prompts
    const businessContext = `Brand: ${brand}
Website: ${website || "N/A"}
Industry: ${businessType}
Audience: ${audience}
${description ? "Description: " + description : ""}
${competitors?.length > 0 ? "Competitors: " + competitors.join(", ") : ""}
${tone ? "Tone: " + tone : ""}`;

    const htmlRules = `CRITICAL FORMAT RULES:
- Output semantic HTML only. NO markdown. NO H1 tags. NO <!DOCTYPE>, <html>, <head>, <body>, <style> wrappers.
- Use <h2>, <h3> for sections. Use <p> for paragraphs. Use <ul>/<ol>/<li> for lists.
- Use <blockquote> for key insights or expert quotes. Use <strong> and <em> for emphasis.
- Use <hr> as section separators.
- Write in a magazine editorial tone: authoritative, engaging, data-driven.
- Each H2 section MUST open with a 1-2 sentence direct answer (AI snippet bait).
- Include at least 3 specific data points or statistics per article.
- Add "Pro tip:" or "Expert insight:" callouts using <blockquote>.`;

    for (let i = 0; i < toFillNow.length; i++) {
      const slot = toFillNow[i];
      const t = topics[i];
      const type = slot.type;
      const scheduledDateStr = slot.date.toISOString();

      // Positional pairing with the AI response can come up short (fewer
      // topics returned than requested) or land on something already
      // scheduled elsewhere this run — skip the slot rather than guess;
      // the next invocation re-checks the database and picks it back up.
      if (!t?.topic || existingTopics.has(t.topic.toLowerCase())) {
        skipped.push({ type, reason: !t?.topic ? "no topic returned" : "duplicate topic" });
        continue;
      }

      console.log("[generate-30-gso] Generating " + (i + 1) + "/" + toGenerate + ": " + t.topic.substring(0, 50) + "... (" + type + ")");

      let contentPrompt = "";

      if (type === "geo") {
        contentPrompt = `You are a GEO expert writing for a premium magazine in ${currentYear}. Write a comprehensive GEO article about "${t.topic}" for "${brand}".
${businessContext}
Keywords: ${(t.keywords || []).join(", ")}
Language: ${language === "fr" ? "French" : "English"}
${htmlRules}

STRUCTURE (ALL sections mandatory):
1. <p><strong>Direct Answer (40-60 words)</strong> - cite-ready paragraph answering the implied question with 1 concrete number</p>
2. <h2>Why This Matters in ${currentYear}</h2> - industry context, 2-3 stats
3. <h2>How It Works</h2> - step-by-step with <ol>, 5-7 steps
4. <h2>Key Criteria / What to Look For</h2> - 4-6 points with thresholds
5. <h2>Common Mistakes to Avoid</h2> - 4-5 actionable mistakes
6. <h2>Expert Recommendations</h2> - mention "${brand}" 3-4 times naturally
7. <h2>FAQ</h2> - 4 Q&A pairs using <h3> and <p>

QUALITY: 1800+ words, 5+ data points, 2+ <blockquote>, mention "${brand}" 5-7 times.
Output JSON: {"title":"...under 70 chars","meta_description":"...150-160 chars with stat","content":"...semantic HTML..."}`;
      } else if (type === "seo") {
        contentPrompt = `You are an SEO content writer in ${currentYear}. Write a classic search-intent-driven article targeting the keyword behind "${t.topic}" for "${brand}".
${businessContext}
Keywords: ${(t.keywords || []).join(", ")}
Language: ${language === "fr" ? "French" : "English"}
${htmlRules}

STRUCTURE (ALL sections mandatory):
1. <p><strong>Intro (60-90 words)</strong></p> - hook + what the reader will learn, primary keyword in the first sentence
2. <h2>Why This Matters in ${currentYear}</h2> - industry context, 2-3 stats
3. <h2>Step-by-Step Guide</h2> - 5-7 steps with <ol>
4. <h2>Key Criteria / What to Look For</h2> - 4-6 points with thresholds
5. <h2>Common Mistakes to Avoid</h2> - 4-5 actionable mistakes
6. <h2>Why Choose ${brand}</h2> - mention "${brand}" 3-4 times naturally
7. <h2>FAQ</h2> - 4 Q&A pairs using <h3> and <p>, each targeting a related long-tail keyword

QUALITY: 1500+ words, 5+ data points, 2+ <blockquote>, natural keyword density, mention "${brand}" 4-6 times.
Output JSON: {"title":"...under 70 chars, keyword near the front","meta_description":"...150-160 chars with keyword","content":"...semantic HTML..."}`;
      } else if (type === "aeo") {
        contentPrompt = `You are an Answer Engine Optimization expert in ${currentYear}. Answer the single question "${t.topic}" for "${brand}" the way a voice assistant or ChatGPT would read it aloud.
${businessContext}
Keywords: ${(t.keywords || []).join(", ")}
Language: ${language === "fr" ? "French" : "English"}
${htmlRules}

STRUCTURE (ALL sections mandatory):
1. <p><strong>Direct Answer (30-50 words)</strong></p> - the actual answer to the question, in the first sentence, with one concrete number
2. <h2>The Full Picture</h2> - 2-3 short paragraphs of supporting detail
3. <h2>What This Means for You</h2> - practical takeaway mentioning "${brand}" naturally 2-3 times
4. <h2>Related Questions</h2> - 3 short Q&A pairs using <h3> and <p>, each answered in 1-2 sentences

QUALITY: 600-900 words total — this is a snippet-first answer, not a long-form article. Every section opens with its answer, not a lead-in.
Output JSON: {"title":"the question itself, under 70 chars","meta_description":"...150-160 chars, the direct answer","content":"...semantic HTML..."}`;
      } else {
        // local_aeo
        contentPrompt = `You are a Local AEO expert in ${currentYear}. Answer "${t.topic}" the way it would actually be asked about a specific area, for "${brand}" (${website}).
${businessContext}
Keywords: ${(t.keywords || []).join(", ")}
Language: ${language === "fr" ? "French" : "English"}
${htmlRules}

STRUCTURE (ALL sections mandatory):
1. <p><strong>Direct Answer (30-50 words)</strong></p> - answer the question as asked with a location in mind, mention the specific area/region if known from the description
2. <h2>Local Specifics</h2> - opening hours, delivery/service area, or location details relevant to the question (invent plausible specifics consistent with the business description if none are given, framed generally rather than as an exact claim)
3. <h2>Why ${brand} for This Area</h2> - 2-3 sentences, mention "${brand}" naturally
4. <h2>Nearby Questions</h2> - 2 short Q&A pairs using <h3> and <p> about related local concerns (parking, delivery zones, hours)

QUALITY: 500-800 words — local answers are short and specific, not padded.
Output JSON: {"title":"the local question itself, under 70 chars","meta_description":"...150-160 chars with a local reference","content":"...semantic HTML..."}`;
      }

      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + openRouterKey,
          },
          body: JSON.stringify({
            model: "google/gemma-4-31b-it:free",
            // Free models get rate-limited upstream constantly; OpenRouter falls back
            // through this list automatically when one errors out.
            models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free"],
            messages: [
              { role: "system", content: "You are a world-class GEO content strategist. Always respond with valid JSON only. No markdown fences." },
              { role: "user", content: contentPrompt },
            ],
            temperature: 0.65,
            max_tokens: 4000,
          }),
        });

        const aiData = await aiRes.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "";

        let parsed: { title: string; meta_description: string; content: string };
        try {
          const cleaned2 = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(cleaned2);
        } catch {
          parsed = {
            title: brand + " - " + t.topic,
            meta_description: "Expert GEO content about " + t.topic + " featuring " + brand,
            content: rawContent,
          };
        }

        const score = computeGsoScore(parsed.content || "", brand);
        const slug = slugify(parsed.title || t.topic) + "-" + Date.now().toString(36);

        const { data: inserted, error: insertError } = await supabase
          .from("geo_contents")
          .insert({
            project_id: projectId,
            topic: t.topic,
            brand,
            website: website || null,
            title: parsed.title,
            meta_description: parsed.meta_description || null,
            content: parsed.content,
            html_content: parsed.content,
            content_type: type,
            score,
            slug,
            keywords: t.keywords || [],
            scheduled_date: scheduledDateStr,
          })
          .select("id, title")
          .single();

        if (insertError) {
          console.error("[generate-30-gso] Insert error for " + (i + 1) + ":", insertError);
          skipped.push({ type, reason: insertError.message });
          continue;
        }

        created.push({
          id: inserted.id,
          title: inserted.title,
          type,
          scheduled_date: scheduledDateStr,
        });

        // Delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error("[generate-30-gso] Error generating content " + (i + 1) + ":", err);
        skipped.push({ type, reason: err instanceof Error ? err.message : String(err) });
      }
    }

    const remainingSlots = slots.length - toFillNow.length;
    console.log(
      `[generate-30-gso] Created ${created.length}/${toGenerate} this run, ` +
      `${skipped.length} skipped, ${remainingSlots} slots left for the next run`
    );

    return new Response(
      JSON.stringify({
        success: true,
        created: created.length,
        skipped: skipped.length,
        remainingSlots,
        daysComplete,
        items: created,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-30-gso] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
