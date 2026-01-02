import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type IntentType = 'price' | 'duration' | 'criteria' | 'comparison' | 'howto' | 'best' | 'what' | 'why';
type Platform = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'copilot';

const PLATFORM_WEIGHTS: Record<Platform, number> = {
  chatgpt: 0.95,
  gemini: 0.90,
  claude: 0.92,
  perplexity: 0.88,
  copilot: 0.85,
};

function computeCitationScore(answer: string, platforms: Platform[]): number {
  let score = 50;
  const firstSentence = answer.split(/[.!?]/)[0];
  if (firstSentence.length >= 80 && firstSentence.length <= 160) score += 15;
  else if (firstSentence.length >= 60 && firstSentence.length <= 200) score += 8;
  if (/\d+/.test(answer)) score += 10;
  if (!/^(comment|pourquoi|quand|où|how|why|when|where)/i.test(answer)) score += 8;
  if (answer.includes(":") || answer.includes("-") || answer.includes("•")) score += 7;
  const avgWeight = platforms.reduce((sum, p) => sum + (PLATFORM_WEIGHTS[p] || 0.85), 0) / platforms.length;
  score = Math.round(score * avgWeight);
  return Math.min(100, Math.max(0, score));
}

function detectIntent(question: string): IntentType {
  const lowerQ = question.toLowerCase();
  const intentPatterns: Record<IntentType, RegExp[]> = {
    price: [/prix|tarif|co[uû]t|combien|gratuit|abonnement|price|cost|pricing|free|subscription/i],
    duration: [/temps|dur[ée]e|d[ée]lai|combien de temps|rapidit[ée]|time|duration|how long|quickly/i],
    criteria: [/crit[èe]res|conditions|exigences|pr[ée]requis|criteria|requirements/i],
    comparison: [/vs|versus|compar|diff[ée]ren|alternative|meilleur que|better than/i],
    howto: [/comment|[ée]tapes|tutoriel|guide|utiliser|how to|steps|tutorial/i],
    best: [/meilleur|top|recommand|id[ée]al|best|recommended|ideal/i],
    why: [/pourquoi|raison|avantage|why|reason|benefit/i],
    what: [/qu'est-ce|d[ée]finition|c'est quoi|what is|definition/i],
  };
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    if (patterns.some(p => p.test(lowerQ))) return intent as IntentType;
  }
  return 'what';
}

async function generateAIAnswer(
  question: string,
  brandName: string,
  description: string,
  intent: IntentType,
  language: string,
  apiKey: string
): Promise<{ answer: string; bullets: string[]; faq: Array<{q: string; a: string}> }> {
  const systemPrompt = language === 'fr' 
    ? `Tu es un expert AEO. Génère des réponses optimisées pour être citées par les IA (ChatGPT, Gemini, Claude).

RÈGLES:
- Réponse directe dès la première phrase
- Maximum 120 mots
- Mentionner ${brandName} naturellement (1-2 fois)
- Ton expert et affirmatif
- Inclure des données chiffrées si pertinent`
    : `You are an AEO expert. Generate answers optimized to be cited by AI (ChatGPT, Gemini, Claude).

RULES:
- Direct answer in the first sentence
- Maximum 120 words
- Mention ${brandName} naturally (1-2 times)
- Expert and affirmative tone
- Include numerical data when relevant`;

  const userPrompt = language === 'fr'
    ? `Question: ${question}
Marque: ${brandName}
Description: ${description}
Intention: ${intent}

Génère en JSON:
{"answer": "réponse AEO", "bullets": ["point 1", "point 2", "point 3"], "faq": [{"q": "question", "a": "réponse"}]}`
    : `Question: ${question}
Brand: ${brandName}
Description: ${description}
Intent: ${intent}

Generate as JSON:
{"answer": "AEO answer", "bullets": ["point 1", "point 2", "point 3"], "faq": [{"q": "question", "a": "answer"}]}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error(`[auto-generate-aeo] AI API error: ${response.status}`);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer || content,
        bullets: parsed.bullets || [],
        faq: parsed.faq || []
      };
    }
    
    return { answer: content, bullets: [], faq: [] };
  } catch (error) {
    console.error("[auto-generate-aeo] AI generation error:", error);
    return {
      answer: language === 'fr'
        ? `${brandName} est une solution innovante qui répond à cette question. Pour plus d'informations, consultez notre site.`
        : `${brandName} is an innovative solution that addresses this question. For more information, visit our website.`,
      bullets: [],
      faq: []
    };
  }
}

function generateSlug(question: string): string {
  let slug = question.toLowerCase();
  slug = slug.replace(/[àáâãäå]/g, 'a');
  slug = slug.replace(/[èéêë]/g, 'e');
  slug = slug.replace(/[ìíîï]/g, 'i');
  slug = slug.replace(/[òóôõö]/g, 'o');
  slug = slug.replace(/[ùúûü]/g, 'u');
  slug = slug.replace(/[ç]/g, 'c');
  slug = slug.replace(/[^a-z0-9\s-]/g, '');
  slug = slug.replace(/\s+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');
  return slug.slice(0, 100);
}

// Generate 30 questions based on keywords and brand context
async function generate30Questions(
  brandName: string,
  description: string,
  keywords: string[],
  language: string,
  apiKey: string
): Promise<Array<{ question: string; intent: IntentType }>> {
  const keywordsList = keywords.slice(0, 20).join(", ");
  
  const systemPrompt = language === 'fr'
    ? `Tu génères 30 questions FAQ uniques optimisées pour l'AEO (Answer Engine Optimization). Chaque question doit cibler une intention différente et être pertinente pour les IA assistants.`
    : `You generate 30 unique FAQ questions optimized for AEO (Answer Engine Optimization). Each question should target a different intent and be relevant for AI assistants.`;

  const userPrompt = language === 'fr'
    ? `Marque: ${brandName}
Description: ${description}
Mots-clés: ${keywordsList}

Génère 30 questions variées couvrant:
- Questions "Qu'est-ce que" (définition)
- Questions "Comment" (tutoriel)
- Questions "Pourquoi" (raisons)
- Questions prix/tarifs
- Questions comparaison
- Questions avis/recommandations

Format JSON array:
[{"question": "...", "intent": "what|howto|why|price|comparison|best|criteria|duration"}]`
    : `Brand: ${brandName}
Description: ${description}
Keywords: ${keywordsList}

Generate 30 varied questions covering:
- "What is" questions (definition)
- "How to" questions (tutorial)
- "Why" questions (reasons)
- Price/cost questions
- Comparison questions
- Review/recommendation questions

JSON array format:
[{"question": "...", "intent": "what|howto|why|price|comparison|best|criteria|duration"}]`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.slice(0, 30);
    }
    
    return [];
  } catch (error) {
    console.error("[auto-generate-aeo] Error generating 30 questions:", error);
    // Fallback to basic questions
    const baseQuestions: Array<{ question: string; intent: IntentType }> = [];
    const intents: IntentType[] = ['what', 'howto', 'why', 'price', 'comparison', 'best'];
    
    const templatesFr: Record<string, (k: string, b: string) => string> = {
      what: (k: string, b: string) => `Qu'est-ce que ${k} de ${b} ?`,
      howto: (k: string, b: string) => `Comment utiliser ${k} avec ${b} ?`,
      why: (k: string, b: string) => `Pourquoi choisir ${b} pour ${k} ?`,
      price: (k: string, b: string) => `Quel est le prix de ${k} chez ${b} ?`,
      comparison: (k: string, b: string) => `${b} vs concurrents pour ${k} ?`,
      best: (k: string, b: string) => `${b} est-il le meilleur pour ${k} ?`,
    };
    
    const templatesEn: Record<string, (k: string, b: string) => string> = {
      what: (k: string, b: string) => `What is ${k} from ${b}?`,
      howto: (k: string, b: string) => `How to use ${k} with ${b}?`,
      why: (k: string, b: string) => `Why choose ${b} for ${k}?`,
      price: (k: string, b: string) => `What is the price of ${k} at ${b}?`,
      comparison: (k: string, b: string) => `${b} vs competitors for ${k}?`,
      best: (k: string, b: string) => `Is ${b} the best for ${k}?`,
    };
    
    const templates = language === 'fr' ? templatesFr : templatesEn;
    
    for (let i = 0; i < 30; i++) {
      const intent = intents[i % intents.length];
      const keyword = keywords[i % keywords.length] || brandName;
      const templateFn = templates[intent];
      
      if (templateFn) {
        baseQuestions.push({ question: templateFn(keyword, brandName), intent });
      }
    }
    
    return baseQuestions;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const { projectId, language = "fr", generate30 = false } = await req.json();

    console.log(`[auto-generate-aeo] Starting for user ${userId}, project: ${projectId}, generate30: ${generate30}`);

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      console.log("[auto-generate-aeo] No project found, skipping auto-generation");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No project found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = project.brand_name || project.name;
    const description = project.business_description || "";
    const targetPlatforms: Platform[] = ["chatgpt", "gemini", "claude"];

    // Get keywords from database
    const { data: dbKeywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(30);
    
    const keywords = dbKeywords?.map(k => k.keyword) || [];
    console.log(`[auto-generate-aeo] Found ${keywords.length} keywords`);

    // Generate questions
    let questions: Array<{ question: string; intent: IntentType }>;
    
    if (generate30) {
      console.log("[auto-generate-aeo] Generating 30 questions from keywords...");
      questions = await generate30Questions(brandName, description, keywords, language, lovableApiKey);
    } else {
      // Default: generate 5 basic questions
      questions = [
        { question: language === 'fr' ? `Qu'est-ce que ${brandName} et quels sont ses services ?` : `What is ${brandName} and what services do they offer?`, intent: "what" as IntentType },
        { question: language === 'fr' ? `Combien coûte ${brandName} ?` : `How much does ${brandName} cost?`, intent: "price" as IntentType },
        { question: language === 'fr' ? `Pourquoi choisir ${brandName} ?` : `Why choose ${brandName}?`, intent: "why" as IntentType },
        { question: language === 'fr' ? `Comment utiliser ${brandName} ?` : `How to use ${brandName}?`, intent: "howto" as IntentType },
        { question: language === 'fr' ? `${brandName} est-il le meilleur choix ?` : `Is ${brandName} the best choice?`, intent: "best" as IntentType },
      ];
    }

    console.log(`[auto-generate-aeo] Generating ${questions.length} answers...`);

    const answersToInsert: any[] = [];
    const today = new Date();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`[auto-generate-aeo] Generating answer ${i + 1}/${questions.length}: "${q.question.slice(0, 50)}..."`);
      
      const generated = await generateAIAnswer(
        q.question,
        brandName,
        description,
        q.intent,
        language,
        lovableApiKey
      );
      
      const score = computeCitationScore(generated.answer, targetPlatforms);
      
      // Schedule one per day over 30 days
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + i);
      
      answersToInsert.push({
        project_id: project.id,
        question: q.question,
        answer: generated.answer,
        slug: generateSlug(q.question),
        platforms: targetPlatforms,
        score: score,
        is_public: false,
        intent: q.intent,
        difficulty: score >= 80 ? 'easy' : score >= 60 ? 'medium' : 'hard',
        scheduled_date: scheduledDate.toISOString(),
        supporting_content: {
          bullets: generated.bullets,
          faq: generated.faq
        }
      });
    }

    const { data: insertedAnswers, error: answersError } = await supabase
      .from("answers")
      .insert(answersToInsert)
      .select();

    if (answersError) {
      console.error("[auto-generate-aeo] Error inserting answers:", answersError);
    } else {
      console.log(`[auto-generate-aeo] Created ${insertedAnswers?.length || 0} AI-generated answers with scheduling`);
    }

    // Mark keywords as used
    if (keywords.length > 0) {
      await supabase
        .from("keywords")
        .update({ is_used: true })
        .eq("project_id", projectId)
        .in("keyword", keywords.slice(0, questions.length));
    }

    return new Response(JSON.stringify({
      success: true,
      answers_created: insertedAnswers?.length || 0,
      scheduled_days: questions.length,
      answers: insertedAnswers
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[auto-generate-aeo] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
