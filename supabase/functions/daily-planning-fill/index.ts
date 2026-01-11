import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";
const INTENTS: IntentType[] = ["price", "criteria", "comparison", "howto", "best", "what", "why", "duration"];

function detectIntent(text: string): IntentType {
  const q = text.toLowerCase();
  if (/prix|tarif|cost|price|budget/.test(q)) return "price";
  if (/combien de temps|duration|how long|délai/.test(q)) return "duration";
  if (/crit[eè]re|condition|requirement|choisir/.test(q)) return "criteria";
  if (/vs|versus|compar|différence/.test(q)) return "comparison";
  if (/comment|how to|utiliser|éviter/.test(q)) return "howto";
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
  if (/\d+\s*(€|\$|%|euros?|mois|jours?)/i.test(answer)) score += 8;
  if (/crit[eè]re|choisir|éviter|erreur|condition/i.test(answer)) score += 8;
  if (/[:\-•]|\d\.\s/.test(answer)) score += 5;
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
  dayNumber: number
): Promise<{ question: string; intent: IntentType }> {
  const currentYear = new Date().getFullYear();
  
  const systemPrompt = language === "fr"
    ? `Tu génères UNE question DÉCISIONNELLE unique. La question DOIT finir par "?". INTERDIT de générer des mots-clés simples.`
    : `Generate ONE unique DECISION-ORIENTED question. The question MUST end with "?". FORBIDDEN to generate simple keywords.`;

  const userPrompt = `Business: ${brandName}\nDescription: ${description}\nDay number: ${dayNumber}\n\nGenerate 1 unique COMPLETE QUESTION. Return JSON: {"question": "...", "intent": "criteria|price|howto|comparison|why|best"}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
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
    return {
      question: language === "fr" 
        ? `Comment choisir ${brandName.toLowerCase()} adapté à ses besoins en ${currentYear} ?`
        : `How to choose ${brandName.toLowerCase()} suited to your needs in ${currentYear}?`,
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
    ? `Tu es un expert AEO. Rédige une réponse citation-first. Première phrase = réponse DIRECTE. Mention ${brandName} UNE fois. 80-120 mots.`
    : `You are an AEO expert. Write a citation-first answer. First sentence = DIRECT answer. Mention ${brandName} ONCE. 80-120 words.`;

  const userPrompt = `Question: ${question}\nBrand: ${brandName}\nDescription: ${description}\nIntent: ${intent}\n\nReturn JSON: {"answer": "...", "bullets": [], "faq": []}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Invalid JSON");
    return JSON.parse(match[0]);
  } catch (e) {
    console.error("Failed to generate answer:", e);
    return {
      answer: `${brandName} propose des solutions adaptées. Consultez les ressources disponibles.`,
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
  apiKey: string
): Promise<{ title: string; content: string; htmlContent: string; metaDescription: string; wordCount: number }> {
  const systemPrompt = language === "fr"
    ? `Tu rédiges un article de blog SEO/AEO complet. Titre accrocheur. 800-1200 mots. Mentionner ${brandName} 2-3 fois.`
    : `Write a complete SEO/AEO blog article. Catchy title. 800-1200 words. Mention ${brandName} 2-3 times.`;

  const userPrompt = `Question: ${question}\nAnswer: ${answer}\nBrand: ${brandName}\n\nReturn JSON: {"title": "...", "content": "...", "metaDescription": "..."}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.5,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    
    let jsonStr = "";
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    else {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }
    
    if (!jsonStr) throw new Error("Invalid JSON");
    
    const parsed = JSON.parse(jsonStr);
    const articleContent = parsed.content || answer;
    const wordCount = articleContent.split(/\s+/).length;

    let htmlContent = articleContent
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

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
      htmlContent: `<p>${answer}</p>`,
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

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    console.log("[daily-planning-fill] Starting daily planning fill...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, language, brand_name, business_description")
      .eq("is_active", true);

    if (projectsError) throw projectsError;

    console.log(`[daily-planning-fill] Found ${projects?.length || 0} active projects`);

    const results: { projectId: string; name: string; daysAdded: number }[] = [];

    for (const project of projects || []) {
      const brandName = project.brand_name || project.name;
      const description = project.business_description || "";
      const language = project.language || "fr";
      
      let daysAdded = 0;

      // Check next 30 days
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const targetDate = new Date(today.getTime() + dayOffset * 86400000);
        const dateStr = targetDate.toISOString().split('T')[0];

        // Check if this day already has a planning entry
        const { data: existingPlanning } = await supabase
          .from("planning")
          .select("id, answer_id, article_id")
          .eq("project_id", project.id)
          .eq("day", dateStr)
          .single();

        // Skip if both answer and article exist
        if (existingPlanning?.answer_id && existingPlanning?.article_id) {
          continue;
        }

        console.log(`[daily-planning-fill] Filling day ${dateStr} for ${project.name}...`);

        try {
          // Generate question
          const q = await generateQuestion(brandName, description, language, apiKey, dayOffset);
          
          // Generate answer
          const answerData = await generateAnswer(q.question, brandName, description, q.intent, language, apiKey);
          const score = computeScore(answerData.answer, brandName);

          // Insert answer
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

          if (answerError) {
            console.error(`Error inserting answer:`, answerError);
            continue;
          }

          // Generate article
          const articleData = await generateArticle(q.question, answerData.answer, brandName, language, apiKey);

          // Insert article
          const { data: insertedArticle, error: articleError } = await supabase
            .from("articles")
            .insert({
              project_id: project.id,
              linked_answer_id: insertedAnswer.id,
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

          if (articleError) {
            console.error(`Error inserting article:`, articleError);
            continue;
          }

          // Update answer with article reference
          await supabase
            .from("answers")
            .update({ article_id: insertedArticle.id, has_article: true })
            .eq("id", insertedAnswer.id);

          // Insert or update planning entry
          if (existingPlanning) {
            await supabase
              .from("planning")
              .update({
                answer_id: insertedAnswer.id,
                article_id: insertedArticle.id,
              })
              .eq("id", existingPlanning.id);
          } else {
            await supabase
              .from("planning")
              .insert({
                project_id: project.id,
                day: dateStr,
                answer_id: insertedAnswer.id,
                article_id: insertedArticle.id,
              });
          }

          daysAdded++;
          console.log(`[daily-planning-fill] Added content for ${dateStr}`);

          // Rate limit - pause between generations
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          console.error(`[daily-planning-fill] Error filling day ${dateStr}:`, err);
        }
      }

      results.push({
        projectId: project.id,
        name: project.name,
        daysAdded,
      });
    }

    console.log("[daily-planning-fill] Completed:", JSON.stringify(results));

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
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
