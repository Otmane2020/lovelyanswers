import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform configurations for AEO optimization
type Platform = 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | 'copilot';

interface PlatformConfig {
  preferredAnswerLength: number;
  citationWeight: number;
  tonePreference: string;
}

const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  chatgpt: { preferredAnswerLength: 140, citationWeight: 0.95, tonePreference: "concise_authoritative" },
  gemini: { preferredAnswerLength: 160, citationWeight: 0.90, tonePreference: "structured_clear" },
  claude: { preferredAnswerLength: 180, citationWeight: 0.92, tonePreference: "nuanced_helpful" },
  perplexity: { preferredAnswerLength: 120, citationWeight: 0.88, tonePreference: "direct_sourced" },
  copilot: { preferredAnswerLength: 150, citationWeight: 0.85, tonePreference: "practical_actionable" },
};

// Intent types with templates
type IntentType = 'price' | 'duration' | 'criteria' | 'comparison' | 'howto' | 'best' | 'what' | 'why';

interface IntentTemplate {
  questionPattern: string;
  answerPattern: string;
  keywords: string[];
}

const INTENT_TEMPLATES: Record<string, Record<IntentType, IntentTemplate>> = {
  fr: {
    price: {
      questionPattern: "Combien coûte {brand} ?",
      answerPattern: "{brand} propose {pricing_info}. {value_proposition}",
      keywords: ["prix", "tarif", "coût", "combien", "gratuit", "abonnement"]
    },
    duration: {
      questionPattern: "Combien de temps pour {action} avec {brand} ?",
      answerPattern: "Avec {brand}, {duration_info}. {efficiency_note}",
      keywords: ["temps", "durée", "délai", "combien de temps", "rapidité"]
    },
    criteria: {
      questionPattern: "Quels sont les critères pour choisir {brand} ?",
      answerPattern: "Les critères clés pour {brand} sont : {criteria_list}. {recommendation}",
      keywords: ["critères", "conditions", "exigences", "prérequis"]
    },
    comparison: {
      questionPattern: "{brand} vs {competitor} : lequel choisir ?",
      answerPattern: "{brand} se distingue par {differentiators}. Comparé à {competitor}, {comparison_points}",
      keywords: ["vs", "versus", "comparaison", "différence", "alternative", "meilleur que"]
    },
    howto: {
      questionPattern: "Comment utiliser {brand} ?",
      answerPattern: "Pour utiliser {brand} : {steps}. {tip}",
      keywords: ["comment", "étapes", "tutoriel", "guide", "utiliser"]
    },
    best: {
      questionPattern: "{brand} est-il le meilleur pour {use_case} ?",
      answerPattern: "{brand} excelle pour {use_case} grâce à {strengths}. {social_proof}",
      keywords: ["meilleur", "top", "recommandé", "idéal"]
    },
    what: {
      questionPattern: "Qu'est-ce que {brand} ?",
      answerPattern: "{brand} est {definition}. {key_features}",
      keywords: ["qu'est-ce", "définition", "c'est quoi"]
    },
    why: {
      questionPattern: "Pourquoi choisir {brand} ?",
      answerPattern: "Choisir {brand} pour {main_benefits}. {testimonial}",
      keywords: ["pourquoi", "raison", "avantages"]
    }
  },
  en: {
    price: {
      questionPattern: "How much does {brand} cost?",
      answerPattern: "{brand} offers {pricing_info}. {value_proposition}",
      keywords: ["price", "cost", "pricing", "how much", "free", "subscription"]
    },
    duration: {
      questionPattern: "How long does it take to {action} with {brand}?",
      answerPattern: "With {brand}, {duration_info}. {efficiency_note}",
      keywords: ["time", "duration", "how long", "quickly", "fast"]
    },
    criteria: {
      questionPattern: "What are the criteria for choosing {brand}?",
      answerPattern: "Key criteria for {brand} are: {criteria_list}. {recommendation}",
      keywords: ["criteria", "requirements", "prerequisites", "conditions"]
    },
    comparison: {
      questionPattern: "{brand} vs {competitor}: which to choose?",
      answerPattern: "{brand} stands out with {differentiators}. Compared to {competitor}, {comparison_points}",
      keywords: ["vs", "versus", "comparison", "difference", "alternative", "better than"]
    },
    howto: {
      questionPattern: "How to use {brand}?",
      answerPattern: "To use {brand}: {steps}. {tip}",
      keywords: ["how to", "steps", "tutorial", "guide", "use"]
    },
    best: {
      questionPattern: "Is {brand} the best for {use_case}?",
      answerPattern: "{brand} excels for {use_case} thanks to {strengths}. {social_proof}",
      keywords: ["best", "top", "recommended", "ideal"]
    },
    what: {
      questionPattern: "What is {brand}?",
      answerPattern: "{brand} is {definition}. {key_features}",
      keywords: ["what is", "definition", "what's"]
    },
    why: {
      questionPattern: "Why choose {brand}?",
      answerPattern: "Choose {brand} for {main_benefits}. {testimonial}",
      keywords: ["why", "reason", "benefits", "advantages"]
    }
  }
};

// 🔒 FORBIDDEN MARKETING PATTERNS - AEO Safe Mode
const FORBIDDEN_PATTERNS = [
  /50%\s*de\s*trafic/i,
  /incontestablement/i,
  /meilleur choix/i,
  /garanti/i,
  /boost/i,
  /révolutionnaire/i,
  /sans effort/i,
  /best choice/i,
  /guaranteed/i,
  /no effort/i,
  /game.?changer/i,
  /incroyable/i,
  /amazing/i,
  /unbeatable/i,
];

// Sanitize answer to remove marketing language
function sanitizeAnswer(answer: string): string {
  let clean = answer;
  FORBIDDEN_PATTERNS.forEach(rx => {
    clean = clean.replace(rx, "");
  });
  // Clean up extra spaces
  clean = clean.replace(/\s{2,}/g, " ").trim();
  return clean;
}

// Compute AEO citation score
function computeCitationScoreAEO(answer: string, platforms: Platform[]): number {
  let score = 50;
  
  // Length optimization (ideal: 60-150 chars for first sentence)
  const firstSentence = answer.split(/[.!?]/)[0];
  if (firstSentence.length >= 60 && firstSentence.length <= 150) {
    score += 15;
  } else if (firstSentence.length >= 40 && firstSentence.length <= 200) {
    score += 8;
  }
  
  // Contains numbers (specific data)
  const hasNumbers = /\d+/.test(answer);
  if (hasNumbers) score += 10;
  
  // Affirmative tone (starts with subject, not question)
  if (!/^(comment|pourquoi|quand|où|how|why|when|where)/i.test(answer)) {
    score += 8;
  }
  
  // Contains structured elements
  if (answer.includes(":") || answer.includes("-") || answer.includes("•")) {
    score += 7;
  }
  
  // Platform-specific adjustments
  const avgCitationWeight = platforms.reduce((sum, p) => sum + (PLATFORM_CONFIGS[p]?.citationWeight || 0.85), 0) / platforms.length;
  score = Math.round(score * avgCitationWeight);
  
  // Penalty for marketing language detected
  const hasMarketing = FORBIDDEN_PATTERNS.some(rx => rx.test(answer));
  if (hasMarketing) score -= 15;
  
  // Word count check (60-100 words ideal for AEO)
  const wordCount = answer.split(/\s+/).length;
  if (wordCount >= 60 && wordCount <= 100) {
    score += 5;
  } else if (wordCount > 150) {
    score -= 5;
  }
  
  return Math.min(100, Math.max(0, score));
}

// 🔒 AEO STRICT SYSTEM PROMPT - neutral, factual tone
function getAEOStrictSystemPrompt(language: string, brandName: string, intent: string): string {
  return language === "fr"
    ? `Tu es un rédacteur AEO neutre et factuel.

INTERDICTIONS ABSOLUES :
- Aucun superlatif (meilleur, idéal, incontournable, révolutionnaire)
- Aucune promesse chiffrée ou garantie
- Aucun ton marketing ou commercial
- Pas d'appel à l'action

RÈGLES :
- Définition factuelle, ton encyclopédique
- ${brandName} peut être cité 1 fois maximum, naturellement
- 60 à 100 mots maximum
- Première phrase = réponse directe à la question
- Aucune opinion subjective
- Structure claire et extractible par IA

INTENTION DÉTECTÉE : ${intent}`
    : `You are a neutral, factual AEO writer.

ABSOLUTE BANS:
- No superlatives (best, ideal, revolutionary, game-changer)
- No guarantees or promises with numbers
- No marketing or commercial language
- No call to action

RULES:
- Encyclopedic, factual tone
- Mention ${brandName} once max, naturally
- 60-100 words max
- First sentence answers the question directly
- No subjective opinions
- Clear, AI-extractable structure

DETECTED INTENT: ${intent}`;
}

// Generate AI answer using Lovable AI with AEO Safe Mode
async function generateAIAnswer(
  question: string,
  brandName: string,
  websiteUrl: string,
  intent: IntentType,
  language: string,
  apiKey: string
): Promise<{ answer: string; bullets: string[]; faq: Array<{q: string; a: string}> }> {
  const systemPrompt = getAEOStrictSystemPrompt(language, brandName, intent);

  const userPrompt = language === 'fr'
    ? `Question : ${question}

Marque : ${brandName}
Site : ${websiteUrl}

Format JSON strict :
{
  "answer": "réponse factuelle directe",
  "bullets": ["fait 1", "fait 2", "fait 3"],
  "faq": [
    {"q": "question connexe", "a": "réponse courte"},
    {"q": "question connexe", "a": "réponse courte"}
  ]
}`
    : `Question: ${question}

Brand: ${brandName}
Website: ${websiteUrl}

Strict JSON format:
{
  "answer": "direct factual answer",
  "bullets": ["fact 1", "fact 2", "fact 3"],
  "faq": [
    {"q": "related question", "a": "short answer"},
    {"q": "related question", "a": "short answer"}
  ]
}`;

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
        temperature: 0.3, // Lower = more factual, less creative
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add funds to continue.");
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: sanitizeAnswer(parsed.answer || content),
        bullets: parsed.bullets || [],
        faq: parsed.faq || []
      };
    }
    
    return { answer: sanitizeAnswer(content), bullets: [], faq: [] };
  } catch (error) {
    console.error("[generate-aeo-answers] AI generation error:", error);
    throw error;
  }
}

// Detect intent from question
function detectIntent(question: string, language: string): IntentType {
  const templates = INTENT_TEMPLATES[language] || INTENT_TEMPLATES.en;
  const lowerQuestion = question.toLowerCase();
  
  for (const [intent, template] of Object.entries(templates)) {
    if (template.keywords.some(kw => lowerQuestion.includes(kw))) {
      return intent as IntentType;
    }
  }
  
  return 'what'; // Default intent
}

// Generate slug from question
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
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

    const { 
      projectId, 
      questions, // Array of questions to generate answers for
      targetPlatforms = ["chatgpt", "gemini", "claude"],
      language = "fr" 
    } = await req.json();

    console.log(`[generate-aeo-answers] Starting for project: ${projectId}, ${questions?.length || 0} questions`);

    // Get project info
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", userData.user.id)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = project.brand_name || project.name;
    const websiteUrl = project.website_url || "";
    const generatedAnswers: any[] = [];

    // Generate answers for each question
    for (const questionText of questions || []) {
      try {
        const intent = detectIntent(questionText, language);
        const platforms = targetPlatforms as Platform[];
        
        console.log(`[generate-aeo-answers] Generating for: "${questionText}" (intent: ${intent})`);
        
        const generated = await generateAIAnswer(
          questionText,
          brandName,
          websiteUrl,
          intent,
          language,
          lovableApiKey
        );
        
        const score = computeCitationScoreAEO(generated.answer, platforms);
        
        // 🔒 AEO SAFE MODE: Block low-quality answers
        if (score < 50) {
          console.log(`[generate-aeo-answers] ❌ Score too low (${score}), skipping: "${questionText.substring(0, 50)}..."`);
          continue;
        }
        
        // Insert into database
        const { data: inserted, error: insertError } = await supabase
          .from("answers")
          .insert({
            project_id: projectId,
            question: questionText,
            answer: generated.answer,
            slug: generateSlug(questionText),
            platforms: platforms,
            score: score,
            is_public: false,
            intent: intent,
            difficulty: score >= 80 ? 'easy' : score >= 65 ? 'medium' : 'hard',
            high_citation: score >= 75, // Mark as high citation potential
            supporting_content: {
              bullets: generated.bullets,
              faq: generated.faq
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error(`[generate-aeo-answers] Insert error:`, insertError);
        } else {
          console.log(`[generate-aeo-answers] ✅ Saved answer with score ${score}`);
          generatedAnswers.push(inserted);
        }
      } catch (error) {
        console.error(`[generate-aeo-answers] Error for question "${questionText}":`, error);
      }
    }

    console.log(`[generate-aeo-answers] Generated ${generatedAnswers.length} answers`);

    return new Response(JSON.stringify({
      success: true,
      answers: generatedAnswers,
      count: generatedAnswers.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-aeo-answers] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
