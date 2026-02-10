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
  let score = 60;
  const currentYear = new Date().getFullYear();

  // ❌ PENALTY: Marketing patterns
  if (containsForbiddenPatterns(answer)) score -= 20;

  // ❌ PENALTY: Starts with generic definition
  const genericStarters = [
    /^(un|une|le|la|les|l')\s+\w+\s+(est|sont|désigne)/i,
    /^(a|an|the)\s+\w+\s+(is|are|refers)/i,
  ];
  if (genericStarters.some(rx => rx.test(answer))) score -= 12;

  // ✅ BONUS: First sentence is direct (80-160 chars)
  const firstSentence = answer.split(/[.!?]/)[0] ?? "";
  if (firstSentence.length >= 80 && firstSentence.length <= 160) score += 8;

  // ✅ BONUS: Contains concrete numbers with context
  if (/\d+\s*(€|\$|%|euros?|mois|jours?|ans?)/i.test(answer)) score += 10;
  else if (/\d+/.test(answer)) score += 4;

  // ✅ BONUS: Contains temporal context
  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) {
    score += 8;
  }

  // ✅ BONUS: Contains decision criteria
  if (/crit[eè]re|choisir|éviter|erreur|condition|si\s+/i.test(answer)) score += 8;

  // ✅ BONUS: Structured content
  if (/[:\-•]|\d\.\s/.test(answer)) score += 4;

  // ✅ BONUS: Good length (200-600 chars)
  if (answer.length >= 200 && answer.length <= 600) score += 5;

  // ✅ BONUS: Brand mention (factual)
  if (new RegExp(escapeRegex(brand), "i").test(answer)) score += 4;

  // ❌ PENALTY: Too many vague phrases
  const vagueCount = (answer.match(/généralement|souvent|parfois|peut être|peuvent/gi) || []).length;
  if (vagueCount >= 3) score -= 8;

  return Math.min(98, Math.max(40, score));
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
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      // Fall through to other methods
    }
  }
  
  // Try to find JSON object directly
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      // Fall through to error
    }
  }
  
  // Try to find JSON array
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (e) {
      // Fall through to error
    }
  }
  
  console.error("Failed to parse JSON from:", raw.substring(0, 500));
  throw new Error("Invalid AI JSON response");
}

/* =======================
   GENERATE CONTEXTUAL QUESTIONS - Decision-oriented, not generic
======================= */
async function generateContextualQuestions(
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
): Promise<{ question: string; intent: IntentType }[]> {
  const currentYear = new Date().getFullYear();
  
  const systemPrompt = language === "fr"
    ? `Tu génères 5 questions DÉCISIONNELLES que des clients potentiels poseraient à ChatGPT/Gemini.

⛔ QUESTIONS INTERDITES (trop génériques) :
- "Qu'est-ce que X ?" → trop encyclopédique
- "X est-il bon ?" → trop vague
- "Comment fonctionne X ?" → trop générique

✅ QUESTIONS À GÉNÉRER (orientées décision) :
- "Comment choisir..." → critères de sélection
- "Quel budget prévoir pour..." → fourchette de prix
- "Quelles erreurs éviter lors de..." → conseils pratiques
- "Quelle différence entre X et Y..." → comparaison utile
- "Quel est le délai moyen pour..." → attentes réalistes

RÈGLES STRICTES:
- Questions basées sur le MÉTIER RÉEL décrit
- NE PAS utiliser le nom de marque dans les questions
- Questions qui AIDENT À DÉCIDER, pas à comprendre
- Inclure contexte temporel (${currentYear}) si pertinent

EXEMPLES par secteur:
- Mobilier: "Comment choisir un canapé adapté à un petit salon ?", "Quel budget prévoir pour meubler un salon en ${currentYear} ?"
- SaaS: "Quels critères pour choisir un outil SEO en ${currentYear} ?", "Quelle différence entre SEO et AEO ?"
- E-commerce: "Comment éviter les arnaques lors d'un achat de meubles en ligne ?", "Quel délai de livraison prévoir pour des meubles sur mesure ?"

Retourne UNIQUEMENT du JSON valide.`
    : `Generate 5 DECISION-ORIENTED questions potential customers would ask ChatGPT/Gemini.

⛔ FORBIDDEN QUESTIONS (too generic):
- "What is X?" → too encyclopedic
- "Is X good?" → too vague
- "How does X work?" → too generic

✅ QUESTIONS TO GENERATE (decision-oriented):
- "How to choose..." → selection criteria
- "What budget for..." → price range
- "What mistakes to avoid when..." → practical advice
- "What's the difference between X and Y..." → useful comparison
- "What's the average timeframe for..." → realistic expectations

STRICT RULES:
- Questions based on the REAL business described
- DO NOT use brand name in questions
- Questions that HELP DECIDE, not just understand
- Include temporal context (${currentYear}) if relevant

Return ONLY valid JSON.`;

  const userPrompt = `
Business: ${brandName}
Description: ${description}
Language: ${language}
Current Year: ${currentYear}

Generate 5 decision-oriented questions. Return JSON:
{
  "questions": [
    {"question": "Comment choisir...", "intent": "criteria"},
    {"question": "Quel budget prévoir pour...", "intent": "price"},
    {"question": "Quelles erreurs éviter...", "intent": "howto"},
    {"question": "Quelle différence entre...", "intent": "comparison"},
    {"question": "...", "intent": "..."}
  ]
}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
    // Fallback to generic but still better questions based on language
    const fallbackQuestions = language === "fr" 
      ? [
          { question: `Comment choisir un bon service de ${description?.split(' ').slice(0, 3).join(' ') || 'qualité'} ?`, intent: "criteria" as IntentType },
          { question: `Quel budget prévoir pour ${description?.split(' ').slice(0, 3).join(' ') || 'ce service'} en ${new Date().getFullYear()} ?`, intent: "price" as IntentType },
          { question: `Quelles erreurs éviter lors du choix ?`, intent: "howto" as IntentType },
        ]
      : [
          { question: `How to choose a good ${description?.split(' ').slice(0, 3).join(' ') || 'service'} provider?`, intent: "criteria" as IntentType },
          { question: `What budget to plan for ${description?.split(' ').slice(0, 3).join(' ') || 'this service'} in ${new Date().getFullYear()}?`, intent: "price" as IntentType },
          { question: `What mistakes to avoid when choosing?`, intent: "howto" as IntentType },
        ];
    return fallbackQuestions;
  }
}

/* =======================
   TRANSFORM KEYWORDS TO QUESTIONS
======================= */
async function transformKeywordsToQuestions(
  keywords: string[],
  brandName: string,
  description: string,
  language: string,
  apiKey: string,
): Promise<{ question: string; intent: IntentType }[]> {
  const currentYear = new Date().getFullYear();
  
  const systemPrompt = language === "fr"
    ? `Tu transformes des mots-clés SEO en questions DÉCISIONNELLES naturelles.

⛔ INTERDIT:
- Garder le mot-clé tel quel
- Questions génériques comme "Qu'est-ce que X ?"
- Utiliser le nom de marque dans la question

✅ TRANSFORMATION:
- "canapé design" → "Comment choisir un canapé design adapté à son salon en ${currentYear} ?"
- "mobilier écoresponsable" → "Quels critères vérifier pour s'assurer qu'un meuble est vraiment écoresponsable ?"
- "table basse marbre prix" → "Quel budget prévoir pour une table basse en marbre de qualité ?"
- "meilleur canapé" → "Quels sont les critères essentiels pour évaluer la qualité d'un canapé ?"

RÈGLES:
- TOUJOURS transformer en question complète avec "?"
- Questions orientées décision (Comment choisir, Quel budget, Quelles erreurs éviter...)
- Varier les formulations
- Questions naturelles comme posées à ChatGPT

Retourne UNIQUEMENT du JSON valide.`
    : `Transform SEO keywords into natural DECISION-ORIENTED questions.

⛔ FORBIDDEN:
- Keep keyword as-is
- Generic questions like "What is X?"
- Use brand name in question

✅ TRANSFORMATION:
- "design sofa" → "How to choose a design sofa suited to your living room in ${currentYear}?"
- "eco-friendly furniture" → "What criteria to check to ensure furniture is truly eco-friendly?"
- "marble coffee table price" → "What budget to plan for a quality marble coffee table?"

RULES:
- ALWAYS transform into complete question with "?"
- Decision-oriented questions (How to choose, What budget, What mistakes to avoid...)
- Vary formulations
- Natural questions like asked to ChatGPT

Return ONLY valid JSON.`;

  const userPrompt = `
Business: ${brandName}
Description: ${description}
Keywords to transform:
${keywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}

Transform each keyword into a unique decision-oriented question. Return JSON:
{
  "questions": [
    {"keyword": "original keyword", "question": "transformed question?", "intent": "criteria|price|howto|comparison|why|best"},
    ...
  ]
}`;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJSON<{ questions: { keyword: string; question: string; intent: string }[] }>(content);
    
    return parsed.questions.map(q => ({
      question: q.question,
      intent: normalizeIntent(q.intent),
    }));
  } catch (e) {
    console.error("Failed to transform keywords to questions:", e);
    // Fallback: create basic questions from keywords
    return keywords.map(keyword => {
      const kw = keyword.toLowerCase();
      let question: string;
      let intent: IntentType;
      
      if (/prix|tarif|budget|cost/.test(kw)) {
        question = language === "fr" 
          ? `Quel budget prévoir pour ${keyword} ?`
          : `What budget to plan for ${keyword}?`;
        intent = "price";
      } else if (/meilleur|best/.test(kw)) {
        question = language === "fr"
          ? `Quels critères pour choisir le meilleur ${keyword.replace(/meilleur|best/gi, "").trim()} ?`
          : `What criteria to choose the best ${keyword.replace(/meilleur|best/gi, "").trim()}?`;
        intent = "best";
      } else if (/comment|how/.test(kw)) {
        question = keyword.endsWith("?") ? keyword : `${keyword} ?`;
        intent = "howto";
      } else {
        question = language === "fr"
          ? `Comment choisir ${keyword} adapté à ses besoins ?`
          : `How to choose ${keyword} suited to your needs?`;
        intent = "criteria";
      }
      
      return { question, intent };
    });
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
  const currentYear = new Date().getFullYear();
  
  // Intent-specific structure templates
  const intentStructures: Record<IntentType, { fr: string; en: string }> = {
    price: {
      fr: "Structure: Prix moyen + fourchette + facteurs de variation",
      en: "Structure: Average price + range + variation factors"
    },
    criteria: {
      fr: "Structure: 3 critères numérotés + ordre de priorité",
      en: "Structure: 3 numbered criteria + priority order"
    },
    comparison: {
      fr: "Structure: Différence clé + cas d'usage + condition de choix",
      en: "Structure: Key difference + use case + choice condition"
    },
    howto: {
      fr: "Structure: 3 étapes max + erreur courante à éviter",
      en: "Structure: 3 steps max + common mistake to avoid"
    },
    best: {
      fr: "Structure: Critère principal + dépend du contexte",
      en: "Structure: Main criterion + context dependency"
    },
    what: {
      fr: "Structure: Définition orientée usage + critère distinctif",
      en: "Structure: Usage-oriented definition + distinctive criterion"
    },
    why: {
      fr: "Structure: Raison principale + condition + alternative",
      en: "Structure: Main reason + condition + alternative"
    },
    duration: {
      fr: "Structure: Délai moyen + facteurs + fourchette",
      en: "Structure: Average timeframe + factors + range"
    }
  };

  const structure = intentStructures[intent] || intentStructures.what;

  const systemPrompt =
    language === "fr"
      ? `Tu es un expert AEO. Tu rédiges des réponses que ChatGPT et Gemini voudront CITER.

⛔ INTERDICTIONS:
- Pas de définitions génériques ("X est un...")
- Aucun superlatif, aucune promesse
- Pas de "vous" ou "votre"

✅ FORMAT CITATION-FIRST:
1. Première phrase = réponse DIRECTE avec critère/chiffre
2. Phrase 2 = contexte ${currentYear} OU condition ("si... alors...")
3. Phrase 3 = erreur à éviter OU comparaison utile
4. Mention ${brandName} UNE fois comme exemple

${structure.fr}

✅ INCLURE AU MOINS UN:
- Chiffre concret (prix, délai, pourcentage)
- Condition ("si... alors...")
- Erreur fréquente ("éviter de...")

80-120 mots maximum.`
      : `You are an AEO expert. You write answers ChatGPT and Gemini will CITE.

⛔ BANS:
- No generic definitions ("X is a...")
- No superlatives, no promises
- No "you" or "your"

✅ CITATION-FIRST FORMAT:
1. First sentence = DIRECT answer with criterion/number
2. Sentence 2 = ${currentYear} context OR condition ("if... then...")
3. Sentence 3 = mistake to avoid OR useful comparison
4. Mention ${brandName} ONCE as example

${structure.en}

✅ INCLUDE AT LEAST ONE:
- Concrete number (price, timeframe, percentage)
- Condition ("if... then...")
- Common mistake ("avoid...")

80-120 words max.`;

  const userPrompt = `
Question: ${question}
Brand: ${brandName}
Description: ${description}
Intent: ${intent}
Year: ${currentYear}

Return ONLY valid JSON:
{
  "answer": "",
  "bullets": ["critère/conseil 1", "critère/conseil 2", "critère/conseil 3"],
  "faq": [{"q": "question décisionnelle connexe", "a": "réponse courte avec critère"}]
}`;

  const res = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
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

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

    const auth = req.headers.get("authorization");
    if (!auth) throw new Error("Missing auth header");

    const token = auth.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const isServiceRole = token === serviceRoleKey;

    let userId: string | null = null;
    if (!isServiceRole) {
      const { data: userData, error: authError } =
        await supabase.auth.getUser(token);
      if (authError || !userData?.user) {
        throw new Error("Invalid token");
      }
      userId = userData.user.id;
    }

    const body = await req.json();
    const { projectId, generate30 = false } = body ?? {};

    if (!projectId) throw new Error("Missing projectId");

    let projectQuery = supabase
      .from("projects")
      .select("id, name, brand_name, business_description, language")
      .eq("id", projectId);
    if (!isServiceRole) {
      projectQuery = projectQuery.eq("user_id", userId!);
    }
    const { data: project } = await projectQuery.single();

    if (!project) throw new Error("Project not found");

    // CRITICAL: Get language from generation_settings first, then project, then default
    const { data: genSettings } = await supabase
      .from("generation_settings")
      .select("language, brand_name, business_description")
      .eq("project_id", projectId)
      .single();

    // Language priority: generation_settings > project > 'en' (default English)
    const language = genSettings?.language || project.language || "en";
    console.log(`[auto-generate-aeo] Using language: ${language} for project ${projectId}`);

    const brandName = genSettings?.brand_name || project.brand_name || project.name;
    const description = genSettings?.business_description || project.business_description || "";

    const { data: keywordRows } = await supabase
      .from("keywords")
      .select("keyword,intent")
      .eq("project_id", projectId)
      .limit(30);

    let questions: { question: string; intent: IntentType }[];
    
    if (generate30 && keywordRows && keywordRows.length > 0) {
      // Transform keywords into proper questions
      questions = await transformKeywordsToQuestions(
        keywordRows.map(k => k.keyword),
        brandName,
        description,
        language,
        apiKey,
      );
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
