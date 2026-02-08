import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert content to clean HTML - handles both HTML and markdown input
function convertToCleanHTML(content: string, title?: string): string {
  let html = title ? `<h1>${title}</h1>\n` : '';
  
  // If content already looks like HTML, clean it up
  if (/<(h[1-6]|p|ul|ol|li|div|section|article|strong|em)\b/i.test(content)) {
    html += content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return html;
  }
  
  // Content is markdown - convert to HTML properly
  const lines = content.split('\n');
  let inList = false;
  let listType = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += `<h3>${line.slice(4).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h3>\n`;
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += `<h2>${line.slice(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h2>\n`;
      continue;
    }
    if (line.startsWith('# ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      // Skip H1 - title is rendered separately by editorial template
      continue;
    }
    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line)) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      html += '<hr>\n';
      continue;
    }
    // Blockquote
    if (line.startsWith('> ')) {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
      const quoteContent = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      html += `<blockquote>${quoteContent}</blockquote>\n`;
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      const itemContent = line.replace(/^[-*•]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (!inList || listType !== 'ul') { if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; html += '<ul>\n'; inList = true; listType = 'ul'; }
      html += `  <li>${itemContent}</li>\n`;
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const itemContent = line.replace(/^\d+[.)]\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
      if (!inList || listType !== 'ol') { if (inList) html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; html += '<ol>\n'; inList = true; listType = 'ol'; }
      html += `  <li>${itemContent}</li>\n`;
      continue;
    }
    if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; }
    line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
    html += `<p>${line}</p>\n`;
  }
  if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; }
  return html;
}

interface ArticleTopic {
  topic: string;
  category: string;
  intent: string;
}

interface RequestBody {
  projectId: string;
  language?: string;
  articles: ArticleTopic[];
  batchSize?: number;
  autoPublish?: boolean; // Immediately publish to blog
}

const STRATEGIC_ARTICLES: ArticleTopic[] = [
  // === LOVABLE (10 articles) ===
  { topic: "How to do SEO on a site built with Lovable", category: "lovable", intent: "howto" },
  { topic: "Why Lovable sites struggle to rank on Google", category: "lovable", intent: "why" },
  { topic: "Lovable SEO checklist for 2026", category: "lovable", intent: "criteria" },
  { topic: "How to structure a Lovable site for ChatGPT and Google", category: "lovable", intent: "howto" },
  { topic: "Lovable vs WordPress: SEO and AEO comparison", category: "lovable", intent: "comparison" },
  { topic: "How to add Schema markup to a Lovable website", category: "lovable", intent: "howto" },
  { topic: "Can ChatGPT recommend a site built with Lovable?", category: "lovable", intent: "what" },
  { topic: "Common SEO mistakes on Lovable-generated sites", category: "lovable", intent: "criteria" },
  { topic: "How LovelyAnswers improves SEO for Lovable projects", category: "lovable", intent: "howto" },
  { topic: "Best AEO strategy for Lovable-built SaaS websites", category: "lovable", intent: "best" },

  // === BOLT.NEW (10 articles) ===
  { topic: "Is Bolt.new good for SEO in production?", category: "bolt", intent: "criteria" },
  { topic: "Why Bolt sites have SEO limitations (and how to fix them)", category: "bolt", intent: "why" },
  { topic: "How to optimize a Bolt.new site for Google Search", category: "bolt", intent: "howto" },
  { topic: "Bolt.new vs traditional frameworks for SEO", category: "bolt", intent: "comparison" },
  { topic: "How ChatGPT evaluates websites built with Bolt", category: "bolt", intent: "what" },
  { topic: "Technical SEO checklist for Bolt-generated sites", category: "bolt", intent: "criteria" },
  { topic: "Bolt.new and AEO: how to appear in AI answers", category: "bolt", intent: "howto" },
  { topic: "Common indexing problems on Bolt.new projects", category: "bolt", intent: "criteria" },
  { topic: "How LovelyAnswers complements Bolt.new for SEO", category: "bolt", intent: "howto" },
  { topic: "Best SEO and AEO practices for Bolt-based SaaS", category: "bolt", intent: "best" },

  // === REPLIT (10 articles) ===
  { topic: "Is Replit suitable for SEO in production websites?", category: "replit", intent: "criteria" },
  { topic: "How to optimize a Replit website for Google", category: "replit", intent: "howto" },
  { topic: "Why Replit apps struggle with SEO visibility", category: "replit", intent: "why" },
  { topic: "Replit vs Vercel vs WordPress for SEO", category: "replit", intent: "comparison" },
  { topic: "How to add meta tags and Schema on Replit", category: "replit", intent: "howto" },
  { topic: "Can ChatGPT recommend a Replit-built site?", category: "replit", intent: "what" },
  { topic: "SEO mistakes developers make on Replit", category: "replit", intent: "criteria" },
  { topic: "How LovelyAnswers improves AEO for Replit projects", category: "replit", intent: "howto" },
  { topic: "Replit and AI search engines: what works in 2026", category: "replit", intent: "what" },
  { topic: "Best SEO & AEO strategy for SaaS built on Replit", category: "replit", intent: "best" },

  // === BASE44 (10 articles) ===
  { topic: "Can you rank on Google with a Base44-built site?", category: "base44", intent: "what" },
  { topic: "Base44 SEO limitations explained", category: "base44", intent: "why" },
  { topic: "How to optimize a Base44 site for ChatGPT", category: "base44", intent: "howto" },
  { topic: "Base44 vs Bubble vs WordPress for SEO", category: "base44", intent: "comparison" },
  { topic: "How to structure Base44 pages for AEO", category: "base44", intent: "howto" },
  { topic: "Common SEO issues on no-code AI builders", category: "base44", intent: "criteria" },
  { topic: "How LovelyAnswers boosts visibility for Base44 sites", category: "base44", intent: "howto" },
  { topic: "AEO strategy for no-code AI applications", category: "base44", intent: "howto" },
  { topic: "Why AI-built no-code sites need AEO", category: "base44", intent: "why" },
  { topic: "Best SEO & AEO checklist for Base44 projects", category: "base44", intent: "best" },

  // === PURE AEO (10 articles) ===
  { topic: "What is AEO (Answer Engine Optimization)?", category: "aeo-pure", intent: "what" },
  { topic: "How to get recommended by ChatGPT for your business", category: "aeo-pure", intent: "howto" },
  { topic: "How to appear in ChatGPT answers", category: "aeo-pure", intent: "howto" },
  { topic: "AEO for SaaS: complete methodology", category: "aeo-pure", intent: "howto" },
  { topic: "AEO for AI-generated e-commerce sites", category: "aeo-pure", intent: "howto" },
  { topic: "How to structure pages for generative AI", category: "aeo-pure", intent: "howto" },
  { topic: "Why classic SEO is no longer enough", category: "aeo-pure", intent: "why" },
  { topic: "How ChatGPT chooses which sites to recommend", category: "aeo-pure", intent: "what" },
  { topic: "How LovelyAnswers optimizes a site for AEO", category: "aeo-pure", intent: "howto" },
  { topic: "AEO checklist for 2026", category: "aeo-pure", intent: "criteria" },

  // === CASE STUDIES (10 articles) ===
  { topic: "How a Lovable site went from invisible to ChatGPT-recommended", category: "case-studies", intent: "howto" },
  { topic: "Before/after AEO on an AI-built site", category: "case-studies", intent: "comparison" },
  { topic: "How LovelyAnswers improves AI traffic", category: "case-studies", intent: "howto" },
  { topic: "Case study: AI-generated site + AEO optimization", category: "case-studies", intent: "howto" },
  { topic: "Why Lovable clients add LovelyAnswers", category: "case-studies", intent: "why" },
  { topic: "From zero visibility to AI citations: method", category: "case-studies", intent: "howto" },
  { topic: "How to capture traffic from ChatGPT", category: "case-studies", intent: "howto" },
  { topic: "AI traffic vs Google traffic: real numbers", category: "case-studies", intent: "comparison" },
  { topic: "Automatic SEO for AI sites: myth or reality?", category: "case-studies", intent: "what" },
  { topic: "AEO success story on a Bolt site", category: "case-studies", intent: "howto" },

  // === COMPARISONS (10 articles) ===
  { topic: "Lovable vs Bolt vs Replit: which is best for SEO?", category: "comparisons", intent: "comparison" },
  { topic: "AI builders vs WordPress for Google ranking", category: "comparisons", intent: "comparison" },
  { topic: "Framer vs Lovable for SEO performance", category: "comparisons", intent: "comparison" },
  { topic: "No-code vs low-code for AEO optimization", category: "comparisons", intent: "comparison" },
  { topic: "SEO plugins vs AEO tools: what works in 2026", category: "comparisons", intent: "comparison" },
  { topic: "Best AI website builder for ChatGPT citations", category: "comparisons", intent: "best" },
  { topic: "Webflow vs Lovable: SEO and AEO comparison", category: "comparisons", intent: "comparison" },
  { topic: "V0 vs Lovable: which ranks better on Google?", category: "comparisons", intent: "comparison" },
  { topic: "AI content generation vs human writing for SEO", category: "comparisons", intent: "comparison" },
  { topic: "Why LovelyAnswers outperforms traditional SEO tools for AI sites", category: "comparisons", intent: "why" },

  // === COMMERCIAL INTENT (10 articles) ===
  { topic: "AEO tool for Lovable sites", category: "commercial", intent: "commercial" },
  { topic: "Automatic SEO for AI-generated sites", category: "commercial", intent: "commercial" },
  { topic: "Solution to appear on ChatGPT", category: "commercial", intent: "commercial" },
  { topic: "Best AEO tool for SaaS", category: "commercial", intent: "best" },
  { topic: "AEO as a Service: how it works", category: "commercial", intent: "what" },
  { topic: "SEO automation for no-code websites", category: "commercial", intent: "commercial" },
  { topic: "Get cited by AI assistants: professional solution", category: "commercial", intent: "commercial" },
  { topic: "LovelyAnswers pricing and plans for AI builders", category: "commercial", intent: "commercial" },
  { topic: "Enterprise AEO for AI-generated platforms", category: "commercial", intent: "commercial" },
  { topic: "Free trial: optimize your AI site for ChatGPT", category: "commercial", intent: "commercial" },

  // === TECHNICAL SEO (10 articles) ===
  { topic: "Technical SEO for Lovable, Bolt, and Replit projects", category: "technical", intent: "howto" },
  { topic: "How to add meta tags and Schema to AI-built sites", category: "technical", intent: "howto" },
  { topic: "Site speed optimization for AI-built websites", category: "technical", intent: "howto" },
  { topic: "Internal linking strategy for AI-generated sites", category: "technical", intent: "howto" },
  { topic: "Mobile SEO for Lovable and Bolt projects", category: "technical", intent: "howto" },
  { topic: "Core Web Vitals on AI-generated websites", category: "technical", intent: "criteria" },
  { topic: "How to submit an AI site to Google Search Console", category: "technical", intent: "howto" },
  { topic: "Sitemap generation for Lovable projects", category: "technical", intent: "howto" },
  { topic: "Robots.txt best practices for AI-built sites", category: "technical", intent: "criteria" },
  { topic: "Structured data implementation on no-code platforms", category: "technical", intent: "howto" },
];

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

function getScheduledDate(index: number, startDate: Date): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + index);
  return date.toISOString().split("T")[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("OPENROUTER_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, language = "en", articles, batchSize = 5, autoPublish = false }: RequestBody = await req.json();

    // Use provided articles or default to all strategic articles
    const articlesToGenerate = articles && articles.length > 0 ? articles : STRATEGIC_ARTICLES;

    console.log(`[generate-strategic-articles] Starting generation for project ${projectId}`);
    console.log(`[generate-strategic-articles] Total articles to generate: ${articlesToGenerate.length}`);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start scheduling from tomorrow

    const generatedArticles = [];
    const errors = [];

    // Process in batches
    for (let i = 0; i < Math.min(batchSize, articlesToGenerate.length); i++) {
      const articleTopic = articlesToGenerate[i];
      console.log(`[generate-strategic-articles] Generating ${i + 1}/${batchSize}: ${articleTopic.topic}`);

      try {
        // Generate AEO-optimized article
        const prompt = `You are a world-class SEO and AEO expert writing for LovelyAnswers.

TOPIC: ${articleTopic.topic}
CATEGORY: ${articleTopic.category}
INTENT: ${articleTopic.intent}
LANGUAGE: ${language}

CONTEXT:
- LovelyAnswers (lovelyanswers.com) is the AEO/SEO solution for AI-built sites (Lovable, Bolt, Replit)
- Target audience: entrepreneurs using AI builders who struggle with SEO/visibility

EDITORIAL TEMPLATE RULES (CRITICAL):
1. DO NOT include an H1 tag - the title is rendered separately as a hero header
2. Start immediately with a compelling opening paragraph (this paragraph gets a decorative drop cap on the first letter)
3. Use ## (H2) for major sections with descriptive headings
4. Use ### (H3) for subsections
5. Include at least one blockquote (> quote) as a pull-quote for visual impact
6. Use horizontal rules (---) between major sections for visual separation
7. Bold key data with **strong** formatting
8. Include bulleted and numbered lists for scannability
9. Write 1000-1500 words expert content
10. Mention Lovable, Bolt, Replit naturally
11. Position LovelyAnswers as the solution
12. Add 3-4 FAQ at the end

CRITICAL: Return ONLY valid JSON. No markdown code blocks. Use escaped quotes for any quotes inside strings.

{
  "title": "Your H1 title here",
  "metaDescription": "Description under 160 chars",
  "content": "Your article content here with ## headings. Start with a paragraph, NO H1. Escape all quotes.",
  "faqs": [{"question": "FAQ 1?", "answer": "Answer 1"}],
  "keywords": ["keyword1", "keyword2"]
}`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an expert SEO/AEO content writer. Always respond with valid JSON only, no markdown code blocks." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`[generate-strategic-articles] AI API error: ${aiResponse.status}`);
          errors.push({ topic: articleTopic.topic, error: `AI API error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        let generatedContent = aiData.choices?.[0]?.message?.content;

        if (!generatedContent) {
          errors.push({ topic: articleTopic.topic, error: "No content generated" });
          continue;
        }

        // Parse JSON response
        let articleData;
        try {
          // Clean up response - remove markdown code blocks if present
          generatedContent = generatedContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          
          // Try to extract valid JSON if there's extra content
          const jsonMatch = generatedContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            generatedContent = jsonMatch[0];
          }
          
          // Fix common JSON issues: unescaped quotes in content
          generatedContent = generatedContent
            .replace(/\\n/g, " ")
            .replace(/\t/g, " ");
          
          articleData = JSON.parse(generatedContent);
        } catch (parseError) {
          console.error(`[generate-strategic-articles] JSON parse error:`, parseError);
          console.error(`[generate-strategic-articles] Content preview:`, generatedContent?.substring(0, 500));
          
          // Try fallback: create minimal structure from topic
          articleData = {
            title: articleTopic.topic,
            metaDescription: `Learn about ${articleTopic.topic} for AI-built sites`,
            content: `# ${articleTopic.topic}\n\nThis article covers ${articleTopic.topic} for sites built with Lovable, Bolt, and Replit.`,
            faqs: [],
            keywords: [articleTopic.topic.toLowerCase()]
          };
          console.log(`[generate-strategic-articles] Using fallback content for: ${articleTopic.topic}`);
        }

        const slug = generateSlug(articleData.title || articleTopic.topic);
        const scheduledDate = getScheduledDate(i, startDate);
        const wordCount = articleData.content?.split(/\s+/).length || 0;

        // Create answer entry first
        const { data: answer, error: answerError } = await supabase
          .from("answers")
          .insert({
            project_id: projectId,
            question: articleData.title,
            answer: articleData.faqs?.[0]?.answer || articleData.content?.substring(0, 500) || "",
            slug: `${slug}-${Date.now()}`,
            score: 85,
            platforms: ["chatgpt", "gemini", "perplexity"],
            is_public: false,
            has_article: true,
            intent: articleTopic.intent,
            scheduled_date: scheduledDate,
          })
          .select()
          .single();

        if (answerError) {
          console.error(`[generate-strategic-articles] Answer insert error:`, answerError);
          errors.push({ topic: articleTopic.topic, error: "Failed to create answer" });
          continue;
        }

        // Create article entry
        const { data: article, error: articleError } = await supabase
          .from("articles")
          .insert({
            project_id: projectId,
            title: articleData.title,
            content: articleData.content,
            meta_description: articleData.metaDescription,
            slug: slug,
            status: "scheduled",
            word_count: wordCount,
            scheduled_date: scheduledDate,
            linked_answer_id: answer.id,
            keywords: articleData.keywords || [],
          })
          .select()
          .single();

        if (articleError) {
          console.error(`[generate-strategic-articles] Article insert error:`, articleError);
          errors.push({ topic: articleTopic.topic, error: "Failed to create article" });
          continue;
        }

        // Update answer with article_id
        await supabase
          .from("answers")
          .update({ article_id: article.id })
          .eq("id", answer.id);

        // Add to planning_days for auto-publishing
        await supabase
          .from("planning_days")
          .insert({
            project_id: projectId,
            scheduled_date: scheduledDate,
            answer_id: answer.id,
            article_id: article.id,
          });

        // If autoPublish is enabled, publish immediately to blog
        if (autoPublish) {
          // Convert content to proper HTML - NO title H1 (ArticleTemplate renders it as hero)
          let htmlContent = convertToCleanHTML(articleData.content);
          
          // Add FAQs as structured section
          if (articleData.faqs && articleData.faqs.length > 0) {
            htmlContent += '\n<hr>\n<h2>Frequently Asked Questions</h2>';
            for (const faq of articleData.faqs) {
              htmlContent += `<h3>${faq.question}</h3>\n<p>${faq.answer}</p>`;
            }
          }

          // Insert into published_articles for immediate blog visibility
          await supabase
            .from("published_articles")
            .insert({
              title: articleData.title,
              body: htmlContent,
              slug: slug,
              meta_description: articleData.metaDescription,
              source_id: article.id,
            });

          // Mark answer as public and published
          await supabase
            .from("answers")
            .update({ 
              is_public: true, 
              published_at: new Date().toISOString(),
              published_url: `https://lovelyanswers.com/blog/${slug}`
            })
            .eq("id", answer.id);

          // Update article status to published
          await supabase
            .from("articles")
            .update({ status: "published" })
            .eq("id", article.id);

          console.log(`[generate-strategic-articles] Auto-published article: ${slug}`);
        }

        generatedArticles.push({
          id: article.id,
          title: articleData.title,
          slug: slug,
          scheduledDate: scheduledDate,
          wordCount: wordCount,
          category: articleTopic.category,
          published: autoPublish,
        });

        console.log(`[generate-strategic-articles] Created article: ${article.id} scheduled for ${scheduledDate}`);

        // Rate limiting - wait 2 seconds between API calls
        if (i < batchSize - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (err) {
        console.error(`[generate-strategic-articles] Error processing ${articleTopic.topic}:`, err);
        errors.push({ topic: articleTopic.topic, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    console.log(`[generate-strategic-articles] Complete. Generated: ${generatedArticles.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedArticles.length,
        total: articlesToGenerate.length,
        remaining: articlesToGenerate.length - batchSize,
        articles: generatedArticles,
        errors: errors,
        nextBatchTopics: articlesToGenerate.slice(batchSize, batchSize + 5).map(a => a.topic),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-strategic-articles] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
