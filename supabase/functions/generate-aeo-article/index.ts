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
    
    /* AEO Answer Box - Featured Snippet Style */
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
    ? `Tu es un expert en rédaction SEO/AEO. Tu génères des articles HTML parfaitement structurés pour le SEO et optimisés pour être cités par les IA.

RÈGLES HTML SEO CRITIQUES:
- Un seul H1 (le titre principal)
- Utilise H2 pour les sections principales
- Utilise H3 pour les sous-sections
- Chaque section doit avoir 2-4 paragraphes
- Utilise des listes à puces (<ul>) et numérotées (<ol>) pour la lisibilité
- Inclus des balises <strong> pour les mots-clés importants
- Ajoute des balises <em> pour l'emphase
- Structure logique: Introduction > Corps > Conclusion
- Paragraphes courts (3-4 phrases max)
- Phrases claires et directes`
    : `You are an SEO/AEO writing expert. You generate perfectly structured HTML articles for SEO, optimized to be cited by AI assistants.

CRITICAL HTML SEO RULES:
- Only one H1 (the main title)
- Use H2 for main sections
- Use H3 for subsections
- Each section should have 2-4 paragraphs
- Use bullet lists (<ul>) and numbered lists (<ol>) for readability
- Include <strong> tags for important keywords
- Add <em> tags for emphasis
- Logical structure: Introduction > Body > Conclusion
- Short paragraphs (3-4 sentences max)
- Clear and direct sentences`;

  const userPrompt = language === 'fr'
    ? `Génère un article AEO de 500-700 mots avec une structure HTML SEO parfaite.

SUJET:
- Question: ${question}
- Réponse courte: ${answer}
- Marque: ${brandName}

STRUCTURE REQUISE (en HTML propre):

<h1>[Titre accrocheur incluant le mot-clé principal]</h1>

<p class="intro">[Introduction de 2-3 phrases qui accroche le lecteur et introduit le sujet]</p>

<h2>Comprendre [sujet principal]</h2>
<p>[Explication détaillée du concept, 3-4 phrases]</p>
<p>[Contexte additionnel ou statistiques si pertinent]</p>

<h2>Les avantages clés</h2>
<ul>
  <li><strong>[Avantage 1]</strong>: [Explication courte]</li>
  <li><strong>[Avantage 2]</strong>: [Explication courte]</li>
  <li><strong>[Avantage 3]</strong>: [Explication courte]</li>
</ul>

<h2>Comment [action liée au sujet]</h2>
<p>[Explication du processus ou de la méthode]</p>

<h3>Étape par étape</h3>
<ol>
  <li>[Première étape avec détails]</li>
  <li>[Deuxième étape avec détails]</li>
  <li>[Troisième étape avec détails]</li>
</ol>

<h2>Points essentiels à retenir</h2>
<p>[Résumé des points clés, 2-3 phrases]</p>
<ul>
  <li>[Point clé 1]</li>
  <li>[Point clé 2]</li>
  <li>[Point clé 3]</li>
</ul>

<h2>Conclusion</h2>
<p>[Conclusion avec appel à l'action mentionnant ${brandName}]</p>

IMPORTANT: Génère UNIQUEMENT le HTML du contenu (pas de <!DOCTYPE>, <html>, <head>, <body>). Juste le contenu de l'article.

Réponds en JSON:
{
  "content": "[HTML de l'article complet avec H1, H2, H3, p, ul, ol, strong, em]",
  "meta_description": "[Description meta de 150-160 caractères avec mot-clé principal]",
  "keywords": ["mot-clé principal", "mot-clé secondaire 1", "mot-clé secondaire 2", "mot-clé secondaire 3"]
}`
    : `Generate a 500-700 word AEO article with perfect SEO HTML structure.

TOPIC:
- Question: ${question}
- Short answer: ${answer}
- Brand: ${brandName}

REQUIRED STRUCTURE (in clean HTML):

<h1>[Catchy title including main keyword]</h1>

<p class="intro">[Introduction of 2-3 sentences that hooks the reader and introduces the topic]</p>

<h2>Understanding [main topic]</h2>
<p>[Detailed explanation of the concept, 3-4 sentences]</p>
<p>[Additional context or statistics if relevant]</p>

<h2>Key Benefits</h2>
<ul>
  <li><strong>[Benefit 1]</strong>: [Short explanation]</li>
  <li><strong>[Benefit 2]</strong>: [Short explanation]</li>
  <li><strong>[Benefit 3]</strong>: [Short explanation]</li>
</ul>

<h2>How to [action related to topic]</h2>
<p>[Explanation of the process or method]</p>

<h3>Step by Step</h3>
<ol>
  <li>[First step with details]</li>
  <li>[Second step with details]</li>
  <li>[Third step with details]</li>
</ol>

<h2>Essential Points to Remember</h2>
<p>[Summary of key points, 2-3 sentences]</p>
<ul>
  <li>[Key point 1]</li>
  <li>[Key point 2]</li>
  <li>[Key point 3]</li>
</ul>

<h2>Conclusion</h2>
<p>[Conclusion with call to action mentioning ${brandName}]</p>

IMPORTANT: Generate ONLY the HTML content (no <!DOCTYPE>, <html>, <head>, <body>). Just the article content.

Reply in JSON:
{
  "content": "[Complete article HTML with H1, H2, H3, p, ul, ol, strong, em]",
  "meta_description": "[Meta description of 150-160 characters with main keyword]",
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
