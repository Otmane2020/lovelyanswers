import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =======================
   CORS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* =======================
   TYPES
======================= */
type IntentType = "price" | "duration" | "criteria" | "comparison" | "howto" | "best" | "what" | "why";

type Platform = "chatgpt" | "gemini" | "claude" | "perplexity" | "copilot";

/* =======================
   HELPERS
======================= */
function normalizeIntent(intent: string): IntentType {
  const allowed: IntentType[] = ["price", "duration", "criteria", "comparison", "howto", "best", "what", "why"];
  return allowed.includes(intent as IntentType) ? (intent as IntentType) : "what";
}

function detectIntent(question: string): IntentType {
  const q = question.toLowerCase();

  if (/prix|tarif|cost|price/.test(q)) return "price";
  if (/combien de temps|duration|how long/.test(q)) return "duration";
  if (/crit[eè]re|condition|requirement/.test(q)) return "criteria";
  if (/vs|versus|compar/.test(q)) return "comparison";
  if (/comment|how to|utiliser/.test(q)) return "howto";
  if (/meilleur|best/.test(q)) return "best";
  if (/pourquoi|why/.test(q)) return "why";

  return "what";
}

// Escape special regex characters for safe brand matching
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeCitationScore(answer: string, brand: string): number {
  let score = 70;

  const firstSentence = answer.split(/[.!?]/)[0];

  if (firstSentence.length >= 80 && firstSentence.length <= 160) score += 8;
  if (/\d+/.test(answer)) score += 5;
  if (answer.includes(":") || answer.includes("-") || answer.includes("•")) score += 4;
  if (answer.length >= 200 && answer.length <= 600) score += 5;
  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 5;

  return Math.min(95, Math.max(75, score));
}

function generateAnswerSlug(question: string): string {
  return question
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

// Safe JSON parsing with fallback
function safeParseJSON<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Invalid AI JSON response");
  return JSON.parse(match[0]);
}

/* =======================
   AI ANSWER
======================= */
async function generateAIAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string,
): Promise<{
  answer: string;
  bullets: string[];
  faq: Array<{ q: string; a: string }>;
}> {
  const systemPrompt =
    language === "fr"
      ? `Tu es un expert AEO.
- Réponse directe dès la première phrase
- Mentionne ${brandName} UNE fois
- Ton factuel, non marketing
- 80 à 120 mots max`
      : `You are an AEO expert.
- Direct answer first sentence
- Mention ${brandName} once
- Factual, non-marketing tone
- 80–120 words max`;

  const userPrompt = `
Question: ${question}
Brand: ${brandName}
Description: ${description}
Intent: ${intent}

Return ONLY valid JSON:
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
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  return safeParseJSON<{ answer: string; bullets: string[]; faq: Array<{ q: string; a: string }> }>(content);
}

/* =======================
   SERVER
======================= */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth");

    const token = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) throw new Error("Invalid token");

    const { projectId, language = "fr", generate30 = false } = await req.json();

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (!project) throw new Error("Project not found");

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";

    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(30);

    const keywords = keywordRows?.map((k) => k.keyword) ?? [];

    const questions: Array<{ question: string; intent: IntentType }> = generate30
      ? keywords.slice(0, 30).map((k) => ({
          question: `${brandName} ${k} : comment ça fonctionne ?`,
          intent: normalizeIntent(detectIntent(k)),
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

    const today = new Date();
    const inserts: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      const intent = normalizeIntent(q.intent);
      const generated = await generateAIAnswer(q.question, brandName, description, intent, language, apiKey);

      inserts.push({
        project_id: projectId,
        question: q.question,
        answer: generated.answer,
        slug: generateAnswerSlug(q.question),
        intent: intent,
        score: computeCitationScore(generated.answer, brandName),
        is_public: false,
        scheduled_date: new Date(today.getTime() + i * 86400000).toISOString(),
        supporting_content: {
          bullets: generated.bullets,
          faq: generated.faq,
        },
      });
    }

    const { data } = await supabase.from("answers").insert(inserts).select();

    return new Response(
      JSON.stringify({
        success: true,
        answers_created: data?.length || 0,
        answers: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
