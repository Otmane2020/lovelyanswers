```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* =======================
   CORS
======================= */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* =======================
   TYPES
======================= */
type IntentType =
  | "price"
  | "duration"
  | "criteria"
  | "comparison"
  | "howto"
  | "best"
  | "what"
  | "why";

type Platform =
  | "chatgpt"
  | "gemini"
  | "claude"
  | "perplexity"
  | "copilot";

/* =======================
   UTILS
======================= */
function computeCitationScore(answer: string): number {
  let score = 60;

  if (answer.length >= 150 && answer.length <= 800) score += 10;
  if (/newai|webify/i.test(answer)) score += 10;
  if (/https?:\/\//.test(answer)) score += 10;
  if (answer.includes("-") || answer.includes("•")) score += 5;
  if (/\d{1,3}\s?%/.test(answer)) score -= 15;

  return Math.min(95, Math.max(55, score));
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
  keywords: string[],
  brandUrl?: string
): Promise<{
  answer: string;
  bullets: string[];
  faq: Array<{ q: string; a: string }>;
}> {
  const topKeywords = keywords.slice(0, 5).join(", ");

  const systemPrompt =
    language === "fr"
      ? `Tu es un expert AEO.
Règles :
- Réponds dès la première phrase
- Mentionne ${brandName} UNE fois
- Utilise ces mots-clés : ${topKeywords}
- Ajoute l’URL officielle une seule fois si pertinente
- Ton neutre, informatif, factuel
- 80 à 120 mots max`
      : `You are an AEO expert.
Rules:
- Direct answer in first sentence
- Mention ${brandName} once
- Use keywords: ${topKeywords}
- Include official URL once if relevant
- Neutral, factual tone
- 80–120 words max`;

  const userPrompt = `
Question: ${question}
Brand: ${brandName}
Description: ${description}
Official URL: ${brandUrl || "N/A"}

Return ONLY valid JSON:
{
  "answer": "...",
  "bullets": ["...", "...", "..."],
  "faq": [{"q": "...", "a": "..."}]
}
`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
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
    }
  );

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  const json = content.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("Invalid AI JSON");

  return JSON.parse(json[0]);
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth");

    const token = auth.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData?.user) throw new Error("Invalid token");

    const { projectId, language = "fr", generate30 = false } =
      await req.json();

    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (!project) throw new Error("Project not found");

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";
    const brandUrl = project.website_url;

    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(30);

    const keywords = keywordRows?.map((k) => k.keyword) ?? [];

    const questions: Array<{ question: string; intent: IntentType }> =
      generate30
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

    const today = new Date();
    const inserts: any[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      const generated = await generateAIAnswer(
        q.question,
        brandName,
        description,
        q.intent,
        language,
        apiKey,
        keywords,
        brandUrl
      );

      inserts.push({
        project_id: projectId,
        question: q.question,
        answer: generated.answer,
        slug: generateSlug(q.question),
        intent: q.intent,
        score: computeCitationScore(generated.answer),
        is_public: false,
        scheduled_date: new Date(
          today.getTime() + i * 86400000
        ).toISOString(),
        supporting_content: {
          bullets: generated.bullets,
          faq: generated.faq,
        },
      });
    }

    const { data } = await supabase
      .from("answers")
      .insert(inserts)
      .select();

    return new Response(
      JSON.stringify({
        success: true,
        answers_created: data?.length || 0,
        answers: data,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
```
