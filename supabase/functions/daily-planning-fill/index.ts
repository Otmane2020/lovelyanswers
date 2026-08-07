import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";
const INTENTS: IntentType[] = ["price", "criteria", "comparison", "howto", "best", "what", "why", "duration"];

/** One piece a day, cycling through five angles — day 0 GEO, day 1 SEO,
 * day 2 SEO, day 3 Local AEO, day 4 AEO Shopping, then repeat. */
const ROTATION = ["geo", "aeo", "seo", "local_aeo", "aeo_shopping"] as const;
type ContentAngle = typeof ROTATION[number];

const ANGLE_BRIEF: Record<ContentAngle, string> = {
  geo: "Generative Engine Optimization: a citation-ready piece that ChatGPT, Gemini and Perplexity can quote directly. Lead with the answer, keep claims factual and attributable.",
  seo: "Classic SEO piece: search-intent driven, structured with clear points, targeting the keyword's organic ranking.",
  aeo: "Answer Engine Optimization: a direct question-and-answer piece, one clear question answered in the first two sentences, then the supporting detail.",
  local_aeo: "Local AEO: answer the question as it would be asked about this specific area — mention the city/region, opening hours, delivery zone and other local specifics.",
  aeo_shopping: "AEO Shopping: answer a buying-decision question the way an AI assistant would when a shopper asks for a product recommendation — price range, what to look for, and why this business is a solid pick.",
};

/** Days since epoch — stable across timezones, so the cycle never skips or repeats a day. */
function angleForOffset(dayOffset: number): ContentAngle {
  const base = Math.floor(Date.now() / 86_400_000) + dayOffset;
  return ROTATION[base % ROTATION.length];
}

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
  avoidQuestions: string[] = []
): Promise<{ question: string; intent: IntentType }> {
  const currentYear = new Date().getFullYear();

  const keywordsInstruction = keywords.length > 0
    ? language === "fr"
      ? "\nMots-cles SEO du projet a UTILISER comme base pour la question:\n" + keywords.join(", ") + "\n\nTransforme l'un de ces mots-cles en question naturelle et decisionnelle."
      : "\nProject SEO keywords to USE as the basis for the question:\n" + keywords.join(", ") + "\n\nTransform one of these keywords into a natural, decision-oriented question."
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

  const userPrompt = "Business: " + brandName + "\nDescription: " + description + "\nDay number: " + dayNumber + angleInstruction + keywordsInstruction + avoidInstruction + "\n\nGenerate 1 unique COMPLETE QUESTION. Return JSON: {\"question\": \"...\", \"intent\": \"criteria|price|howto|comparison|why|best\"}";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        // Free models get rate-limited upstream constantly; OpenRouter falls back
        // through this list automatically when one errors out.
        models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free", "openai/gpt-oss-20b:free", "nvidia/nemotron-3-nano-30b-a3b:free"],
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

async function generateAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string
): Promise<{ answer: string; bullets: string[]; faq: { q: string; a: string }[] }> {
  const systemPrompt = language === "fr"
    ? "Tu es un expert AEO. Redige une reponse citation-first. Premiere phrase = reponse DIRECTE. Mention " + brandName + " UNE fois. 80-120 mots."
    : "You are an AEO expert. Write a citation-first answer. First sentence = DIRECT answer. Mention " + brandName + " ONCE. 80-120 words.";

  const userPrompt = "Question: " + question + "\nBrand: " + brandName + "\nDescription: " + description + "\nIntent: " + intent + "\n\nReturn JSON: {\"answer\": \"...\", \"bullets\": [], \"faq\": []}";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        // Free models get rate-limited upstream constantly; OpenRouter falls back
        // through this list automatically when one errors out.
        models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free", "openai/gpt-oss-20b:free", "nvidia/nemotron-3-nano-30b-a3b:free"],
        max_tokens: 4000,
        temperature: 0.3,
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
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("Failed to generate answer:", e);
    return {
      answer: language === "fr"
        ? brandName + " propose des solutions adaptees. Consultez les ressources disponibles."
        : brandName + " offers solutions tailored to your needs. See the resources below for details.",
      bullets: [],
      faq: [],
    };
  }
}

async function generateArticle(
  question: string,
  answer: string,
  brandName: string,
  language: string,
  apiKey: string,
  angleBrief: string = ""
): Promise<{ title: string; content: string; htmlContent: string; metaDescription: string; wordCount: number }> {
  const systemPrompt = language === "fr"
    ? "Tu rediges un article de blog SEO/AEO complet. Titre accrocheur. 800-1200 mots. Mentionner " + brandName + " 2-3 fois."
    : "Write a complete SEO/AEO blog article. Catchy title. 800-1200 words. Mention " + brandName + " 2-3 times.";

  const userPrompt = "Question: " + question + "\nAnswer: " + answer + "\nBrand: " + brandName +
    (angleBrief ? "\nAngle: " + angleBrief : "") +
    "\n\nReturn JSON: {\"title\": \"...\", \"content\": \"...\", \"metaDescription\": \"...\"}";

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemma-4-31b-it:free",
        // Free models get rate-limited upstream constantly; OpenRouter falls back
        // through this list automatically when one errors out.
        models: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3-super-120b-a12b:free", "openai/gpt-oss-20b:free", "nvidia/nemotron-3-nano-30b-a3b:free"],
        max_tokens: 4000,
        temperature: 0.5,
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

    let jsonStr = "";
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    else {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }

    if (!jsonStr) throw new Error("Invalid JSON");

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, " ");
      jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
      parsed = JSON.parse(jsonStr);
    }

    const articleContent = parsed.content || answer;
    const wordCount = articleContent.split(/\s+/).length;

    const htmlContent = articleContent
      .replace(/### (.*)/g, "<h3>$1</h3>")
      .replace(/## (.*)/g, "<h2>$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^/, "<p>")
      .replace(/$/, "</p>");

    return {
      title: parsed.title || question,
      content: articleContent,
      htmlContent,
      metaDescription: parsed.metaDescription || answer.substring(0, 155),
      wordCount,
    };
  } catch (e) {
    console.error("Failed to generate article:", e);
    return {
      title: question,
      content: answer,
      htmlContent: "<p>" + answer + "</p>",
      metaDescription: answer.substring(0, 155),
      wordCount: answer.split(/\s+/).length,
    };
  }
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      .select("id, name, language, brand_name, business_description")
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
      console.log("[daily-planning-fill] Found " + keywordList.length + " unused keywords for project " + project.name);

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

      let daysTouched = 0;
      let daysCompleted = 0;
      let stoppedEarly = false;

      // Ensure rows exist in planning for the whole window (31 days)
      for (let dayOffset = 0; dayOffset < days; dayOffset++) {
        const targetDate = new Date(today.getTime() + dayOffset * 86400000);
        const dateStr = targetDate.toISOString().split("T")[0];
        const angle = angleForOffset(dayOffset);

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

        // If already complete, skip
        if (planningRow.answer_id && planningRow.article_id) continue;

        // Stop early to avoid timeout
        if (daysTouched >= maxDaysToFill) {
          stoppedEarly = true;
          break;
        }

        daysTouched++;

        console.log("[daily-planning-fill] Filling day " + dateStr + " for " + project.name + "...");

        // 1) Ensure we have an answer
        let answerId = planningRow.answer_id as string | null;
        let answerQuestion = "";
        let answerText = "";

        if (answerId) {
          const { data: existingAnswer } = await supabase
            .from("answers")
            .select("id, question, answer")
            .eq("id", answerId)
            .single();
          if (existingAnswer) {
            answerQuestion = existingAnswer.question;
            answerText = existingAnswer.answer;
          } else {
            answerId = null;
          }
        }

        if (!answerId) {
          let q = await generateQuestion(brandName, description, language, apiKey, dayOffset, keywordList, ANGLE_BRIEF[angle], [...usedQuestions]);
          // One retry with a stronger nudge if it still landed on something
          // already used (small business + a static fallback template make
          // this the common case, not a rare one).
          if (usedQuestions.has(normalize(q.question))) {
            q = await generateQuestion(brandName, description, language, apiKey, dayOffset + 1000, keywordList, ANGLE_BRIEF[angle], [...usedQuestions]);
          }
          if (usedQuestions.has(normalize(q.question))) {
            console.log("[daily-planning-fill] Skipping day " + dateStr + " — still a duplicate after retry: " + q.question);
            continue;
          }
          usedQuestions.add(normalize(q.question));

          const answerData = await generateAnswer(q.question, brandName, description, q.intent, language, apiKey);
          const score = computeScore(answerData.answer, brandName);

          const { data: insertedAnswer, error: answerError } = await supabase
            .from("answers")
            .insert({
              project_id: project.id,
              question: q.question,
              answer: answerData.answer,
              slug: generateSlug(q.question),
              intent: q.intent,
              score,
              is_public: false,
              scheduled_date: targetDate.toISOString(),
              supporting_content: { bullets: answerData.bullets, faq: answerData.faq },
            })
            .select()
            .single();

          if (answerError || !insertedAnswer) {
            console.error("[daily-planning-fill] Error inserting answer:", answerError);
            continue;
          }

          answerId = insertedAnswer.id;
          answerQuestion = insertedAnswer.question;
          answerText = insertedAnswer.answer;

          await supabase
            .from("planning")
            .update({ answer_id: answerId })
            .eq("id", planningRow.id);
        }

        // 2) Ensure we have an article
        if (!planningRow.article_id) {
          try {
            const articleData = await generateArticle(answerQuestion, answerText, brandName, language, apiKey, ANGLE_BRIEF[angle]);
            const score = computeScore(answerText, brandName);

            const { data: insertedArticle, error: articleError } = await supabase
              .from("articles")
              .insert({
                project_id: project.id,
                linked_answer_id: answerId,
                title: articleData.title,
                content: articleData.content,
                html_content: articleData.htmlContent,
                meta_description: articleData.metaDescription,
                word_count: articleData.wordCount,
                slug: generateSlug(articleData.title),
                status: "scheduled",
                scheduled_date: targetDate.toISOString(),
                aeo_score: score,
              })
              .select()
              .single();

            if (articleError || !insertedArticle) {
              console.error("[daily-planning-fill] Error inserting article:", articleError);
              continue;
            }

            await supabase
              .from("answers")
              .update({ article_id: insertedArticle.id, has_article: true })
              .eq("id", answerId);

            await supabase
              .from("planning")
              .update({ article_id: insertedArticle.id })
              .eq("id", planningRow.id);

            daysCompleted++;
          } catch (err) {
            console.error("[daily-planning-fill] Error generating article for " + dateStr + ":", err);
          }
        }

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      results.push({ projectId: project.id, name: project.name, daysTouched, daysCompleted, stoppedEarly });
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
