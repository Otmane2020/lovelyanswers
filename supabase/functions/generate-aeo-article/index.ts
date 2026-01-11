import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate AEO-optimized HTML article wrapper with proper SEO structure
function generateAEOArticleHTML(
  answer: {
    question: string;
    answer: string;
    supporting_content?: { bullets?: string[]; faq?: Array<{q: string; a: string}> };
  },
  articleContent: string,
  metaDescription: string,
  brandName: string,
  websiteUrl: string,
  language: string
): string {
  const faq = answer.supporting_content?.faq || [];
  
  // Build FAQ Schema
  const faqSchema = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  } : null;

  // Build Article Schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": answer.question,
    "description": metaDescription || answer.answer.slice(0, 160),
    "author": {
      "@type": "Organization",
      "name": brandName
    },
    "publisher": {
      "@type": "Organization",
      "name": brandName,
      "url": websiteUrl
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString()
  };

  const faqTitle = language === 'fr' ? 'Questions Fréquentes' : 'Frequently Asked Questions';

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${answer.question} | ${brandName}</title>
  <meta name="description" content="${metaDescription || answer.answer.slice(0, 160)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${websiteUrl}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${answer.question}">
  <meta property="og:description" content="${metaDescription || answer.answer.slice(0, 160)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${websiteUrl}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${answer.question}">
  <meta name="twitter:description" content="${metaDescription || answer.answer.slice(0, 160)}">
  
  <!-- Schema.org Article -->
  <script type="application/ld+json">
${JSON.stringify(articleSchema, null, 2)}
  </script>
  
  ${faqSchema ? `<!-- Schema.org FAQ -->
  <script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
  </script>` : ''}
  
  <style>
    :root {
      --primary: #7c3aed;
      --primary-light: #a78bfa;
      --bg: #ffffff;
      --surface: #f8fafc;
      --surface-alt: #f1f5f9;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --success: #10b981;
      --accent: #6366f1;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0f172a;
        --surface: #1e293b;
        --surface-alt: #334155;
        --text: #f1f5f9;
        --text-muted: #94a3b8;
        --border: #475569;
      }
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.8;
      font-size: 16px;
    }
    
    article {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    
    /* Typography Hierarchy */
    h1 {
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 1.5rem;
      color: var(--text);
      letter-spacing: -0.025em;
    }
    
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      color: var(--text);
      border-bottom: 2px solid var(--primary);
      padding-bottom: 0.5rem;
    }
    
    h3 {
      font-size: 1.25rem;
      font-weight: 600;
      line-height: 1.4;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: var(--text);
    }
    
    p {
      margin-bottom: 1.25rem;
      color: var(--text);
    }
    
    p.intro {
      font-size: 1.125rem;
      color: var(--text-muted);
      border-left: 4px solid var(--primary);
      padding-left: 1rem;
      margin-bottom: 2rem;
    }
    
    /* Lists */
    ul, ol {
      margin-bottom: 1.5rem;
      padding-left: 1.5rem;
    }
    
    li {
      margin-bottom: 0.75rem;
      padding-left: 0.5rem;
    }
    
    ul li::marker {
      color: var(--primary);
    }
    
    ol li::marker {
      color: var(--primary);
      font-weight: 600;
    }
    
    /* Text styling */
    strong {
      font-weight: 600;
      color: var(--text);
    }
    
    em {
      font-style: italic;
      color: var(--text-muted);
    }
    
    /* AEO Answer Box - Critical for AI citation */
    .aeo-answer {
      font-size: 1.15rem;
      line-height: 1.8;
      color: var(--text);
      background: var(--surface);
      border-left: 4px solid var(--primary);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: 0 0.5rem 0.5rem 0;
    }
    
    .aeo-answer strong {
      color: var(--primary);
    }
    
    /* AEO Summary Box - Key benchmarks */
    .aeo-summary {
      background: var(--surface-alt);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2rem;
    }
    
    .aeo-summary > p {
      margin-bottom: 0.75rem;
      font-weight: 600;
    }
    
    .aeo-summary ul {
      margin-bottom: 0;
    }
    
    .aeo-summary li {
      margin-bottom: 0.5rem;
    }
    
    .aeo-summary li:last-child {
      margin-bottom: 0;
    }
    
    /* AEO Featured Answer Box - Short answer recap */
    .aeo-featured-answer {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      border-radius: 1rem;
      padding: 1.5rem 2rem;
      margin: 2rem 0;
      box-shadow: 0 10px 40px -10px rgba(124, 58, 237, 0.3);
    }
    
    .aeo-featured-answer p {
      font-size: 1.125rem;
      color: white;
      font-weight: 500;
      margin: 0;
      line-height: 1.7;
    }
    
    /* FAQ Section */
    .faq-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 2rem;
      margin-top: 3rem;
    }
    
    .faq-section h2 {
      margin-top: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .faq-item {
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 0;
    }
    
    .faq-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .faq-item h3 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }
    
    .faq-item p {
      margin-bottom: 0;
      color: var(--text-muted);
    }
    
    /* Footer */
    footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      margin-top: 3rem;
    }
    
    footer p {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin: 0;
    }
    
    footer a {
      color: var(--primary);
      text-decoration: none;
      font-weight: 500;
    }
    
    footer a:hover {
      text-decoration: underline;
    }
    
    /* Responsive */
    @media (max-width: 640px) {
      h1 { font-size: 1.75rem; }
      h2 { font-size: 1.25rem; }
      h3 { font-size: 1.1rem; }
      article { padding: 1.5rem 1rem; }
    }
  </style>
</head>
<body>
  <article itemscope itemtype="https://schema.org/Article">
    <header>
      <meta itemprop="datePublished" content="${new Date().toISOString()}">
      <meta itemprop="author" content="${brandName}">
    </header>
    
    <!-- Main Article Content with SEO Structure -->
    <main itemprop="articleBody">
      ${articleContent}
      
      <!-- AEO Featured Answer Box -->
      <div class="aeo-featured-answer">
        <p><strong>En résumé :</strong> ${answer.answer}</p>
      </div>
    </main>
    
    ${faq.length > 0 ? `
    <!-- FAQ Section with Schema -->
    <section class="faq-section" itemscope itemtype="https://schema.org/FAQPage">
      <h2>❓ ${faqTitle}</h2>
      ${faq.map(f => `
      <div class="faq-item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
        <h3 itemprop="name">${f.q}</h3>
        <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
          <p itemprop="text">${f.a}</p>
        </div>
      </div>
      `).join('')}
    </section>
    ` : ''}
    
    <footer>
      <p>© ${new Date().getFullYear()} <a href="${websiteUrl}" target="_blank" rel="noopener">${brandName}</a></p>
    </footer>
  </article>
</body>
</html>`;
}

// Generate article content using Lovable AI with proper SEO structure
async function generateArticleContent(
  question: string,
  answer: string,
  brandName: string,
  language: string,
  apiKey: string
): Promise<{ content: string; meta_description: string; keywords: string[] }> {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en rédaction AEO (Answer Engine Optimization). Tu génères des articles optimisés pour être CITÉS par ChatGPT, Gemini, Perplexity et autres IA.

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
- Listes à puces pour les repères extractables`
    : `You are an AEO (Answer Engine Optimization) writing expert. You generate articles optimized to be CITED by ChatGPT, Gemini, Perplexity and other AI assistants.

GOLDEN AEO RULE: "Answer first like Wikipedia, then speak like a brand."

CRITICAL AEO PRINCIPLES:
1. ANSWER FIRST: The first 2-3 sentences must contain THE DIRECT ANSWER to the question (numbers, ranges, concrete facts)
2. NEUTRALITY FIRST: No "At [brand], we..." before giving the factual answer
3. CITABILITY: The first paragraph (60-90 words max) must be extractable as-is by an AI
4. STRUCTURED DATA: Use bullet lists for numerical benchmarks
5. BRAND AFTER: The brand only appears AFTER the factual answer, in context

HTML STRUCTURE:
- Only one H1 (rephrasing the question as a title)
- H2 for main sections
- H3 for subsections
- <strong> for key data (prices, percentages, dates)
- Bullet lists for extractable benchmarks`;

  const userPrompt = language === 'fr'
    ? `Génère un article AEO de 500-700 mots, optimisé pour être cité par les IA.

SUJET:
- Question: ${question}
- Réponse courte: ${answer}
- Marque: ${brandName}

STRUCTURE AEO OBLIGATOIRE (en HTML propre):

<!-- BLOC 1: RÉPONSE DIRECTE (CRITIQUE pour l'AEO) -->
<h1>[Reformulation claire de la question en titre]</h1>

<p class="aeo-answer"><strong>[RÉPONSE DIRECTE en 1-2 phrases avec les chiffres/faits clés]</strong>. [1-2 phrases de contexte factuel, SANS mentionner la marque].</p>

<div class="aeo-summary">
<p><strong>Repères clés :</strong></p>
<ul>
  <li><strong>[Fourchette basse]</strong> : [description courte et factuelle]</li>
  <li><strong>[Fourchette haute]</strong> : [description courte et factuelle]</li>
  <li><strong>[Critère important]</strong> : [explication factuelle]</li>
</ul>
</div>

<!-- BLOC 2: DÉVELOPPEMENT (SEO + contexte) -->
<h2>Comprendre [sujet principal]</h2>
<p>[Explication détaillée et pédagogique, 3-4 phrases]</p>
<p>[Contexte marché, tendances ou statistiques si pertinent]</p>

<h2>[Critères / Facteurs / Avantages]</h2>
<ul>
  <li><strong>[Point 1]</strong> : [Explication]</li>
  <li><strong>[Point 2]</strong> : [Explication]</li>
  <li><strong>[Point 3]</strong> : [Explication]</li>
</ul>

<h2>Comment [action/choix lié au sujet]</h2>
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

RÈGLES STRICTES:
1. Le premier paragraphe (class="aeo-answer") DOIT contenir la réponse factuelle SANS mention de la marque
2. La marque ${brandName} n'apparaît QUE dans la conclusion
3. Tous les chiffres/prix/pourcentages doivent être en <strong>
4. Génère UNIQUEMENT le HTML du contenu (pas de <!DOCTYPE>, <html>, <head>, <body>)

Réponds en JSON:
{
  "content": "[HTML de l'article AEO complet]",
  "meta_description": "[Description meta de 150-160 caractères avec la réponse clé]",
  "keywords": ["mot-clé principal", "mot-clé secondaire 1", "mot-clé secondaire 2", "mot-clé secondaire 3"]
}`
    : `Generate a 500-700 word AEO article, optimized to be cited by AI assistants.

TOPIC:
- Question: ${question}
- Short answer: ${answer}
- Brand: ${brandName}

REQUIRED AEO STRUCTURE (in clean HTML):

<!-- BLOCK 1: DIRECT ANSWER (CRITICAL for AEO) -->
<h1>[Clear rephrasing of the question as a title]</h1>

<p class="aeo-answer"><strong>[DIRECT ANSWER in 1-2 sentences with key figures/facts]</strong>. [1-2 sentences of factual context, WITHOUT mentioning the brand].</p>

<div class="aeo-summary">
<p><strong>Key benchmarks:</strong></p>
<ul>
  <li><strong>[Low range]</strong>: [short factual description]</li>
  <li><strong>[High range]</strong>: [short factual description]</li>
  <li><strong>[Important criterion]</strong>: [factual explanation]</li>
</ul>
</div>

<!-- BLOCK 2: DEVELOPMENT (SEO + context) -->
<h2>Understanding [main topic]</h2>
<p>[Detailed pedagogical explanation, 3-4 sentences]</p>
<p>[Market context, trends or statistics if relevant]</p>

<h2>[Criteria / Factors / Benefits]</h2>
<ul>
  <li><strong>[Point 1]</strong>: [Explanation]</li>
  <li><strong>[Point 2]</strong>: [Explanation]</li>
  <li><strong>[Point 3]</strong>: [Explanation]</li>
</ul>

<h2>How to [action/choice related to topic]</h2>
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

STRICT RULES:
1. The first paragraph (class="aeo-answer") MUST contain the factual answer WITHOUT brand mention
2. Brand ${brandName} only appears in the conclusion
3. All figures/prices/percentages must be in <strong>
4. Generate ONLY the HTML content (no <!DOCTYPE>, <html>, <head>, <body>)

Reply in JSON:
{
  "content": "[Complete AEO article HTML]",
  "meta_description": "[Meta description of 150-160 characters with the key answer]",
  "keywords": ["main keyword", "secondary keyword 1", "secondary keyword 2", "secondary keyword 3"]
}`;

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
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
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
  let slug = text.toLowerCase();
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's auth header for getClaims
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[generate-aeo-article] Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    
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

    // Verify ownership
    if (answer.projects?.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brandName = answer.projects?.brand_name || answer.projects?.name || "Brand";
    const websiteUrl = answer.projects?.website_url || "";

    // Generate article content
    const articleContent = await generateArticleContent(
      answer.question,
      answer.answer,
      brandName,
      language,
      lovableApiKey
    );

    // Generate full HTML with proper SEO structure
    const fullHtml = generateAEOArticleHTML(
      {
        question: answer.question,
        answer: answer.answer,
        supporting_content: answer.supporting_content
      },
      articleContent.content,
      articleContent.meta_description,
      brandName,
      websiteUrl,
      language
    );

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
