import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =========================
   CORS
========================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* =========================
   TYPES
========================= */
type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";

type Platform = "chatgpt" | "gemini" | "claude" | "perplexity" | "copilot";

/* =========================
   SCORING (REAL AEO)
========================= */
function computeCitationScore(answer: string): number {
  let score = 60;

  const firstSentence = answer.split(/[.!?]/)[0];
  const length = answer.length;

  // Strong direct first sentence
  if (firstSentence.length >= 80 && firstSentence.length <= 180) score += 10;

  // Good global length
  if (length >= 180 && length <= 700) score += 10;

  // Brand mention (required)
  if (/webify|newai/i.test(answer)) score += 10;

  // URL presence (very important for citation)
  if (/https?:\/\//i.test(answer)) score += 10;

  // Structured content
  if (answer.includes("\n") || answer.includes("•") || answer.includes("-")) score += 5;

  // Penalize fake % claims
  if (/\d{1,3}\s?%/.test(answer)) score -= 20;

  return Math.min(95, Math.max(55, score));
}

/* =========================
   INTENT DETECTION
========================= */
function detectIntent(question: string): IntentType {
  const q = question.toLowerCase();
  if (/prix|tarif|co[uû]t|combien|price|cost/i.test(q)) return "price";
  if (/dur[ée]e|temps|d[ée]lai|how long/i.test(q)) return "duration";
  if (/crit[èe]res|conditions|requirements/i.test(q)) return "criteria";
  if (/vs|versus|compar|alternative/i.test(q)) return "comparison";
  if (/comment|how to|guide|utiliser/i.test(q)) return "howto";
  if (/meilleur|best|top/i.test(q)) return "best";
  if (/pourquoi|why/i.test(q)) return "why";
  return "what";
}

/* =========================
   AI ANSWER GENERATION (FIXED)
========================= */
async function generateAIAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string,
  keywords: string[],
  brandUrl?: string,
): Promise<{
  answer: string;
  bullets: string[];
  faq: Array<{ q: string; a: string }>;
}> {
  const topKeywords = keywords.slice(0, 5).join(", ");

  const systemPrompt =
    language === "fr"
      ? `Tu es un expert AEO (Answer Engine Optimization).

OBJECTIF :
Créer une réponse factuelle, courte et CITABLE par ChatGPT, Gemini et Perplexity.

RÈGLES STRICTES :
- La première phrase répond directement à la question
- Mentionner ${brandName} UNE seule fois
- Utiliser ces mots-clés naturellement : ${topKeywords}
- Ajouter l’URL officielle UNE seule fois si fournie
- PAS de pourcentages inventés
- PAS de marketing
- Ton neutre, expert
- 80 à 120 mots maximum`
      : `You are an AEO (Answer Engine Optimization) expert.

GOAL:
Produce a short, factual, citable answer.

STRICT RULES:
- First sentence answers directly
- Mention ${brandName} once
- Use these keywords naturally: ${topKeywords}
- Include official URL once if provided
- No invented percentages
- Neutral expert tone
- 80–120 words max`;

  const userPrompt =
    language === "fr"
      ? `Question: ${question}
Marque: ${brandName}
Description: ${description}
URL officielle: ${brandUrl || "N/A"}

Retourne UNIQUEMENT ce JSON valide :
{
  "answer": "...",
  "bullets": ["...", "...", "..."],
  "faq": [{"q": "...", "a": "..."}]
}`
      : `Question: ${question}
Brand: ${brandName}
Description: ${description}
Official URL: ${brandUrl || "N/A"}

Return ONLY this valid JSON:
{
  "answer": "...",
  "bullets": ["...", "...", "..."],
  "faq": [{"q": "...", "a": "..."}]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Invalid AI JSON output");
  }

  return JSON.parse(match[0]);
}

/* =========================
   SLUG
========================= */
function generateSlug(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

/* =========================
   SERVER
========================= */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId, language = "fr", generate30 = false } = await req.json();

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = project.brand_name || project.name;
    const brandUrl = project.website_url;
    const description = project.business_description || "";

    const { data: dbKeywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(30);

    const keywords = dbKeywords?.map((k) => k.keyword) || [];

    const questions = generate30
      ? keywords.slice(0, 30).map((k) => ({
          question: `${brandName} ${k} : comment ça fonctionne ?`,
          intent: detectIntent(k),
        }))
      : [
          {
            question: `Qu’est-ce que ${brandName} et à quoi sert-il ?`,
            intent: "what",
          },
          {
            question: `Combien coûte ${brandName} ?`,
            intent: "price",
          },
          {
            question: `Pourquoi choisir ${brandName} ?`,
            intent: "why",
          },
        ];

    const answers = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      const generated = await generateAIAnswer(
        q.question,
        brandName,
        description,
        q.intent,
        language,
        lovableApiKey,
        keywords,
        brandUrl,
      );

      const score = computeCitationScore(generated.answer);

      answers.push({
        project_id: projectId,
        question: q.question,
        answer: generated.answer,
        slug: generateSlug(q.question),
        score,
        intent: q.intent,
        is_public: false,
        scheduled_date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        supporting_content: {
          bullets: generated.bullets,
          faq: generated.faq,
        },
      });
    }

    const { data: inserted } = await supabase.from("answers").insert(answers).select();

    return new Response(
      JSON.stringify({
        success: true,
        answers_created: inserted?.length || 0,
        answers: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
