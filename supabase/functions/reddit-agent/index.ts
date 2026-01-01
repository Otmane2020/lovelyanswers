import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedditRequest {
  projectId?: string;
  action: "find-opportunities" | "generate-responses" | "analyze-subreddits" | "aeo-reply";
  subreddits?: string[];
  keywords?: string[];
  // For aeo-reply action
  title?: string;
  body?: string;
  subreddit?: string;
  mention_brand?: boolean;
  tone?: "expert_human" | "casual" | "professional";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      projectId, 
      action, 
      subreddits = [], 
      keywords = [],
      title,
      body,
      subreddit,
      mention_brand = false,
      tone = "expert_human"
    }: RedditRequest = await req.json();

    console.log(`[reddit-agent] Action: ${action}${projectId ? ` for project ${projectId}` : ""}`);

    // Handle aeo-reply action (doesn't require project)
    if (action === "aeo-reply") {
      if (!title || !subreddit) {
        throw new Error("title and subreddit are required for aeo-reply action");
      }
      const result = await generateAeoReply(title, body || "", subreddit, mention_brand, tone, lovableApiKey);
      return new Response(
        JSON.stringify({
          success: true,
          action,
          ...result,
          generatedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Other actions require projectId
    if (!projectId) {
      throw new Error("projectId is required for this action");
    }

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

// AEO Reply - Generate human-like Reddit comment for a specific post
async function generateAeoReply(
  title: string,
  body: string,
  subreddit: string,
  mentionBrand: boolean,
  tone: string,
  apiKey: string
): Promise<{ reply: string; estimatedScore: number }> {
  const toneInstructions = {
    expert_human: "Write like an experienced practitioner sharing genuine insights. Be helpful but not academic.",
    casual: "Write in a relaxed, conversational style. Use common Reddit expressions naturally.",
    professional: "Write clearly and professionally, but avoid corporate jargon. Be direct and helpful."
  };

  const systemPrompt = `You are a Reddit user and SEO/AEO practitioner.
Write helpful, natural, non-promotional answers.
Never sound like marketing or AI-generated.
No links in the response.
If a tool is mentioned, treat it as personal experience.
Tone: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.expert_human}`;

  const userPrompt = `Reddit post to respond to:
Title: ${title}
${body ? `Body: ${body}` : "(No body text)"}
Subreddit: r/${subreddit}

Task:
- Answer clearly and practically as a fellow Redditor
- Focus on AEO (Answer Engine Optimization) and SEO evolution
- Maximum 120 words
- End with a soft open question to encourage discussion
${mentionBrand ? "- You may mention NewAI once briefly as a tool you personally tested, but keep it ultra soft (1 phrase max)" : "- Do NOT mention any product or tool by name"}

Write the Reddit comment now:`;

  console.log(`[reddit-agent] Generating AEO reply for r/${subreddit}: "${title.substring(0, 50)}..."`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[reddit-agent] AI API error:`, response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add funds to continue.");
    }
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content?.trim();

  if (!reply) {
    throw new Error("No reply generated");
  }

  // Estimate upvote potential based on content quality signals
  const estimatedScore = estimateReplyScore(reply, subreddit);

  console.log(`[reddit-agent] Generated reply (${reply.length} chars), estimated score: ${estimatedScore}`);

  return { reply, estimatedScore };
}

function estimateReplyScore(reply: string, subreddit: string): number {
  let score = 50; // Base score

  // Positive signals
  if (reply.length > 80 && reply.length < 600) score += 10; // Good length
  if (reply.includes("?")) score += 10; // Ends with question
  if (reply.match(/I've|I've been|In my experience|What I've found/i)) score += 10; // Personal experience
  if (!reply.match(/http|www\.|\.com/i)) score += 5; // No links (good for Reddit)
  
  // Negative signals
  if (reply.match(/check out|try using|I recommend/i)) score -= 10; // Promotional language
  if (reply.length > 800) score -= 10; // Too long
  if (reply.match(/As an AI|I'm an AI/i)) score -= 30; // AI disclosure (bad)

  // Subreddit-specific adjustments
  if (["seo", "bigseo", "TechSEO"].includes(subreddit.toLowerCase())) {
    if (reply.match(/AEO|Answer Engine|AI search/i)) score += 5; // Relevant topic
  }

  return Math.max(10, Math.min(95, score));
}
