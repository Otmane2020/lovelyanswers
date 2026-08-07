import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";
const INTENTS: IntentType[] = ["price", "criteria", "comparison", "howto", "best", "what", "why", "duration"];

/**
 * This function owns ONE track: the AEO answer+article pairs stored in
 * `answers`/`articles` and indexed by the `planning` table (whose only
 * content columns are answer_id and article_id — it cannot reference
 * anything else).
 *
 * It deliberately has NO content-type rotation of its own. The 30-day
 * GEO -> SEO -> AEO -> Local AEO calendar is owned by
 * generate-30-gso-contents (one piece per calendar day, type =
 * CONTENT_TYPES[dayOffset % n], stored in geo_contents.content_type with
 * its own scheduled_date), driven hourly by check-planning-completeness.
 * A second rotation here produced a competing calendar writing different
 * content on the same days — which is why the two never lined up.
 */
const AEO_BRIEF =
  "Answer Engine Optimization: a direct question-and-answer piece, one clear question answered in the first two sentences, then the supporting detail.";

function detectIntent(text: string): IntentType {
  const q = text.toLowerCase();
  if (/prix|tarif|cost|price|budget/.test(q)) return "price";
  if (/combien de temps|duration|how long|d\u00e9lai/.test(q)) return "duration";
  if (/crit[e\u00e8]re|condition|requirement|choisir/.test(q)) return "criteria";
  if (/vs|versus|compar|diff\u00e9rence/.test(q)) return "comparison";
  if (/comment|how to|utiliser|\u00e9viter/.test(q)) return "howto";
  if (/meilleur|best/.test(q)) return "best";
  if (/pourquoi|why/.test(q)) return "why";
  return "what";
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeScore(answer: string, brand: string): number {
  let score = 65;
  const currentYear = new Date().getFullYear();
  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) score += 10;
  if (/\d+\s*(\u20ac|\$|%|euros?|mois|jours?)/i.test(answer)) score += 8;
  if (/crit[e\u00e8]re|choisir|\u00e9viter|erreur|condition/i.test(answer)) score += 8;
  if (/[:\-\u2022]|\d\.\s/.test(answer)) score += 5;
  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 4;
  return Math.min(98, Math.max(50, score));
}

function ensureQuestionMark(text: string): string {
  const trimmed = text.trim();
  if (trimmed.endsWith("?")) return trimmed;
  return trimmed.replace(/[.!,;:]$/, "") + " ?";
}

async function generateQuestion(
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
  dayNumber: number,
  keywords: string[] = [],
  angleBrief: string = "",
  avoidQuestions: string[] = [],
  competitors: string[] = []
): Promise<{ question: string; intent: IntentType }> {
  const currentYear = new Date().getFullYear();

  const keywordsInstruction = keywords.length > 0
    ? language === "fr"
      ? "\nMots-cles SEO du projet a UTILISER comme base pour la question:\n" + keywords.join(", ") + "\n\nTransforme l'un de ces mots-cles en question naturelle et decisionnelle."
      : "\nProject SEO keywords to USE as the basis for the question:\n" + keywords.join(", ") + "\n\nTransform one of these keywords into a natural, decision-oriented question."
    : "";

  const competitorsInstruction = competitors.length > 0
    ? language === "fr"
      ? "\nConcurrents connus: " + competitors.join(", ") + ". La question peut porter sur un choix entre " + brandName + " et l'un d'eux, sans jamais favoriser le concurrent."
      : "\nKnown competitors: " + competitors.join(", ") + ". The question may be about choosing between " + brandName + " and one of them, never favoring the competitor."
    : "";

  const avoidInstruction = avoidQuestions.length > 0
    ? (language === "fr"
        ? "\nQuestions DEJA utilisees, INTERDIT de repeter ou reformuler ces sujets:\n- " + avoidQuestions.slice(0, 25).join("\n- ")
        : "\nQuestions ALREADY used — FORBIDDEN to repeat or rephrase these topics:\n- " + avoidQuestions.slice(0, 25).join("\n- "))
    : "";

  const systemPrompt = language === "fr"
    ? "Tu generes UNE question DECISIONNELLE unique. La question DOIT finir par \"?\". INTERDIT de generer des mots-cles simples."
    : "Generate ONE unique DECISION-ORIENTED question. The question MUST end with \"?\". FORBIDDEN to generate simple keywords.";

  const angleInstruction = angleBrief ? "\nAngle for today: " + angleBrief : "";

  const userPrompt = "Business: " + brandName + "\nDescription: " + description + "\nDay number: " + dayNumber + angleInstruction + keywordsInstruction + competitorsInstruction + avoidInstruction + "\n\nGenerate 1 unique COMPLETE QUESTION. Return JSON: {\"question\": \"...\", \"intent\": \"criteria|price|howto|comparison|why|best\"}";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      // A single stalled free-model call must not eat the whole request's
      // 150s budget — 3 of these run sequentially per day filled.
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        // Free models get rate-limited upstream constantly; OpenRouter falls back
        // through this list automatically when one errors out.
        models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free"],
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    if (!res.ok || json?.error) {
      // Surface the provider's own message (quota exhausted, bad key, model
      // unavailable) instead of the useless generic "Invalid JSON" that this
      // used to throw once content came back empty.
      throw new Error("AI provider error " + res.status + ": " + JSON.stringify(json?.error ?? json).slice(0, 300));
    }
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON");

    const parsed = JSON.parse(match[0]);
    return {
      question: ensureQuestionMark(parsed.question),
      intent: INTENTS.includes(parsed.intent) ? parsed.intent : detectIntent(parsed.question),
    };
  } catch (e) {
    console.error("Failed to generate question:", e);
    // A single static fallback meant every OpenRouter failure produced the
    // exact same question — with real outages that's not a rare edge case,
    // it silently filled the whole pipeline with duplicates. Rotate through
    // a handful of templates instead so a string of failures still varies.
    const name = brandName.toLowerCase();
    const templatesFr = [
      "Quels criteres verifier avant de choisir " + name + " ?",
      "Pourquoi choisir " + name + " plutot qu'une alternative ?",
      "Quelles erreurs eviter avec " + name + " ?",
      "Quel budget prevoir pour " + name + " ?",
      "Comment choisir " + name + " adapte a ses besoins en " + currentYear + " ?",
    ];
    const templatesEn = [
      "What criteria to check before choosing " + name + "?",
      "Why choose " + name + " over alternatives?",
      "What mistakes to avoid with " + name + "?",
      "What budget to expect for " + name + "?",
      "How to choose " + name + " suited to your needs in " + currentYear + "?",
    ];
    const templates = language === "fr" ? templatesFr : templatesEn;
    return {
      question: templates[Math.abs(dayNumber) % templates.length],
      intent: "criteria",
    };
  }
}

/**
 * Every content type is produced by the project's own dedicated Edge
 * Function — generate-articles (SEO), generate-aeo-answers +
 * generate-aeo-article (AEO), generate-local-answer (Local AEO) — not a
 * generic prompt here. Each has a different editorial format (SEO: long
 * structured article with H2/H3 and meta description; AEO: short direct
 * Q&A; Local AEO: location-grounded answer), which is exactly why a single
 * shared generator was wrong. This function's own job is orchestration:
 * pick the day's angle, hand it to the right specialist, and record the
 * result in `planning`.
 *
 * They're normally user-triggered (real JWT + ownership check) — invoked
 * here with the service role key instead, which each one now recognizes
 * (see the isServiceRole checks added to generate-aeo-answers,
 * generate-aeo-article and generate-local-answer).
 */
async function callFn(supabase: any, serviceRoleKey: string, name: string, payload: unknown) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
    headers: { Authorization: "Bearer " + serviceRoleKey },
  });
  if (error) throw new Error(name + " failed: " + error.message);
  if (data?.error) throw new Error(name + " failed: " + data.error);
  return data;
}

/**
 * CRON JOB: Daily Planning Fill
 * Runs daily at 6 AM UTC
 * For each active project:
 * 1. Check the next 30 days in the planning table
 * 2. For each day missing content, generate 1 answer + 1 article
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const {
      projectId,
      days = 31,
      maxDaysToFill = 3,
    } = body ?? {};

    console.log("[daily-planning-fill] Starting daily planning fill...", {
      projectId,
      days,
      maxDaysToFill,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const projectsQuery = supabase
      .from("projects")
      .select("id, name, language, brand_name, business_description, competitors")
      .eq("is_active", true);

    const { data: projects, error: projectsError } = projectId
      ? await projectsQuery.eq("id", projectId)
      : await projectsQuery;

    if (projectsError) throw projectsError;

    console.log("[daily-planning-fill] Found " + (projects?.length || 0) + " active projects");

    const results: {
      projectId: string;
      name: string;
      daysTouched: number;
      daysCompleted: number;
      stoppedEarly: boolean;
      shoppingProductEnriched: string | null;
    }[] = [];

    for (const project of projects || []) {
      const brandName = project.brand_name || project.name;
      const description = project.business_description || "";
      // Never default to French — project.language should already reflect
      // the site's real detected language from onboarding. Defaulting to
      // "fr" here silently generated French content for non-French sites
      // whenever this column was empty.
      const language = project.language || "en";

      const { data: projectKeywords } = await supabase
        .from("keywords")
        .select("keyword")
        .eq("project_id", project.id)
        .eq("is_used", false)
        .limit(30);

      const keywordList = (projectKeywords || []).map((k: any) => k.keyword);
      const competitorList: string[] = Array.isArray(project.competitors) ? project.competitors.slice(0, 3) : [];
      console.log("[daily-planning-fill] Found " + keywordList.length + " unused keywords, " + competitorList.length + " competitors for project " + project.name);

      // Every existing question for this project, so a new one is never a
      // near-duplicate of one already sitting in the pipeline. Without this,
      // a weak prompt signal (just "day number" + a repeating 5-angle brief)
      // regenerates the same handful of topics over and over.
      const { data: existingAnswers } = await supabase
        .from("answers")
        .select("question")
        .eq("project_id", project.id)
        .limit(500);
      const normalize = (q: string) => q.toLowerCase().replace(/[?!.,]/g, "").trim();
      const usedQuestions = new Set<string>((existingAnswers || []).map((a: any) => normalize(a.question || "")));

      // Shopping content is only meaningful with a real catalog behind it.
      const { count: productCount } = await supabase
        .from("shopping_products")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      const hasProducts = (productCount || 0) > 0;

      // Shopping isn't day-rotated — it enriches whatever product in the
      // catalog hasn't been touched yet, via generate-product-ai, the
      // function actually built for it (titles/descriptions/FAQ per
      // product, not a themed article). One per run keeps this inside the
      // time budget alongside the day-planning work below.
      let shoppingProductEnriched: string | null = null;
      if (hasProducts) {
        const { data: nextProduct } = await supabase
          .from("shopping_products")
          .select("id")
          .eq("project_id", project.id)
          .eq("status", "imported")
          .limit(1)
          .maybeSingle();
        if (nextProduct) {
          try {
            await callFn(supabase, serviceRoleKey, "generate-product-ai", {
              productId: nextProduct.id,
              projectId: project.id,
              language,
            });
            shoppingProductEnriched = nextProduct.id;
            console.log("[daily-planning-fill] Enriched shopping product " + nextProduct.id + " for " + project.name);
          } catch (e) {
            console.error("[daily-planning-fill] Shopping enrichment failed for " + project.name + ":", e);
          }
        }
      }

      let daysTouched = 0;
      let daysCompleted = 0;
      let stoppedEarly = false;

      // Ensure rows exist in planning for the whole window (31 days)
      for (let dayOffset = 0; dayOffset < days; dayOffset++) {
        const targetDate = new Date(today.getTime() + dayOffset * 86400000);
        const dateStr = targetDate.toISOString().split("T")[0];
        await supabase
          .from("planning")
          .upsert(
            { project_id: project.id, day: dateStr },
            { onConflict: "project_id,day", ignoreDuplicates: true }
          );

        const { data: planningRow } = await supabase
          .from("planning")
          .select("id, answer_id, article_id")
          .eq("project_id", project.id)
          .eq("day", dateStr)
          .single();

        if (!planningRow) continue;

        // A day counts as covered once it has EITHER piece — not every
        // specialist produces both (generate-local-answer returns only an
        // answer; a failed article call shouldn't re-trigger the answer
        // half too). Requiring both meant angles that only fill one side
        // got re-attempted forever.
        if (planningRow.answer_id || planningRow.article_id) continue;

        // Stop early to avoid timeout
        if (daysTouched >= maxDaysToFill) {
          stoppedEarly = true;
          break;
        }

        daysTouched++;

        console.log("[daily-planning-fill] Filling day " + dateStr + " (aeo) for " + project.name + "...");

        try {
          let answerId: string | null = null;
          let articleId: string | null = null;

          // AEO only: a direct question -> citation-first answer
          // (generate-aeo-answers) -> matching AEO article
          // (generate-aeo-article). SEO / GEO / Local AEO are NOT produced
          // here — they belong to the 30-day calendar owned by
          // generate-30-gso-contents, which already rotates those types.
          let q = await generateQuestion(brandName, description, language, apiKey, dayOffset, keywordList, AEO_BRIEF, [...usedQuestions], competitorList);
          if (usedQuestions.has(normalize(q.question))) {
            q = await generateQuestion(brandName, description, language, apiKey, dayOffset + 1000, keywordList, AEO_BRIEF, [...usedQuestions], competitorList);
          }
          if (usedQuestions.has(normalize(q.question))) {
            console.log('[daily-planning-fill] Skipping day ' + dateStr + ' — still a duplicate after retry: ' + q.question);
            continue;
          }
          usedQuestions.add(normalize(q.question));

          const answerData = await callFn(supabase, serviceRoleKey, 'generate-aeo-answers', {
            projectId: project.id,
            questions: [q.question],
            targetPlatforms: ['chatgpt', 'gemini', 'claude'],
            language,
          });
          const createdAnswer = answerData?.answers?.[0];
          if (!createdAnswer) {
            console.log('[daily-planning-fill] generate-aeo-answers produced nothing for ' + dateStr + ' (likely scored too low) — leaving for a future run');
            continue;
          }
          answerId = createdAnswer.id;
          await supabase.from('planning').update({ answer_id: answerId }).eq('id', planningRow.id);
          await supabase.from('answers').update({ scheduled_date: targetDate.toISOString() }).eq('id', answerId);

          const articleData = await callFn(supabase, serviceRoleKey, 'generate-aeo-article', { answerId, language });
          if (articleData?.article?.id) {
            articleId = articleData.article.id;
            await supabase.from('articles').update({ scheduled_date: targetDate.toISOString(), status: 'scheduled' }).eq('id', articleId);
            await supabase.from('planning').update({ article_id: articleId }).eq('id', planningRow.id);
          }

          if (answerId || articleId) daysCompleted++;
        } catch (err) {
          console.error("[daily-planning-fill] Error filling " + dateStr + " (aeo):", err);
        }

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      results.push({ projectId: project.id, name: project.name, daysTouched, daysCompleted, stoppedEarly, shoppingProductEnriched });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[daily-planning-fill] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
