import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadGenerationContext } from "../_shared/project-context.ts";
import { chatCompletion } from "../_shared/ai-call.ts";
import { renderArticlePage } from "../_shared/article-template.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


// Settings interface
interface ArticleSettings {
  articleLength: number;
  englishType: string;
  includeCitations: boolean;
  includeToc: boolean;
  includeSummary: boolean;
  includeInternalLinks: boolean;
  includeSchema: boolean;
  citationsRegion: string;
  specialInstructions: string;
  ctaLink: string;
  imageStyle: string;
  textOverlay: boolean;
  visualInstructions: string;
  includeYoutube: boolean;
  includeScreenshot: boolean;
  sitePages?: Array<{ url: string; title: string | null }>;
}

// Business context interface for rich prompts
interface BusinessContext {
  brandName: string;
  websiteUrl: string;
  businessDescription: string;
  audience: string;
  businessType: string;
  competitors: string[];
  tone: string;
  /** Rendered project_context blocks (business, website, keywords, questions...). */
  contextBlocks?: string;
}

// Generate article content using OpenRouter AI with proper SEO structure and settings
async function generateArticleContentWithSettings(
  question: string,
  answer: string,
  context: BusinessContext,
  language: string,
  settings: ArticleSettings
): Promise<{ content: string; meta_description: string; keywords: string[] }> {
  const { brandName, websiteUrl, businessDescription, audience, businessType, competitors, tone } = context;
  const projectContextBlocks = context.contextBlocks || "";
  
  // Build dynamic instructions based on settings
  const wordRange = settings.articleLength <= 1500 ? "1000-1500" : 
                    settings.articleLength <= 2000 ? "1500-2000" : 
                    settings.articleLength <= 2500 ? "2000-2500" : "2500-3000";
  
  const tocInstruction = settings.includeToc ? 
    (language === 'fr' ? "Inclure une table des matières au début" : "Include a table of contents at the beginning") : "";
  
  const summaryInstruction = settings.includeSummary ? 
    (language === 'fr' ? "Inclure une section résumé" : "Include a summary section") : "";
  
  const schemaInstruction = settings.includeSchema ? 
    (language === 'fr' ? "Ajouter du Schema markup pour le SEO" : "Add Schema markup for SEO") : "";
  
  const ctaInstruction = settings.ctaLink ? 
    (language === 'fr' ? `Inclure un call-to-action vers: ${settings.ctaLink}` : `Include a call-to-action to: ${settings.ctaLink}`) : "";
  
  const specialInst = settings.specialInstructions ? 
    (language === 'fr' ? `Instructions spéciales: ${settings.specialInstructions}` : `Special instructions: ${settings.specialInstructions}`) : "";

  // Build internal linking instruction with actual URLs from sitemap
  let internalLinksInstruction = "";
  if (settings.includeInternalLinks && settings.sitePages && settings.sitePages.length > 0) {
    const pagesList = settings.sitePages
      .slice(0, 20) // Limit to 20 pages to keep prompt manageable
      .map(p => `- ${p.title || p.url}: ${p.url}`)
      .join("\n");
    
    internalLinksInstruction = language === 'fr'
      ? `\n\nMAILLAGE INTERNE OBLIGATOIRE:
Inclure 2-4 liens internes vers ces pages existantes du site. Utilise des ancres naturelles:
${pagesList}

Format: <a href="[URL]">[texte d'ancre naturel]</a>`
      : `\n\nREQUIRED INTERNAL LINKING:
Include 2-4 internal links to these existing site pages. Use natural anchor text:
${pagesList}

Format: <a href="[URL]">[natural anchor text]</a>`;
  }

  // Build business context section for prompts
  const businessContextFr = `
CONTEXTE BUSINESS (utilise ces informations pour personnaliser l'article):
- Marque: ${brandName}
- Site: ${websiteUrl}
${businessDescription ? `- Description: ${businessDescription}` : ""}
${audience ? `- Audience cible: ${audience}` : ""}
${businessType ? `- Type d'activité: ${businessType}` : ""}
${competitors?.length > 0 ? `- Concurrents à différencier: ${competitors.join(", ")}` : ""}
${tone ? `- Ton de voix: ${tone}` : ""}
${projectContextBlocks ? `\n${projectContextBlocks}\n\nAEO ARTICLE : article long extractible par les moteurs de réponse. Ancre chaque section dans les pages, l'offre et l'audience réelles ci-dessus. Aucun contenu générique.` : ""}`;

  const businessContextEn = `
BUSINESS CONTEXT (use this information to personalize the article):
- Brand: ${brandName}
- Website: ${websiteUrl}
${businessDescription ? `- Description: ${businessDescription}` : ""}
${audience ? `- Target audience: ${audience}` : ""}
${businessType ? `- Business type: ${businessType}` : ""}
${competitors?.length > 0 ? `- Competitors to differentiate from: ${competitors.join(", ")}` : ""}
${tone ? `- Tone of voice: ${tone}` : ""}
${projectContextBlocks ? `\n${projectContextBlocks}\n\nAEO ARTICLE: long-form answer content built to be extracted by answer engines. Ground every section in the real pages, offering and audience above. No generic filler.` : ""}`;

  const systemPrompt = language === 'fr'
    ? `Tu es un expert en rédaction AEO (Answer Engine Optimization). Tu génères des articles optimisés pour être CITÉS par ChatGPT, Gemini, Perplexity et autres IA.
${businessContextFr}

RÈGLE D'OR AEO : "Répondre d'abord comme Wikipédia, puis parler comme une marque."

PRINCIPES AEO CRITIQUES:
1. LA RÉPONSE EN PREMIER : Les 2-3 premières phrases doivent contenir LA RÉPONSE DIRECTE à la question (chiffres, fourchettes, faits concrets)
2. NEUTRALITÉ D'ABORD : Pas de "Chez [marque], nous..." avant d'avoir donné la réponse factuelle
3. CITABILITÉ : Le premier paragraphe (60-90 mots max) doit être extractable tel quel par une IA
4. DONNÉES STRUCTURÉES : Utiliser des listes à puces pour les repères chiffrés
5. MARQUE APRÈS : La marque n'apparaît qu'APRÈS la réponse factuelle, en contexte

STRUCTURE HTML:
- Un seul H1 (reformulation de la question en titre)
- H2 pour les sections principales
- H3 pour les sous-sections
- <strong> pour les données clés (prix, pourcentages, dates)
- Listes à puces pour les repères extractables

PARAMÈTRES SPÉCIFIQUES:
- Longueur cible: ${wordRange} mots
- Type d'anglais: ${settings.englishType}
- Ton: ${tone || "Expert et factuel"}
${tocInstruction ? `- ${tocInstruction}` : ""}
${summaryInstruction ? `- ${summaryInstruction}` : ""}
${schemaInstruction ? `- ${schemaInstruction}` : ""}
${ctaInstruction ? `- ${ctaInstruction}` : ""}
${specialInst ? `- ${specialInst}` : ""}`
    : `You are an AEO (Answer Engine Optimization) writing expert. You generate articles optimized to be CITED by ChatGPT, Gemini, Perplexity and other AI assistants.
${businessContextEn}

GOLDEN AEO RULE: "Answer first like Wikipedia, then speak like a brand."

CRITICAL AEO PRINCIPLES:
1. ANSWER FIRST: The first 2-3 sentences must contain THE DIRECT ANSWER to the question (numbers, ranges, concrete facts)
2. NEUTRALITY FIRST: No "At [brand], we..." before giving the factual answer
3. CITABILITY: The first paragraph (60-90 words max) must be extractable as-is by an AI
4. STRUCTURED DATA: Use bullet lists for numerical benchmarks
5. BRAND AFTER: The brand only appears AFTER the factual answer, in context

HTML STRUCTURE:
- DO NOT include an H1 tag (title is rendered separately as a hero header by the editorial template)
- Start with a direct opening paragraph (gets a decorative drop cap)
- H2 for main sections
- H3 for subsections
- <strong> for key data (prices, percentages, dates)
- <blockquote> for at least one impactful pull-quote
- Bullet lists for extractable benchmarks

SPECIFIC SETTINGS:
- Target length: ${wordRange} words
- English type: ${settings.englishType}
- Tone: ${tone || "Expert and factual"}
${tocInstruction ? `- ${tocInstruction}` : ""}
${summaryInstruction ? `- ${summaryInstruction}` : ""}
${schemaInstruction ? `- ${schemaInstruction}` : ""}
${ctaInstruction ? `- ${ctaInstruction}` : ""}
${specialInst ? `- ${specialInst}` : ""}${internalLinksInstruction}`;

  const userPrompt = language === 'fr'
    ? `Génère un article AEO de ${wordRange} mots, optimisé pour être cité par les IA.

SUJET:
- Question: ${question}
- Réponse courte: ${answer}
- Marque: ${brandName}
${businessDescription ? `- Description activité: ${businessDescription}` : ""}
${audience ? `- Audience cible: ${audience}` : ""}

STRUCTURE AEO OBLIGATOIRE (en HTML propre):

${settings.includeToc ? `<!-- TABLE DES MATIÈRES -->
<nav class="toc">
<h2>Sommaire</h2>
<ul>
  <li><a href="#section1">[Titre section 1]</a></li>
  <li><a href="#section2">[Titre section 2]</a></li>
  <li><a href="#section3">[Titre section 3]</a></li>
</ul>
</nav>

` : ""}<!-- BLOC 1: RÉPONSE DIRECTE (CRITIQUE pour l'AEO) -->
<!-- PAS DE H1 : le titre est affiché séparément dans le template éditorial -->

<p class="aeo-answer"><strong>[RÉPONSE DIRECTE en 1-2 phrases avec les chiffres/faits clés]</strong>. [1-2 phrases de contexte factuel, SANS mentionner la marque].</p>

${settings.includeSummary ? `<div class="aeo-summary">
<p><strong>Repères clés :</strong></p>
<ul>
  <li><strong>[Fourchette basse]</strong> : [description courte et factuelle]</li>
  <li><strong>[Fourchette haute]</strong> : [description courte et factuelle]</li>
  <li><strong>[Critère important]</strong> : [explication factuelle]</li>
</ul>
</div>

` : ""}<!-- BLOC 2: DÉVELOPPEMENT (SEO + contexte) -->
<h2 id="section1">Comprendre [sujet principal]</h2>
<p>[Explication détaillée et pédagogique, 3-4 phrases]</p>
<p>[Contexte marché, tendances ou statistiques si pertinent]</p>

<blockquote>[Citation impactante ou insight clé sur le sujet - pour l'effet pull-quote éditorial]</blockquote>

<h2 id="section2">[Critères / Facteurs / Avantages]</h2>
<ul>
  <li><strong>[Point 1]</strong> : [Explication]</li>
  <li><strong>[Point 2]</strong> : [Explication]</li>
  <li><strong>[Point 3]</strong> : [Explication]</li>
</ul>

<hr>

<h2 id="section3">Comment [action/choix lié au sujet]</h2>
<p>[Méthode ou processus expliqué]</p>

<h3>Les étapes essentielles</h3>
<ol>
  <li>[Étape 1 avec détails]</li>
  <li>[Étape 2 avec détails]</li>
  <li>[Étape 3 avec détails]</li>
</ol>

<!-- BLOC 3: CONCLUSION avec marque -->
<h2>L'essentiel à retenir</h2>
<p>[Résumé factuel en 2-3 phrases]. Chez ${brandName}, [positionnement de la marque sur ce sujet, 1-2 phrases].</p>

${settings.ctaLink ? `<div class="cta-section">
<a href="${settings.ctaLink}" class="cta-button">En savoir plus</a>
</div>` : ""}

RÈGLES STRICTES:
1. NE PAS inclure de balise H1 - le titre est affiché séparément par le template éditorial
2. Le premier paragraphe (class="aeo-answer") DOIT contenir la réponse factuelle SANS mention de la marque
3. La marque ${brandName} n'apparaît QUE dans la conclusion
4. Tous les chiffres/prix/pourcentages doivent être en <strong>
5. Inclure au moins un <blockquote> pour l'effet pull-quote
6. Génère UNIQUEMENT le HTML du contenu (pas de <!DOCTYPE>, <html>, <head>, <body>)
7. L'article doit faire environ ${settings.articleLength} mots

Réponds en JSON:
{
  "content": "[HTML de l'article AEO complet - SANS H1]",
  "meta_description": "[Description meta de 150-160 caractères avec la réponse clé]",
  "keywords": ["mot-clé principal", "mot-clé secondaire 1", "mot-clé secondaire 2", "mot-clé secondaire 3"]
}`
    : `Generate a ${wordRange} word AEO article, optimized to be cited by AI assistants.

TOPIC:
- Question: ${question}
- Short answer: ${answer}
- Brand: ${brandName}

REQUIRED AEO STRUCTURE (in clean HTML):

${settings.includeToc ? `<!-- TABLE OF CONTENTS -->
<nav class="toc">
<h2>Contents</h2>
<ul>
  <li><a href="#section1">[Section 1 title]</a></li>
  <li><a href="#section2">[Section 2 title]</a></li>
  <li><a href="#section3">[Section 3 title]</a></li>
</ul>
</nav>

` : ""}<!-- BLOCK 1: DIRECT ANSWER (CRITICAL for AEO) -->
<!-- NO H1 TAG: the title is displayed separately by the editorial template as a hero header -->

<p class="aeo-answer"><strong>[DIRECT ANSWER in 1-2 sentences with key figures/facts]</strong>. [1-2 sentences of factual context, WITHOUT mentioning the brand].</p>

${settings.includeSummary ? `<div class="aeo-summary">
<p><strong>Key benchmarks:</strong></p>
<ul>
  <li><strong>[Low range]</strong>: [short factual description]</li>
  <li><strong>[High range]</strong>: [short factual description]</li>
  <li><strong>[Important criterion]</strong>: [factual explanation]</li>
</ul>
</div>

` : ""}<!-- BLOCK 2: DEVELOPMENT (SEO + context) -->
<h2 id="section1">Understanding [main topic]</h2>
<p>[Detailed pedagogical explanation, 3-4 sentences]</p>
<p>[Market context, trends or statistics if relevant]</p>

<blockquote>[Impactful insight or key quote about the topic - for editorial pull-quote effect]</blockquote>

<h2 id="section2">[Criteria / Factors / Benefits]</h2>
<ul>
  <li><strong>[Point 1]</strong>: [Explanation]</li>
  <li><strong>[Point 2]</strong>: [Explanation]</li>
  <li><strong>[Point 3]</strong>: [Explanation]</li>
</ul>

<hr>

<h2 id="section3">How to [action/choice related to topic]</h2>
<p>[Method or process explained]</p>

<h3>Essential steps</h3>
<ol>
  <li>[Step 1 with details]</li>
  <li>[Step 2 with details]</li>
  <li>[Step 3 with details]</li>
</ol>

<!-- BLOCK 3: CONCLUSION with brand -->
<h2>Key takeaways</h2>
<p>[Factual summary in 2-3 sentences]. At ${brandName}, [brand positioning on this topic, 1-2 sentences].</p>

${settings.ctaLink ? `<div class="cta-section">
<a href="${settings.ctaLink}" class="cta-button">Learn more</a>
</div>` : ""}

STRICT RULES:
1. DO NOT include any H1 tag - the title is rendered separately by the editorial template
2. The first paragraph (class="aeo-answer") MUST contain the factual answer WITHOUT brand mention
3. Brand ${brandName} only appears in the conclusion
4. All figures/prices/percentages must be in <strong>
5. Include at least one <blockquote> for the editorial pull-quote effect
6. Generate ONLY the HTML content (no <!DOCTYPE>, <html>, <head>, <body>)
7. Article should be approximately ${settings.articleLength} words

Reply in JSON:
{
  "content": "[Complete AEO article HTML - NO H1 TAG]",
  "meta_description": "[Meta description of 150-160 characters with the key answer]",
  "keywords": ["main keyword", "secondary keyword 1", "secondary keyword 2", "secondary keyword 3"]
}`;

  const data = await chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.55,
    max_tokens: 4000,
  });

  const content = data.choices?.[0]?.message?.content || "";
  
  return safeParseJSON<{ content: string; meta_description: string; keywords: string[] }>(
    content, 
    { content, meta_description: "", keywords: [] }
  );
}

// Safe JSON parsing with fallback
function safeParseJSON<T>(raw: string, fallback: T): T {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]);
  } catch {
    return fallback;
  }
}

// Generate slug for articles
function generateArticleSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    // The daily planning cron calls this with the service role key (no
    // human session behind it) to generate the AEO article for an answer
    // it just created unattended — skip the user/ownership check for that
    // case, same pattern used elsewhere for cron-callable functions.
    const isServiceRole = token === supabaseServiceKey;
    let userId: string | null = null;
    if (!isServiceRole) {
      // Create client with user's auth header for getClaims
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        console.error("[generate-aeo-article] Auth error:", claimsError);
        return new Response(JSON.stringify({ error: "Invalid JWT" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = claimsData.claims.sub as string;
    }

    // Use service role client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { answerId, language = "fr" } = await req.json();

    console.log(`[generate-aeo-article] Generating article for answer: ${answerId}`);

    // Get the answer
    const { data: answer, error: answerError } = await supabase
      .from("answers")
      .select("*, projects(*)")
      .eq("id", answerId)
      .single();

    if (answerError || !answer) {
      return new Response(JSON.stringify({ error: "Answer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership (skipped for the service-role/cron caller — there's
    // no end user to own the request, the answer's own project_id is trust
    // enough since it was itself created by the same cron for this project).
    if (userId && answer.projects?.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = answer.projects?.brand_name || answer.projects?.name || "Brand";
    const websiteUrl = answer.projects?.website_url || "";

    // Fetch generation settings for tone and additional context
    const { data: genSettings } = await supabase
      .from("generation_settings")
      .select("*")
      .eq("project_id", answer.project_id)
      .maybeSingle();

    // Build complete business context
    const businessContext: BusinessContext = {
      brandName,
      websiteUrl,
      businessDescription: genSettings?.business_description || answer.projects?.business_description || "",
      audience: (genSettings?.target_audiences?.join(", ") || answer.projects?.audience || ""),
      businessType: answer.projects?.business_type || "",
      competitors: genSettings?.competitors || answer.projects?.competitors || [],
      tone: genSettings?.tone || ""
    };

    // Fail-safe project context — generation continues even if DataForSEO is down.
    {
      const { blocks, readiness, degraded } = await loadGenerationContext(supabase, answer.project_id, { maxKeywords: 20 });
      businessContext.contextBlocks = blocks;
      console.log(`[generate-aeo-article] context readiness=${readiness} degraded=${degraded.join(" | ") || "none"}`);
    }

    console.log(`[generate-aeo-article] Business context loaded:`, {
      brandName: businessContext.brandName,
      hasDescription: !!businessContext.businessDescription,
      hasAudience: !!businessContext.audience,
      hasTone: !!businessContext.tone
    });

    // Load project settings for article generation
    const { data: projectSettings } = await supabase
      .from("project_settings")
      .select("*")
      .eq("project_id", answer.project_id)
      .maybeSingle();

    // Extract settings with defaults
    const settings = {
      articleLength: projectSettings?.article_length || 2000,
      englishType: projectSettings?.english_type || "American",
      includeCitations: projectSettings?.include_citations ?? true,
      includeToc: projectSettings?.include_toc ?? true,
      includeSummary: projectSettings?.include_summary ?? true,
      includeInternalLinks: projectSettings?.include_internal_links ?? true,
      includeSchema: projectSettings?.include_schema ?? false,
      citationsRegion: projectSettings?.citations_region || "Worldwide",
      specialInstructions: projectSettings?.special_instructions || "",
      ctaLink: projectSettings?.cta_link || "",
      imageStyle: projectSettings?.image_style || "photo",
      textOverlay: projectSettings?.text_overlay ?? true,
      visualInstructions: projectSettings?.visual_instructions || "",
      includeYoutube: projectSettings?.include_youtube ?? false,
      includeScreenshot: projectSettings?.include_screenshot ?? true,
      sitePages: [] as Array<{ url: string; title: string | null }>,
    };

    // Fetch site pages for internal linking if enabled
    if (settings.includeInternalLinks) {
      const { data: sitePages } = await supabase
        .from("site_pages")
        .select("url, title")
        .eq("project_id", answer.project_id)
        .limit(100);
      
      if (sitePages && sitePages.length > 0) {
        settings.sitePages = sitePages;
        console.log(`[generate-aeo-article] Found ${sitePages.length} site pages for internal linking`);
      }
    }

    console.log(`[generate-aeo-article] Using settings:`, { ...settings, sitePages: settings.sitePages.length });

    // Generate article content with settings and full business context
    const articleContent = await generateArticleContentWithSettings(
      answer.question,
      answer.answer,
      businessContext,
      language,
      settings
    );

    // Generate full HTML with proper SEO structure
    const fullHtml = renderArticlePage({
      kind: "aeo",
      title: answer.question,
      dek: articleContent.meta_description,
      bodyMarkdown: articleContent.content,
      metaDescription: articleContent.meta_description,
      brandName,
      websiteUrl,
      language,
      keyTakeaway: answer.answer,
      faq: answer.supporting_content?.faq || [],
    });

    // Create article in database
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .insert({
        project_id: answer.project_id,
        title: answer.question,
        slug: generateArticleSlug(answer.question),
        content: articleContent.content,
        html_content: fullHtml,
        meta_description: articleContent.meta_description,
        keywords: articleContent.keywords,
        status: "draft",
        aeo_score: answer.score
      })
      .select()
      .single();

    if (articleError) {
      console.error("[generate-aeo-article] Error creating article:", articleError);
      return new Response(JSON.stringify({ error: "Failed to create article" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link article to answer
    await supabase
      .from("answers")
      .update({ article_id: article.id, has_article: true })
      .eq("id", answerId);

    console.log(`[generate-aeo-article] Created article ${article.id} for answer ${answerId}`);

    return new Response(JSON.stringify({
      success: true,
      article: article,
      html: fullHtml
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-aeo-article] Error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
