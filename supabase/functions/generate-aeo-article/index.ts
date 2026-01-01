import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate AEO-optimized HTML article from an answer
function generateAEOArticleHTML(
  answer: {
    question: string;
    answer: string;
    supporting_content?: { bullets?: string[]; faq?: Array<{q: string; a: string}> };
  },
  brandName: string,
  websiteUrl: string,
  language: string
): string {
  const bullets = answer.supporting_content?.bullets || [];
  const faq = answer.supporting_content?.faq || [];
  
  const schemaOrg = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": answer.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answer.answer
        }
      },
      ...faq.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    ]
  };

  const keyFactsTitle = language === 'fr' ? 'Points Clés' : 'Key Facts';
  const faqTitle = language === 'fr' ? 'Questions Fréquentes' : 'Frequently Asked Questions';
  const footerText = language === 'fr' 
    ? `Optimisé AEO par ${brandName}` 
    : `AEO Optimized by ${brandName}`;

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${answer.question} | ${brandName}</title>
  <meta name="description" content="${answer.answer.slice(0, 160)}">
  <link rel="canonical" href="${websiteUrl}">
  <script type="application/ld+json">
${JSON.stringify(schemaOrg, null, 2)}
  </script>
  <style>
    :root {
      --primary: #7c3aed;
      --primary-light: #a78bfa;
      --bg: #0f0f23;
      --surface: #1a1a2e;
      --surface-light: #252542;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #334155;
      --success: #10b981;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 2rem;
    }
    
    article {
      max-width: 800px;
      margin: 0 auto;
    }
    
    h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 1.5rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .aeo-answer-box {
      background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
      border-radius: 1rem;
      padding: 1.5rem 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 40px -10px rgba(124, 58, 237, 0.3);
    }
    
    .aeo-answer-box p {
      font-size: 1.125rem;
      color: white;
      font-weight: 500;
    }
    
    .aeo-key-facts {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .aeo-key-facts h2 {
      font-size: 1.25rem;
      color: var(--primary-light);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .aeo-key-facts ul {
      list-style: none;
    }
    
    .aeo-key-facts li {
      padding: 0.5rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: var(--text-muted);
    }
    
    .aeo-key-facts li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--success);
      font-weight: bold;
    }
    
    .aeo-faq {
      background: var(--surface-light);
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .aeo-faq h2 {
      font-size: 1.25rem;
      color: var(--primary-light);
      margin-bottom: 1rem;
    }
    
    .faq-item {
      border-bottom: 1px solid var(--border);
      padding: 1rem 0;
    }
    
    .faq-item:last-child {
      border-bottom: none;
    }
    
    .faq-item h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
    }
    
    .faq-item p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }
    
    footer {
      text-align: center;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }
    
    footer p {
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    
    footer a {
      color: var(--primary-light);
      text-decoration: none;
    }
    
    footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <article itemscope itemtype="https://schema.org/Article">
    <h1 itemprop="headline">${answer.question}</h1>
    
    <!-- Answer Box FIRST - Critical for AEO -->
    <div class="aeo-answer-box">
      <p itemprop="description">${answer.answer}</p>
    </div>
    
    ${bullets.length > 0 ? `
    <!-- Key Facts -->
    <div class="aeo-key-facts">
      <h2>📌 ${keyFactsTitle}</h2>
      <ul>
        ${bullets.map(b => `<li>${b}</li>`).join('\n        ')}
      </ul>
    </div>
    ` : ''}
    
    ${faq.length > 0 ? `
    <!-- FAQ Section -->
    <div class="aeo-faq">
      <h2>❓ ${faqTitle}</h2>
      ${faq.map(f => `
      <div class="faq-item">
        <h3>${f.q}</h3>
        <p>${f.a}</p>
      </div>
      `).join('')}
    </div>
    ` : ''}
    
    <footer>
      <p>${footerText} · <a href="${websiteUrl}" target="_blank">${brandName}</a></p>
    </footer>
  </article>
</body>
</html>`;
}

// Generate article content using Lovable AI
async function generateArticleContent(
  question: string,
  answer: string,
  brandName: string,
  language: string,
  apiKey: string
): Promise<{ content: string; meta_description: string; keywords: string[] }> {
  const systemPrompt = language === 'fr'
    ? `Tu es un expert en rédaction SEO/AEO. Tu génères des articles optimisés pour être cités par les IA.`
    : `You are an SEO/AEO writing expert. You generate articles optimized to be cited by AI assistants.`;

  const userPrompt = language === 'fr'
    ? `Génère un article AEO de 400-600 mots basé sur:
Question: ${question}
Réponse courte: ${answer}
Marque: ${brandName}

Structure:
1. Introduction (2-3 phrases)
2. Réponse détaillée (développe la réponse courte)
3. Points clés (3-4 bullets)
4. Conclusion avec CTA

Format JSON:
{
  "content": "contenu de l'article en HTML",
  "meta_description": "description meta 150 caractères",
  "keywords": ["mot-clé 1", "mot-clé 2"]
}`
    : `Generate a 400-600 word AEO article based on:
Question: ${question}
Short answer: ${answer}
Brand: ${brandName}

Structure:
1. Introduction (2-3 sentences)
2. Detailed answer (expand the short answer)
3. Key points (3-4 bullets)
4. Conclusion with CTA

JSON format:
{
  "content": "article content in HTML",
  "meta_description": "meta description 150 characters",
  "keywords": ["keyword 1", "keyword 2"]
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
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  return { content, meta_description: "", keywords: [] };
}

// Generate slug
function generateSlug(text: string): string {
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
    if (answer.projects?.user_id !== userData.user.id) {
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

    // Generate full HTML
    const fullHtml = generateAEOArticleHTML(
      {
        question: answer.question,
        answer: answer.answer,
        supporting_content: answer.supporting_content
      },
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
        slug: generateSlug(answer.question),
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
