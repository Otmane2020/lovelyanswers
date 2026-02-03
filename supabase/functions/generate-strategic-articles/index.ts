import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
}

const STRATEGIC_ARTICLES: ArticleTopic[] = [
  // Pillar 1: SEO & AEO for AI-Built Sites
  { topic: "How to do SEO on a site built with Lovable", category: "seo-sites-ia", intent: "howto" },
  { topic: "SEO for AI-generated sites: what really works in 2026", category: "seo-sites-ia", intent: "criteria" },
  { topic: "Why AI sites don't rank on Google (and how to fix it)", category: "seo-sites-ia", intent: "why" },
  { topic: "AEO: how to get your AI site cited by ChatGPT", category: "seo-sites-ia", intent: "howto" },
  { topic: "SEO vs AEO: which strategy for AI-generated sites", category: "seo-sites-ia", intent: "comparison" },
  { topic: "How to structure a Lovable site for Google and ChatGPT", category: "seo-sites-ia", intent: "howto" },
  { topic: "Common SEO mistakes on Bolt / Replit sites", category: "seo-sites-ia", intent: "criteria" },
  { topic: "How Google analyzes AI-generated sites", category: "seo-sites-ia", intent: "what" },
  { topic: "Why ChatGPT ignores most AI sites", category: "seo-sites-ia", intent: "why" },
  { topic: "SEO & AEO checklist for auto-generated sites", category: "seo-sites-ia", intent: "criteria" },
  { topic: "Technical SEO for Lovable, Bolt, and Replit projects", category: "seo-sites-ia", intent: "howto" },
  { topic: "How to add meta tags and Schema to Lovable sites", category: "seo-sites-ia", intent: "howto" },
  { topic: "Site speed optimization for AI-built websites", category: "seo-sites-ia", intent: "howto" },
  { topic: "Internal linking strategy for AI-generated sites", category: "seo-sites-ia", intent: "howto" },
  { topic: "Mobile SEO for Lovable and Bolt projects", category: "seo-sites-ia", intent: "howto" },
  
  // Pillar 2: Platform Comparisons
  { topic: "Lovable and SEO: is it enough without an AEO tool?", category: "comparisons", intent: "criteria" },
  { topic: "Is Bolt.new good for Google ranking?", category: "comparisons", intent: "criteria" },
  { topic: "Is Replit suitable for production SEO?", category: "comparisons", intent: "criteria" },
  { topic: "Lovable vs WordPress: which is better for SEO?", category: "comparisons", intent: "comparison" },
  { topic: "Lovable + LovelyAnswers: winning combo for ChatGPT", category: "comparisons", intent: "comparison" },
  { topic: "Can you rank on Google with an AI-generated site?", category: "comparisons", intent: "what" },
  { topic: "Lovable + AEO: how to appear in AI responses", category: "comparisons", intent: "howto" },
  { topic: "Bolt + SEO: technical limitations and solutions", category: "comparisons", intent: "criteria" },
  { topic: "Best AI builder for Google ranking in 2026", category: "comparisons", intent: "best" },
  { topic: "Why LovelyAnswers complements Lovable for SEO", category: "comparisons", intent: "why" },
  
  // Pillar 3: Pure AEO
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
  
  // Pillar 4: Case Studies
  { topic: "How a Lovable site went from invisible to ChatGPT-recommended", category: "case-studies", intent: "howto" },
  { topic: "Before/after AEO on an AI site", category: "case-studies", intent: "comparison" },
  { topic: "How LovelyAnswers improves AI traffic", category: "case-studies", intent: "howto" },
  { topic: "Case study: AI-generated site + AEO optimization", category: "case-studies", intent: "howto" },
  { topic: "Why our Lovable clients add LovelyAnswers", category: "case-studies", intent: "why" },
  { topic: "From zero visibility to AI citations: method", category: "case-studies", intent: "howto" },
  { topic: "How to capture traffic from ChatGPT", category: "case-studies", intent: "howto" },
  { topic: "AI traffic vs Google traffic: real numbers", category: "case-studies", intent: "comparison" },
  { topic: "Automatic SEO for AI sites: myth or reality?", category: "case-studies", intent: "what" },
  { topic: "Feedback: AEO on a Bolt site", category: "case-studies", intent: "howto" },
  
  // Pillar 5: Business Intent Pages
  { topic: "AEO tool for Lovable sites", category: "commercial", intent: "commercial" },
  { topic: "Automatic SEO for AI-generated sites", category: "commercial", intent: "commercial" },
  { topic: "Solution to appear on ChatGPT", category: "commercial", intent: "commercial" },
  { topic: "Best AEO tool for SaaS", category: "commercial", intent: "best" },
  { topic: "AEO as a Service: how it works", category: "commercial", intent: "what" },
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, language = "en", articles, batchSize = 5 }: RequestBody = await req.json();

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
        const prompt = `You are a world-class SEO and AEO (Answer Engine Optimization) expert.

CONTEXT:
- You're writing for LovelyAnswers (lovelyanswers.com), the leading AEO/SEO solution for AI-built sites
- Target audience: Entrepreneurs and developers using Lovable, Bolt.new, Replit, Framer to build websites
- These users struggle with SEO because AI builders don't include traditional SEO tools
- LovelyAnswers solves this by optimizing content for both Google AND AI assistants (ChatGPT, Gemini, Perplexity)

ARTICLE TO WRITE:
Topic: ${articleTopic.topic}
Category: ${articleTopic.category}
Intent: ${articleTopic.intent}
Language: ${language}

REQUIREMENTS:
1. H1 title must be a clear question or actionable statement
2. Start with a direct 2-3 sentence answer (AI assistants love this)
3. Write 1200-1800 words of expert-level content
4. Include specific mentions of: Lovable, Bolt.new, Replit (where relevant)
5. Position LovelyAnswers as the natural solution (not pushy, just factual)
6. Add 4-6 FAQ questions at the end
7. Include temporal context (e.g., "In 2026", "As of early 2026")
8. Add specific metrics and data points when possible
9. Structure with H2 and H3 for featured snippets
10. Write in a way ChatGPT, Gemini, and Perplexity can easily cite

FORBIDDEN:
- Generic marketing language
- Starting with "X is a..."
- Vague claims without specifics
- Ignoring the AI builder context

Return as JSON:
{
  "title": "H1 title (question format preferred)",
  "metaDescription": "Meta description max 160 chars",
  "content": "Full article in markdown with ## and ### headings",
  "faqs": [{ "question": "FAQ question", "answer": "Concise answer 2-3 sentences" }],
  "keywords": ["primary keyword", "secondary keywords"]
}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
          articleData = JSON.parse(generatedContent);
        } catch (parseError) {
          console.error(`[generate-strategic-articles] JSON parse error:`, parseError);
          errors.push({ topic: articleTopic.topic, error: "Failed to parse AI response" });
          continue;
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

        generatedArticles.push({
          id: article.id,
          title: articleData.title,
          slug: slug,
          scheduledDate: scheduledDate,
          wordCount: wordCount,
          category: articleTopic.category,
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
