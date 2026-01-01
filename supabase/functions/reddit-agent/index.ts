import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedditRequest {
  projectId: string;
  action: "find-opportunities" | "generate-responses" | "analyze-subreddits";
  subreddits?: string[];
  keywords?: string[];
}

interface RedditOpportunity {
  subreddit: string;
  postTitle: string;
  postUrl: string;
  relevanceScore: number;
  suggestedResponse: string;
  engagementPotential: "high" | "medium" | "low";
  postAge: string;
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
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { projectId, action, subreddits = [], keywords = [] }: RedditRequest = await req.json();

    console.log(`[reddit-agent] Action: ${action} for project ${projectId}`);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    let redditData: unknown[] = [];

    // Scrape Reddit using Firecrawl if available
    if (firecrawlApiKey && subreddits.length > 0) {
      try {
        for (const subreddit of subreddits.slice(0, 3)) {
          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://www.reddit.com/r/${subreddit}/new/.json?limit=25`,
              formats: ["markdown"],
            }),
          });

          if (scrapeResponse.ok) {
            const data = await scrapeResponse.json();
            redditData.push({
              subreddit,
              content: data.data?.markdown || "",
            });
          }
        }
        console.log(`[reddit-agent] Scraped ${redditData.length} subreddits`);
      } catch (scrapeError) {
        console.error(`[reddit-agent] Firecrawl error:`, scrapeError);
      }
    }

    let result;

    switch (action) {
      case "find-opportunities":
        result = await findOpportunities(project, keywords, redditData, lovableApiKey);
        break;
      case "generate-responses":
        result = await generateResponses(project, subreddits, keywords, lovableApiKey);
        break;
      case "analyze-subreddits":
        result = await analyzeSubreddits(project, subreddits, lovableApiKey);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[reddit-agent] Action ${action} completed`);

    return new Response(
      JSON.stringify({
        success: true,
        action,
        projectId,
        ...result,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reddit-agent] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function findOpportunities(
  project: Record<string, unknown>,
  keywords: string[],
  redditData: unknown[],
  apiKey: string
): Promise<{ opportunities: RedditOpportunity[] }> {
  const prompt = `You are a Reddit marketing expert. Find opportunities for brand visibility on Reddit for:

Business: ${project.brand_name || project.name}
Website: ${project.website_url}
Industry: ${project.business_type || "General"}
Target Audience: ${project.audience || "General audience"}
Keywords: ${keywords.join(", ") || "Not specified"}

${redditData.length > 0 ? `
Scraped Reddit data:
${redditData.map((d: any) => `r/${d.subreddit}: ${d.content?.substring(0, 500)}`).join("\n\n")}
` : ""}

Find Reddit threads where the brand could add value by:
1. Answering questions related to the industry
2. Sharing expertise without being promotional
3. Engaging in discussions where the product/service could help
4. Building authority through helpful contributions

Generate 10 realistic Reddit opportunities. Return JSON:
{
  "opportunities": [
    {
      "subreddit": "subreddit_name",
      "postTitle": "Thread title",
      "postUrl": "https://reddit.com/r/subreddit/comments/...",
      "relevanceScore": 85,
      "suggestedResponse": "A helpful, non-promotional response...",
      "engagementPotential": "high|medium|low",
      "postAge": "2 hours ago"
    }
  ]
}

Make responses helpful, not promotional. Focus on adding genuine value.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Reddit marketing expert. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
    return JSON.parse(jsonMatch[1] || content);
  } catch {
    return { opportunities: [] };
  }
}

async function generateResponses(
  project: Record<string, unknown>,
  subreddits: string[],
  keywords: string[],
  apiKey: string
): Promise<{ responses: Array<{ subreddit: string; topic: string; response: string }> }> {
  const prompt = `Generate helpful Reddit responses for a brand:

Business: ${project.brand_name || project.name}
Website: ${project.website_url}
Industry: ${project.business_type || "General"}
Subreddits to target: ${subreddits.join(", ") || "general industry subreddits"}
Topics/Keywords: ${keywords.join(", ") || "industry topics"}

Create 5 template responses that:
1. Answer common questions in the industry
2. Share useful tips and insights
3. Are genuinely helpful, not promotional
4. Build authority and trust
5. Follow Reddit community guidelines

Return JSON:
{
  "responses": [
    {
      "subreddit": "target_subreddit",
      "topic": "Topic/question type",
      "response": "The helpful response text..."
    }
  ]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Reddit expert. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
    return JSON.parse(jsonMatch[1] || content);
  } catch {
    return { responses: [] };
  }
}

async function analyzeSubreddits(
  project: Record<string, unknown>,
  subreddits: string[],
  apiKey: string
): Promise<{ analysis: Array<{ subreddit: string; relevance: number; audienceMatch: number; activityLevel: string; bestPostTypes: string[] }> }> {
  const prompt = `Analyze subreddits for marketing potential:

Business: ${project.brand_name || project.name}
Industry: ${project.business_type || "General"}
Target Audience: ${project.audience || "General audience"}
Subreddits to analyze: ${subreddits.join(", ") || "suggest relevant subreddits"}

For each subreddit, analyze:
1. Relevance to the business (0-100)
2. Audience match (0-100)
3. Activity level (high/medium/low)
4. Best types of posts for engagement
5. Key topics discussed

Return JSON:
{
  "analysis": [
    {
      "subreddit": "subreddit_name",
      "relevance": 85,
      "audienceMatch": 90,
      "activityLevel": "high",
      "bestPostTypes": ["questions", "tutorials", "discussions"],
      "keyTopics": ["topic1", "topic2"]
    }
  ],
  "recommendedSubreddits": ["sub1", "sub2", "sub3"]
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Reddit analyst. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
    return JSON.parse(jsonMatch[1] || content);
  } catch {
    return { analysis: [] };
  }
}
