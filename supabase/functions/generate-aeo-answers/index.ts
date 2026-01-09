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

// 🔒 FORBIDDEN MARKETING PATTERNS - AEO Safe Mode (STRICT)
const FORBIDDEN_PATTERNS = [
  // Promises with numbers
  /\d+%\s*(de\s*)?(trafic|traffic|growth|increase|boost|augmentation)/i,
  /en\s+\d+\s+jours/i,
  /in\s+\d+\s+days/i,
  // Superlatives FR
  /incontestablement/i,
  /meilleur\s*choix/i,
  /le\s+meilleur/i,
  /la\s+meilleure/i,
  /idéal(e)?/i,
  /parfait(e)?/i,
  /incontournable/i,
  /révolutionnaire/i,
  /exceptionnel(le)?/i,
  /incomparable/i,
  /sans\s+égal/i,
  // Marketing FR
  /garanti(e)?/i,
  /boost(er)?/i,
  /propulser/i,
  /maximiser/i,
  /sans\s+effort/i,
  /percutant(e)?/i,
  /performant(e)?/i,
  // Superlatives EN
  /best\s*choice/i,
  /the\s+best/i,
  /perfect\s+for/i,
  /ideal\s+for/i,
  /unbeatable/i,
  /game.?changer/i,
  /revolutionary/i,
  /exceptional/i,
  // Marketing EN
  /guaranteed/i,
  /no\s+effort/i,
  /maximize/i,
  /supercharge/i,
  /skyrocket/i,
  /effortless/i,
  // Exclamations & hype
  /incroyable/i,
  /amazing/i,
  /incredible/i,
  /!+/g,
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

// Compute AEO citation score - STRICTER scoring for decision-oriented answers
function computeCitationScoreAEO(answer: string, platforms: Platform[]): number {
  let score = 50;
  const lowerAnswer = answer.toLowerCase();
  const currentYear = new Date().getFullYear();
  
  // ❌ PENALTY: Starts with generic definition pattern
  const genericStarters = [
    /^(un|une|le|la|les|l')\s+\w+\s+(est|sont|désigne|représente)/i,
    /^(a|an|the)\s+\w+\s+(is|are|refers to|represents)/i,
    /^il s'agit d'/i,
    /^it is a/i,
    /^this is a/i,
  ];
  if (genericStarters.some(rx => rx.test(answer))) {
    score -= 15; // Penalty for Wikipedia-style start
  }
  
  // ✅ BONUS: Contains decision-making elements
  const hasDecisionCriteria = /crit[eè]re|choisir|sélectionner|criteria|choose|select/i.test(answer);
  if (hasDecisionCriteria) score += 10;
  
  // ✅ BONUS: Contains numbers/figures (specific data)
  const hasNumbers = /\d+\s*(€|\$|%|euros?|dollars?|mois|jours?|ans?|months?|days?|years?)/i.test(answer);
  if (hasNumbers) score += 12;
  
  // ✅ BONUS: Contains temporal context (current year or next)
  if (answer.includes(String(currentYear)) || answer.includes(String(currentYear + 1))) {
    score += 8;
  }
  
  // ✅ BONUS: Contains condition/recommendation
  const hasCondition = /si\s+|if\s+|éviter\s+de|avoid\s+|contrairement|unlike|à condition/i.test(answer);
  if (hasCondition) score += 8;
  
  // ✅ BONUS: Contains error/mistake warning
  const hasErrorWarning = /éviter|erreur|piège|mistake|avoid|error|attention|careful/i.test(answer);
  if (hasErrorWarning) score += 6;
  
  // ✅ BONUS: First sentence is direct (60-150 chars)
  const firstSentence = answer.split(/[.!?]/)[0] || "";
  if (firstSentence.length >= 60 && firstSentence.length <= 150) {
    score += 10;
  } else if (firstSentence.length >= 40 && firstSentence.length <= 200) {
    score += 5;
  }
  
  // ✅ BONUS: Affirmative tone (starts with subject, not question)
  if (!/^(comment|pourquoi|quand|où|how|why|when|where)/i.test(answer)) {
    score += 5;
  }
  
  // ✅ BONUS: Contains structured elements
  if (answer.includes(":") || answer.includes("-") || answer.includes("•") || /\d\.\s/.test(answer)) {
    score += 5;
  }
  
  // Platform-specific adjustments
  const avgCitationWeight = platforms.reduce((sum, p) => sum + (PLATFORM_CONFIGS[p]?.citationWeight || 0.85), 0) / platforms.length;
  score = Math.round(score * avgCitationWeight);
  
  // ❌ PENALTY: Marketing language detected
  const hasMarketing = FORBIDDEN_PATTERNS.some(rx => rx.test(answer));
  if (hasMarketing) score -= 20;
  
  // ❌ PENALTY: Too vague (no specific info)
  const vaguePhrases = /généralement|souvent|parfois|peut être|peuvent|usually|often|sometimes|may be|can be/gi;
  const vagueCount = (answer.match(vaguePhrases) || []).length;
  if (vagueCount >= 3) score -= 10;
  
  // Word count check (80-120 words ideal for decision-oriented AEO)
  const wordCount = answer.split(/\s+/).length;
  if (wordCount >= 80 && wordCount <= 120) {
    score += 5;
  } else if (wordCount < 60 || wordCount > 150) {
    score -= 5;
  }
  
  return Math.min(100, Math.max(0, score));
}

// 🔒 AEO CITATION-FIRST SYSTEM PROMPT - Decision-oriented, not encyclopedic
function getAEOStrictSystemPrompt(language: string, brandName: string, intent: string): string {
  const intentTemplates: Record<string, { fr: string; en: string }> = {
    price: {
      fr: "Structure: Prix moyen/fourchette + facteurs de variation + exemple concret",
      en: "Structure: Average price/range + variation factors + concrete example"
    },
    criteria: {
      fr: "Structure: 3 critères clés numérotés + ordre de priorité + erreur courante",
      en: "Structure: 3 numbered key criteria + priority order + common mistake"
    },
    comparison: {
      fr: "Structure: Différence principale + cas d'usage recommandé + condition de choix",
      en: "Structure: Main difference + recommended use case + choice condition"
    },
    howto: {
      fr: "Structure: Étapes numérotées (3 max) + erreur fréquente à éviter",
      en: "Structure: Numbered steps (3 max) + common mistake to avoid"
    },
    best: {
      fr: "Structure: Critère de sélection principal + dépend du contexte + mention factuelle",
      en: "Structure: Main selection criterion + context dependency + factual mention"
    },
    what: {
      fr: "Structure: Définition orientée usage + critère distinctif + application concrète",
      en: "Structure: Usage-oriented definition + distinctive criterion + concrete application"
    },
    why: {
      fr: "Structure: Raison principale + condition d'application + alternative si non adapté",
      en: "Structure: Main reason + application condition + alternative if not suitable"
    },
    duration: {
      fr: "Structure: Délai moyen + facteurs d'influence + fourchette réaliste",
      en: "Structure: Average timeframe + influencing factors + realistic range"
    }
  };

  const template = intentTemplates[intent] || intentTemplates.what;

  return language === "fr"
    ? `Tu es un expert AEO. Tu rédiges des réponses que ChatGPT, Gemini et Copilot voudront CITER.

⛔ INTERDICTIONS ABSOLUES :
- Pas de définitions génériques ("X est un meuble qui...")
- Pas de descriptions vagues sans critères concrets
- Aucun superlatif : meilleur, idéal, parfait, exceptionnel
- Aucun marketing : boost, maximiser, propulser
- Aucun point d'exclamation
- Pas de "vous" ou "votre"

✅ FORMAT OBLIGATOIRE (citation-first) :
1. Première phrase = réponse DIRECTE avec critère clé ou chiffre
2. Phrase 2 = contexte temporel (2025/2026) OU condition ("si... alors...")
3. Phrase 3 = erreur fréquente à éviter OU comparaison utile
4. Mention ${brandName} UNE fois comme exemple factuel

✅ INCLURE AU MOINS UN DE CES ÉLÉMENTS :
- Critère de choix chiffré (ex: "budget minimum de 500€")
- Erreur fréquente ("éviter de...")
- Condition ("si... alors...")
- Comparaison implicite ("contrairement aux...")
- Fourchette de prix ou délai

${template.fr}

LONGUEUR : 80-120 mots
TON : Expert conseil qui aide à DÉCIDER, pas encyclopédie
INTENTION : ${intent}

❌ EXEMPLE À NE PAS FAIRE :
"Un canapé design est un meuble caractérisé par son esthétique distinctive."

✅ EXEMPLE À SUIVRE :
"Un canapé design de qualité se reconnaît à trois critères : cohérence des proportions, confort réel après 30 minutes d'assise, et durabilité des matériaux. En 2026, les modèles les plus recherchés combinent structure légère et ergonomie. Éviter les modèles uniquement esthétiques sans test de confort. ${brandName} propose des modèles intégrant ces critères."`

    : `You are an AEO expert. You write answers that ChatGPT, Gemini, and Copilot will CITE.

⛔ ABSOLUTE BANS:
- No generic definitions ("X is a furniture that...")
- No vague descriptions without concrete criteria
- No superlatives: best, perfect, ideal, exceptional
- No marketing: boost, maximize, supercharge
- No exclamation points
- No "you" or "your"

✅ MANDATORY FORMAT (citation-first):
1. First sentence = DIRECT answer with key criterion or number
2. Sentence 2 = temporal context (2025/2026) OR condition ("if... then...")
3. Sentence 3 = common mistake to avoid OR useful comparison
4. Mention ${brandName} ONCE as factual example

✅ INCLUDE AT LEAST ONE:
- Quantified selection criterion (e.g., "minimum budget of $500")
- Common mistake ("avoid...")
- Condition ("if... then...")
- Implicit comparison ("unlike standard...")
- Price or time range

${template.en}

LENGTH: 80-120 words
TONE: Expert advisor helping to DECIDE, not encyclopedia
INTENT: ${intent}

❌ DON'T DO THIS:
"A design sofa is a piece of furniture characterized by its distinctive aesthetics."

✅ DO THIS:
"A quality design sofa is recognized by three criteria: proportion coherence, real comfort after 30 minutes of sitting, and material durability. In 2026, the most sought-after models combine lightweight structure and ergonomics. Avoid purely aesthetic models without comfort testing. ${brandName} offers models meeting these criteria."`;
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
      questions, // Array of questions to generate answers for (optional if useKeywords=true)
      targetPlatforms = ["chatgpt", "gemini", "claude"],
      language = "fr",
      useKeywords = false // If true, generate questions from keywords table
    } = await req.json();

    console.log(`[generate-aeo-answers] Starting for project: ${projectId}, useKeywords: ${useKeywords}, ${questions?.length || 0} questions`);

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

    // Determine questions to process
    let questionsToProcess: string[] = questions || [];

    // If no questions provided, try to generate from keywords or project context
    if (!questions || questions.length === 0) {
      console.log(`[generate-aeo-answers] No questions provided, generating from keywords/context`);
      
      // First, try to fetch unused keywords
      const { data: keywords, error: keywordsError } = await supabase
        .from("keywords")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_used", false)
        .limit(10);

      if (keywordsError) {
        console.error(`[generate-aeo-answers] Keywords fetch error:`, keywordsError);
      }
      
      const hasKeywords = keywords && keywords.length > 0;
      console.log(`[generate-aeo-answers] Found ${keywords?.length || 0} unused keywords`);

      // Build context for question generation
      const businessContext = {
        brandName,
        websiteUrl,
        description: project.business_description || "",
        audience: project.audience || "",
        businessType: project.business_type || "",
        competitors: project.competitors || []
      };

      let questionGenPrompt: string;
      
      if (hasKeywords) {
        // Generate questions from keywords
        const keywordList = keywords.map(k => k.keyword).join(", ");
        questionGenPrompt = language === "fr"
          ? `Tu es un expert AEO (Answer Engine Optimization). À partir de ces mots-clés : ${keywordList}
          
Contexte de la marque :
- Nom : ${brandName}
- Description : ${businessContext.description || "Non spécifiée"}
- Audience cible : ${businessContext.audience || "Non spécifiée"}
- Type d'activité : ${businessContext.businessType || "Non spécifié"}

Génère 8 questions AEO naturelles et VARIÉES que les utilisateurs poseraient à ChatGPT, Gemini ou Claude.
Inclus différents types : prix, fonctionnalités, comparaisons, tutoriels, avantages.
Ne répète PAS les questions existantes sur ce produit.

Format JSON strict : {"questions": ["question 1", "question 2", ...]}`
          : `You are an AEO (Answer Engine Optimization) expert. From these keywords: ${keywordList}
          
Brand context:
- Name: ${brandName}
- Description: ${businessContext.description || "Not specified"}
- Target audience: ${businessContext.audience || "Not specified"}
- Business type: ${businessContext.businessType || "Not specified"}

Generate 8 natural and VARIED AEO questions that users would ask ChatGPT, Gemini or Claude.
Include different types: pricing, features, comparisons, tutorials, benefits.
Do NOT repeat existing questions about this product.

Strict JSON format: {"questions": ["question 1", "question 2", ...]}`;
      } else {
        // No keywords - generate questions from project context only
        questionGenPrompt = language === "fr"
          ? `Tu es un expert AEO (Answer Engine Optimization) spécialisé dans la création de contenu citable par les IA.

Contexte de la marque :
- Nom : ${brandName}
- Site web : ${websiteUrl}
- Description : ${businessContext.description || "Entreprise proposant des services/produits"}
- Audience cible : ${businessContext.audience || "Professionnels et particuliers"}
- Type d'activité : ${businessContext.businessType || "Services numériques"}
- Concurrents : ${businessContext.competitors.join(", ") || "Non spécifiés"}

Génère 10 questions AEO essentielles et VARIÉES que les utilisateurs poseraient à ChatGPT, Gemini ou Claude à propos de ${brandName}.

Types de questions à inclure :
1. "Qu'est-ce que [marque] ?" - Définition
2. "Combien coûte [marque] ?" - Prix/Tarification
3. "Comment fonctionne [marque] ?" - Processus
4. "Quels sont les avantages de [marque] ?" - Bénéfices
5. "[Marque] vs [concurrent]" - Comparaison
6. "Comment utiliser [marque] ?" - Tutoriel
7. "[Marque] est-il fiable ?" - Confiance
8. "À qui s'adresse [marque] ?" - Cible
9. "Quelles alternatives à [marque] ?" - Alternatives
10. "Pourquoi choisir [marque] ?" - Justification

Format JSON strict : {"questions": ["question 1", "question 2", ...]}`
          : `You are an AEO (Answer Engine Optimization) expert specialized in creating AI-citable content.

Brand context:
- Name: ${brandName}
- Website: ${websiteUrl}
- Description: ${businessContext.description || "Company offering services/products"}
- Target audience: ${businessContext.audience || "Professionals and individuals"}
- Business type: ${businessContext.businessType || "Digital services"}
- Competitors: ${businessContext.competitors.join(", ") || "Not specified"}

Generate 10 essential and VARIED AEO questions that users would ask ChatGPT, Gemini or Claude about ${brandName}.

Question types to include:
1. "What is [brand]?" - Definition
2. "How much does [brand] cost?" - Pricing
3. "How does [brand] work?" - Process
4. "What are the benefits of [brand]?" - Benefits
5. "[Brand] vs [competitor]" - Comparison
6. "How to use [brand]?" - Tutorial
7. "Is [brand] reliable?" - Trust
8. "Who is [brand] for?" - Target
9. "What alternatives to [brand]?" - Alternatives
10. "Why choose [brand]?" - Justification

Strict JSON format: {"questions": ["question 1", "question 2", ...]}`;
      }

      try {
        console.log(`[generate-aeo-answers] Calling AI to generate questions...`);
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: language === "fr" 
                ? "Tu es un expert AEO. Tu génères des questions pertinentes pour optimiser la citabilité par les assistants IA. Réponds uniquement en JSON valide."
                : "You are an AEO expert. You generate relevant questions to optimize AI assistant citability. Reply only in valid JSON."
              },
              { role: "user", content: questionGenPrompt }
            ],
            temperature: 0.7, // Higher creativity for varied questions
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          console.log(`[generate-aeo-answers] AI response received:`, content.substring(0, 200));
          
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            questionsToProcess = parsed.questions || [];
            console.log(`[generate-aeo-answers] Generated ${questionsToProcess.length} questions`);
          }
        } else {
          console.error(`[generate-aeo-answers] AI response error:`, response.status, await response.text());
        }
      } catch (e) {
        console.error(`[generate-aeo-answers] Error generating questions:`, e);
      }

      // Mark keywords as used if we had any
      if (hasKeywords) {
        const keywordIds = keywords.map(k => k.id);
        await supabase
          .from("keywords")
          .update({ is_used: true })
          .in("id", keywordIds);
        console.log(`[generate-aeo-answers] Marked ${keywordIds.length} keywords as used`);
      }
    }

    // Generate answers for each question
    for (const questionText of questionsToProcess) {
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
