import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =======================
   CORS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* =======================
   TYPES & CONSTANTS
======================= */
const INTENTS = [
  "price",
  "duration",
  "criteria",
  "comparison",
  "howto",
  "best",
  "what",
  "why",
] as const;

type IntentType = typeof INTENTS[number];

/* =======================
   AEO SAFE MODE
======================= */
const FORBIDDEN_PATTERNS = [
  /meilleur choix/i,
  /best choice/i,
  /révolutionnaire/i,
  /revolutionary/i,
  /inégalé/i,
  /unmatched/i,
  /expertise unique/i,
  /unique expertise/i,
  /garantie de résultats/i,
  /guaranteed results/i,
  /\d+%\s*(de|more|boost|increase)/i,
  /leader du marché/i,
  /market leader/i,
  /solution idéale/i,
  /ideal solution/i,
  /sans égal/i,
  /unparalleled/i,
];

/* =======================
   HELPERS
======================= */
function normalizeIntent(
  value: string | IntentType | null | undefined,
): IntentType {
  if (!value) return "what";
  const v = value.toString().toLowerCase().trim();
  return (INTENTS as readonly string[]).includes(v)
    ? (v as IntentType)
    : "what";
}

function detectIntent(text: string): IntentType {
  const q = text.toLowerCase();
  if (/prix|tarif|cost|price/.test(q)) return "price";
  if (/combien de temps|duration|how long/.test(q)) return "duration";
  if (/crit[eè]re|condition|requirement/.test(q)) return "criteria";
  if (/vs|versus|compar/.test(q)) return "comparison";
  if (/comment|how to|utiliser/.test(q)) return "howto";
  if (/meilleur|best/.test(q)) return "best";
  if (/pourquoi|why/.test(q)) return "why";
  return "what";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsForbiddenPatterns(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((p) => p.test(text));
}

function computeCitationScore(answer: string, brand: string): number {
  let score = 70;

  if (containsForbiddenPatterns(answer)) score -= 20;

  const firstSentence = answer.split(/[.!?]/)[0] ?? "";
  if (firstSentence.length >= 80 && firstSentence.length <= 160) score += 8;
  if (/\d+/.test(answer)) score += 5;
  if (/[:\-•]/.test(answer)) score += 4;
  if (answer.length >= 200 && answer.length <= 600) score += 5;
  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 5;
  if (/selon|d'après|en général|généralement|typiquement/i.test(answer)) {
    score += 3;
  }

  return Math.min(95, Math.max(40, score));
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

function safeParseJSON<T>(raw: string): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Invalid AI JSON response");
  return JSON.parse(match[0]);
}

/* =======================
   GENERATE CONTEXTUAL QUESTIONS
======================= */
async function generateContextualQuestions(
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
): Promise<{ question: string; intent: IntentType }[]> {
  const systemPrompt = language === "fr"
    ? `Tu génères 3 questions précises que des clients potentiels poseraient à un assistant IA.

RÈGLES STRICTES:
- Questions basées sur le MÉTIER RÉEL décrit
- NE PAS utiliser le nom de marque dans les questions
- Questions spécifiques au secteur d'activité
- Format question naturelle (comme sur Google/ChatGPT)

EXEMPLES par secteur:
- Location meubles: "Comment louer des meubles pour un appartement meublé ?", "Quel est le prix moyen de la location de meubles ?"
- SaaS SEO: "Comment améliorer le référencement de mon site ?", "Quels outils SEO utiliser en 2025 ?"
- E-commerce: "Comment choisir [produit] de qualité ?", "Où acheter [produit] en ligne ?"

Retourne UNIQUEMENT du JSON valide.`
    : `Generate 3 precise questions potential customers would ask an AI assistant.

STRICT RULES:
- Questions based on the REAL business described
- DO NOT use brand name in questions
- Industry-specific questions
- Natural question format (like Google/ChatGPT)

Return ONLY valid JSON.`;

  const userPrompt = `
Business: ${brandName}
Description: ${description}
Language: ${language}

Generate 3 questions. Return JSON:
{
  "questions": [
    {"question": "...", "intent": "price|what|why|howto|comparison|best"},
    {"question": "...", "intent": "..."},
    {"question": "...", "intent": "..."}
  ]
}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJSON<{ questions: { question: string; intent: string }[] }>(content);
    
    return parsed.questions.map(q => ({
      question: q.question,
      intent: normalizeIntent(q.intent),
    }));
  } catch (e) {
    console.error("Failed to generate contextual questions:", e);
    // Fallback to generic but still better questions
    return [
      { question: `Comment fonctionne ${brandName} ?`, intent: "howto" as IntentType },
      { question: `Quels sont les tarifs de ${brandName} ?`, intent: "price" as IntentType },
      { question: `Pourquoi choisir ${brandName} ?`, intent: "why" as IntentType },
    ];
  }
}

/* =======================
   AI GENERATION
======================= */
async function generateAIAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string,
): Promise<{ answer: string; bullets: string[]; faq: { q: string; a: string }[] }> {
  const systemPrompt =
    language === "fr"
      ? `Tu es un rédacteur AEO factuel et neutre.

RÈGLES:
- Réponse directe dès la première phrase
- Mentionne ${brandName} UNE seule fois comme exemple/solution
- Ton encyclopédique, neutre, sans marketing
- Aucun superlatif, aucune promesse
- 80 à 120 mots maximum
- Réponds à la question SPÉCIFIQUE posée`
      : `You are an AEO factual writer.

RULES:
- Direct factual first sentence
- Mention ${brandName} ONCE as example/solution
- Neutral encyclopedic tone
- No superlatives, no promises
- 80–120 words max
- Answer the SPECIFIC question asked`;

  const userPrompt = `
Question: ${question}
Brand: ${brandName}
Description: ${description}
Intent: ${intent}

Return ONLY valid JSON:
{
  "answer": "",
  "bullets": ["", "", ""],
  "faq": [{"q": "", "a": ""}]
}`;

  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.25,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    },
  );

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return safeParseJSON(content);
}

/* =======================
   SERVER
======================= */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth header");

    const token = auth.replace("Bearer ", "");
    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      throw new Error("Invalid token");
    }

    const body = await req.json();
    const { projectId, language = "fr", generate30 = false } = body ?? {};

    if (!projectId) throw new Error("Missing projectId");

    const { data: project } = await supabase
      .from("projects")
      .select("id, name, brand_name, business_description")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (!project) throw new Error("Project not found");

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";

    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("keyword,intent")
      .eq("project_id", projectId)
      .limit(30);

    let questions: { question: string; intent: IntentType }[];
    
    if (generate30 && keywordRows && keywordRows.length > 0) {
      // Use keywords if available
      questions = keywordRows.map((k) => ({
        question: k.keyword,
        intent: normalizeIntent(k.intent ?? detectIntent(k.keyword)),
      }));
    } else {
      // Generate contextual questions based on business description
      questions = await generateContextualQuestions(
        brandName,
        description,
        language,
        apiKey,
      );
    }

    if (!questions.length) {
      return new Response(
        JSON.stringify({ success: true, answers_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const inserts: any[] = [];
    const baseDate = Date.now();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const generated = await generateAIAnswer(
        q.question,
        brandName,
        description,
        q.intent,
        language,
        apiKey,
      );

      inserts.push({
        project_id: projectId,
        question: q.question,
        answer: generated.answer,
        slug: generateAnswerSlug(q.question),
        intent: q.intent,
        score: computeCitationScore(generated.answer, brandName),
        is_public: false,
        scheduled_date: new Date(baseDate + i * 86400000).toISOString(),
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
        answers_created: data?.length ?? 0,
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
