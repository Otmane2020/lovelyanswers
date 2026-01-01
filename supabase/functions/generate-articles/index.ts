import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ArticleRequest {
  projectId: string;
  keywords: string[];
  language?: string;
  count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, keywords, language = "en", count = 5 }: ArticleRequest = await req.json();

    console.log(`[generate-articles] Starting generation for project ${projectId}, ${count} articles`);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    console.log(`[generate-articles] Project: ${project.name}, URL: ${project.website_url}`);

    const generatedArticles = [];

    for (let i = 0; i < Math.min(count, keywords.length); i++) {
      const keyword = keywords[i];
      console.log(`[generate-articles] Generating article ${i + 1}/${count} for keyword: ${keyword}`);

      // Generate SEO/LLM optimized article using Lovable AI
      const articlePrompt = `You are an expert SEO and AEO (Answer Engine Optimization) content writer. Generate a comprehensive, SEO-optimized article for the following:

Business: ${project.brand_name || project.name}
Website: ${project.website_url}
Industry: ${project.business_type || "General"}
Target Audience: ${project.audience || "General audience"}
Main Keyword: ${keyword}
Language: ${language}

Requirements:
1. Create a compelling H1 title optimized for both Google and AI assistants
2. Write 1500-2000 words of high-quality, informative content
3. Include internal linking opportunities (mark as [INTERNAL_LINK: anchor text])
4. Add citation placeholders (mark as [CITATION: source type])
5. Structure with H2 and H3 headings for featured snippets
6. Include a JSON-LD schema suggestion at the end
7. Write in a way that AI assistants like ChatGPT and Gemini can easily cite
8. Include FAQs section with 3-5 questions
9. Add meta description (max 160 chars)

Return as JSON with structure:
{
  "title": "Article title",
  "metaDescription": "Meta description",
  "content": "Full article content in markdown",
  "headings": ["H2 headings array"],
  "internalLinks": ["suggested internal link anchors"],
  "jsonLdSchema": { JSON-LD object },
  "faqs": [{ "question": "", "answer": "" }]
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
            { role: "system", content: "You are an expert SEO content writer. Always respond with valid JSON." },
            { role: "user", content: articlePrompt }
          ],
        }),
      });

      if (!aiResponse.ok) {
        console.error(`[generate-articles] AI API error: ${aiResponse.status}`);
        continue;
      }

      const aiData = await aiResponse.json();
      const generatedContent = aiData.choices?.[0]?.message?.content;

      if (!generatedContent) {
        console.error(`[generate-articles] No content generated for keyword: ${keyword}`);
        continue;
      }

      // Parse the JSON response
      let articleData;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = generatedContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         generatedContent.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : generatedContent;
        articleData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error(`[generate-articles] Failed to parse AI response:`, parseError);
        articleData = {
          title: `${keyword} - Complete Guide`,
          content: generatedContent,
          metaDescription: `Learn everything about ${keyword} from ${project.brand_name || project.name}`,
        };
      }

      // Save article to database
      const { data: article, error: articleError } = await supabase
        .from("articles")
        .insert({
          project_id: projectId,
          title: articleData.title,
          content: articleData.content,
          status: "draft",
          word_count: articleData.content?.split(/\s+/).length || 0,
        })
        .select()
        .single();

      if (articleError) {
        console.error(`[generate-articles] Failed to save article:`, articleError);
        continue;
      }

      // Also create an AEO answer from the FAQs
      if (articleData.faqs && articleData.faqs.length > 0) {
        const faq = articleData.faqs[0];
        const slug = faq.question
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .substring(0, 50);

        await supabase.from("answers").insert({
          project_id: projectId,
          question: faq.question,
          answer: faq.answer,
          slug: `${slug}-${Date.now()}`,
          score: 75,
          platforms: ["chatgpt", "gemini", "claude"],
          is_public: true,
          has_article: true,
        });
      }

      generatedArticles.push({
        id: article.id,
        title: articleData.title,
        metaDescription: articleData.metaDescription,
        wordCount: article.word_count,
        jsonLdSchema: articleData.jsonLdSchema,
      });

      console.log(`[generate-articles] Article saved: ${article.id}`);
    }

    console.log(`[generate-articles] Generation complete. ${generatedArticles.length} articles created.`);

    return new Response(
      JSON.stringify({
        success: true,
        articlesGenerated: generatedArticles.length,
        articles: generatedArticles,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-articles] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
