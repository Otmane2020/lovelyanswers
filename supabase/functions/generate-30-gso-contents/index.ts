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

    // Real business location for the local_aeo slots. Sourced from
    // local_businesses, which is populated from the Google Places / Business
    // Profile lookup (one row per project) and is the only place an actual
    // address, rating and category list exists. Without this the local_aeo
    // prompt had nothing concrete and was explicitly told to invent
    // plausible specifics — which is exactly what makes local answers
    // useless: a Local AEO piece that never names the real city or area.
    const { data: localBusiness } = await supabase
      .from("local_businesses")
      .select("place_id, name, address, phone, website, rating, review_count, types")
      .eq("project_id", projectId)
      .maybeSingle();

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
    const ALL_CONTENT_TYPES = ["geo", "seo", "aeo", "local_aeo", "shopping"] as const;
    type ContentType = typeof ALL_CONTENT_TYPES[number];
    // Local AEO only earns a slot once there's a real verified location to
    // ground it in (local_businesses, from the Google Business Profile
    // lookup) — without one it can only produce location-less "local"
    // content. Shopping always keeps its slot: with a catalog it enriches a
    // real product, without one it falls back to a sector buying guide, so
    // the editorial rotation stays varied either way.
    const CONTENT_TYPES = (localBusiness
      ? ALL_CONTENT_TYPES
      : ALL_CONTENT_TYPES.filter((t) => t !== "local_aeo")) as readonly ContentType[];
    console.log(
      "[generate-30-gso] Rotation: " + CONTENT_TYPES.join(" -> ") +
      (localBusiness ? " (location: " + (localBusiness.address || localBusiness.name) + ")" : " (no verified location — local_aeo skipped)")
    );
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
    const [{ data: schedArticles }, { data: schedAnswers }, { data: schedLocal }, { data: schedShop }] = await Promise.all([
      supabase.from("articles").select("scheduled_date").eq("project_id", projectId)
        .gte("scheduled_date", now.toISOString()).lt("scheduled_date", in30.toISOString()),
      supabase.from("answers").select("scheduled_date").eq("project_id", projectId)
        .gte("scheduled_date", now.toISOString()).lt("scheduled_date", in30.toISOString()),
      supabase.from("local_answers").select("scheduled_date").eq("project_id", projectId)
        .gte("scheduled_date", dayKey(now)).lt("scheduled_date", dayKey(in30)),
      supabase.from("shopping_planning").select("scheduled_date").eq("project_id", projectId)
        .gte("scheduled_date", dayKey(now)).lt("scheduled_date", dayKey(in30)),
    ]);

    const coveredDays = new Set<string>();
    for (const c of existingContents || []) coveredDays.add(dayKey(new Date(c.scheduled_date)));
    for (const r of schedArticles || []) if (r.scheduled_date) coveredDays.add(dayKey(new Date(r.scheduled_date)));
    for (const r of schedAnswers || []) if (r.scheduled_date) coveredDays.add(dayKey(new Date(r.scheduled_date)));
    for (const r of schedLocal || []) if (r.scheduled_date) coveredDays.add(dayKey(new Date(r.scheduled_date)));
    for (const r of schedShop || []) if (r.scheduled_date) coveredDays.add(dayKey(new Date(r.scheduled_date)));

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

    // Every type goes to the Edge Function actually built for its editorial
    // format — no shared prompt here, which was the bug that made all five
    // types come out SEO-shaped:
    //   geo       -> generate-geo-content   (long citation-ready, geo_contents)
    //   seo       -> generate-articles      (classic H2/H3 SEO, articles)
    //   aeo       -> generate-aeo-answers   (short direct Q&A, answers)
    //                + generate-aeo-article (matching AEO article, articles)
    //   local_aeo -> generate-local-answer  (location-grounded, local_answers)
    //   shopping  -> generate-product-ai    (product enrichment, shopping_products
    //                + shopping_planning), falling back to a sector buying
    //                guide when the catalog is empty so the rotation holds.
    async function callFn(name: string, payload: unknown) {
      const res = await fetch(supabaseUrl + "/functions/v1/" + name, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + serviceRoleKey },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.error) {
        throw new Error(name + " failed (" + res.status + "): " + JSON.stringify(json?.error ?? json).slice(0, 200));
      }
      return json;
    }

    for (let i = 0; i < toFillNow.length; i++) {
      const slot = toFillNow[i];
      const t = topics[i];
      const type = slot.type;
      const scheduledDateStr = slot.date.toISOString();
      const scheduledDay = scheduledDateStr.slice(0, 10);

      if (!t?.topic || existingTopics.has(t.topic.toLowerCase())) {
        skipped.push({ type, reason: !t?.topic ? "no topic returned" : "duplicate topic" });
        continue;
      }
      existingTopics.add(t.topic.toLowerCase());

      console.log("[generate-30-gso] Slot " + (i + 1) + "/" + toGenerate + " (" + type + ") -> " + t.topic.substring(0, 60));

      try {
        if (type === "geo") {
          const out = await callFn("generate-geo-content", {
            projectId, topic: t.topic, brand, website, language,
            contentType: "article", keywords: t.keywords || [],
            scheduledDate: scheduledDateStr,
          });
          created.push({ id: out?.data?.id || "", title: out?.data?.title || t.topic, type, scheduled_date: scheduledDateStr });

        } else if (type === "seo") {
          const kw = (t.keywords && t.keywords[0]) || t.topic;
          const out = await callFn("generate-articles", { projectId, keywords: [kw], language, count: 1 });
          const art = out?.articles?.[0];
          if (!art) { skipped.push({ type, reason: "generate-articles returned no article" }); continue; }
          await supabase.from("articles").update({ scheduled_date: scheduledDateStr }).eq("id", art.id);
          created.push({ id: art.id, title: art.title || t.topic, type, scheduled_date: scheduledDateStr });

        } else if (type === "aeo") {
          const ansOut = await callFn("generate-aeo-answers", {
            projectId, questions: [t.topic],
            targetPlatforms: ["chatgpt", "gemini", "claude"], language,
          });
          const ans = ansOut?.answers?.[0];
          if (!ans) { skipped.push({ type, reason: "generate-aeo-answers returned nothing (score gate)" }); continue; }
          await supabase.from("answers").update({ scheduled_date: scheduledDateStr }).eq("id", ans.id);
          try {
            const artOut = await callFn("generate-aeo-article", { answerId: ans.id, language });
            if (artOut?.article?.id) {
              await supabase.from("articles")
                .update({ scheduled_date: scheduledDateStr, status: "scheduled" })
                .eq("id", artOut.article.id);
            }
          } catch (e) {
            console.error("[generate-30-gso] AEO article failed (answer kept):", e);
          }
          created.push({ id: ans.id, title: t.topic, type, scheduled_date: scheduledDateStr });

        } else if (type === "local_aeo") {
          const out = await callFn("generate-local-answer", {
            projectId, question: t.topic,
            businessName: localBusiness?.name || brand,
            location: localBusiness?.address || "",
            businessContext: {
              rating: localBusiness?.rating,
              reviewCount: localBusiness?.review_count,
              types: localBusiness?.types,
              phone: localBusiness?.phone,
              website: localBusiness?.website || website,
            },
          });
          if (!out?.answer) { skipped.push({ type, reason: "generate-local-answer returned no answer" }); continue; }
          const { data: insLocal, error: localErr } = await supabase
            .from("local_answers")
            .insert({
              project_id: projectId,
              business_id: localBusiness?.place_id || projectId,
              business_name: localBusiness?.name || brand,
              question: t.topic,
              answer: out.answer,
              score: computeGsoScore(out.answer, brand),
              is_public: false,
              scheduled_date: scheduledDay,
              slug: slugify(t.topic) + "-" + Date.now().toString(36),
              language,
            })
            .select("id")
            .single();
          if (localErr) { skipped.push({ type, reason: localErr.message }); continue; }
          created.push({ id: insLocal.id, title: t.topic, type, scheduled_date: scheduledDateStr });

        } else {
          // shopping — reuse the existing catalog pipeline rather than
          // writing a parallel one: products come from parse-shopping-feed
          // (Google Shopping Feed URL) or a manual import, generate-product-ai
          // enriches them, shopping_planning schedules the day.
          let productId: string | null = null;

          // Prefer a product that has no AI content yet, so each shopping
          // slot moves the catalog forward instead of re-scheduling the same
          // already-enriched item.
          const { data: rawProduct } = await supabase
            .from("shopping_products").select("id")
            .eq("project_id", projectId).is("ai_title", null)
            .limit(1).maybeSingle();

          if (rawProduct) {
            await callFn("generate-product-ai", { productId: rawProduct.id, projectId, language });
            productId = rawProduct.id;
          } else {
            const { data: readyProduct } = await supabase
              .from("shopping_products").select("id")
              .eq("project_id", projectId).not("ai_title", "is", null)
              .limit(1).maybeSingle();
            productId = readyProduct?.id ?? null;
          }

          if (productId) {
            const { error: planErr } = await supabase.from("shopping_planning").insert({
              project_id: projectId,
              product_id: productId,
              scheduled_date: scheduledDay,
              published: false,
            });
            if (planErr) { skipped.push({ type, reason: planErr.message }); continue; }
            created.push({ id: productId, title: t.topic, type, scheduled_date: scheduledDateStr });
          } else {
            // No catalog at all (and no feed imported yet): fall back to a
            // sector-level buying guide / comparison so the shopping slot
            // still produces something useful and the rotation stays varied.
            const out = await callFn("generate-geo-content", {
              projectId, topic: t.topic, brand, website, language,
              contentType: "comparison", keywords: t.keywords || [],
              scheduledDate: scheduledDateStr,
            });
            created.push({ id: out?.data?.id || "", title: out?.data?.title || t.topic, type: "shopping_guide", scheduled_date: scheduledDateStr });
          }
        }
      } catch (err) {
        console.error("[generate-30-gso] Slot " + (i + 1) + " (" + type + ") failed:", err);
        skipped.push({ type, reason: err instanceof Error ? err.message : String(err) });
      }

      await new Promise((r) => setTimeout(r, 500));
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
