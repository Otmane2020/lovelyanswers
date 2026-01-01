import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 🔒 PATCH 1 — Reddit-banned SEO/AEO terms (will get you downvoted)
const REDDIT_BANNED_TERMS = [
  "AEO",
  "Answer Engine",
  "SEO automation",
  "optimize for AI",
  "AI answers",
  "citation",
  "search optimization",
  "AI-powered",
  "machine learning optimization",
  "LLM optimization"
];

function sanitizeRedditReply(text: string): string {
  let clean = text;
  REDDIT_BANNED_TERMS.forEach(term => {
    clean = clean.replace(new RegExp(term, "gi"), "");
  });
  // Clean up double spaces and trim
  return clean.replace(/\s+/g, " ").trim();
}

// Normalize Reddit title to AEO question
function normalizeToAeoQuestion(title: string): string {
  let question = title.trim();
  // Remove common Reddit prefixes
  question = question.replace(/^\[.*?\]\s*/g, "");
  question = question.replace(/^(ELI5|TIL|TIFU|CMV|AITA|WIBTA)[:.\s]*/gi, "");
  // Ensure it ends with a question mark if it's a question
  if (/^(what|why|how|when|where|who|which|can|does|do|is|are|should|would|could)/i.test(question) && !question.endsWith("?")) {
    question += "?";
  }
  return question;
}

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
  brand_name?: string; // Optional brand name for mention
  save_as_aeo?: boolean; // Save question to AEO pipeline
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

// 🔥 NEW: Fetch REAL Reddit posts using public JSON API
interface RealRedditPost {
  id: string;
  title: string;
  body: string;
  subreddit: string;
  url: string;
  score: number;
  comments: number;
  createdUtc: number;
}

async function fetchRealRedditPosts(subreddit: string): Promise<RealRedditPost[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=15`,
      { 
        headers: { 
          "User-Agent": "aeo-reddit-agent/1.0 (by /u/aeo-tool)" 
        } 
      }
    );

    if (!res.ok) {
      console.error(`[reddit-agent] Failed to fetch r/${subreddit}: ${res.status}`);
      return [];
    }

    const json = await res.json();
    
    if (!json.data?.children) {
      return [];
    }

    return json.data.children
      .filter((p: any) => p.data && !p.data.stickied) // Skip pinned posts
      .map((p: any) => ({
        id: p.data.id,
        title: p.data.title,
        body: p.data.selftext || "",
        subreddit: p.data.subreddit,
        url: `https://www.reddit.com${p.data.permalink}`,
        score: p.data.score,
        comments: p.data.num_comments,
        createdUtc: p.data.created_utc
      }));
  } catch (error) {
    console.error(`[reddit-agent] Error fetching r/${subreddit}:`, error);
    return [];
  }
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
      tone = "expert_human",
      brand_name,
      save_as_aeo = false
    }: RedditRequest = await req.json();

    console.log(`[reddit-agent] Action: ${action}${projectId ? ` for project ${projectId}` : ""}`);

    // Handle aeo-reply action (doesn't require project)
    if (action === "aeo-reply") {
      if (!title || !subreddit) {
        throw new Error("title and subreddit are required for aeo-reply action");
      }
      
      const result = await generateRedditReply(
        title, 
        body || "", 
        subreddit, 
        mention_brand, 
        tone, 
        brand_name || "",
        lovableApiKey
      );
      
      // 🔥 Strategic: Reddit → AEO pipeline
      let aeoQuestionId: string | null = null;
      if (save_as_aeo && projectId) {
        try {
          const normalizedQuestion = normalizeToAeoQuestion(title);
          const { data: inserted } = await supabase
            .from("answers")
            .insert({
              project_id: projectId,
              question: normalizedQuestion,
              answer: "", // Will be generated separately via AEO flow
              slug: normalizedQuestion.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100),
              platforms: ["chatgpt", "gemini", "claude"],
              score: 0,
              is_public: false,
              intent: "what",
              difficulty: "medium",
              supporting_content: {
                source: "reddit",
                subreddit,
                original_title: title,
                status: "pending_aeo"
              }
            })
            .select("id")
            .single();
          
          aeoQuestionId = inserted?.id || null;
          console.log(`[reddit-agent] Saved to AEO pipeline: ${aeoQuestionId}`);
        } catch (aeoError) {
          console.error(`[reddit-agent] Failed to save AEO question:`, aeoError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          action,
          ...result,
          aeoQuestionId,
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
        for (const sub of subreddits.slice(0, 3)) {
          const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${firecrawlApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: `https://www.reddit.com/r/${sub}/new/.json?limit=25`,
              formats: ["markdown"],
            }),
          });

          if (scrapeResponse.ok) {
            const data = await scrapeResponse.json();
            redditData.push({
              subreddit: sub,
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
        result = await findOpportunities(project, keywords, subreddits, lovableApiKey);
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

// 🔥 FIXED: Use REAL Reddit posts, not AI-generated fake ones
async function findOpportunities(
  project: Record<string, unknown>,
  keywords: string[],
  subreddits: string[],
  apiKey: string
): Promise<{ opportunities: any[] }> {
  
  // Default subreddits if none provided
  const targetSubreddits = subreddits.length > 0 
    ? subreddits.slice(0, 5) 
    : ["seo", "marketing", "smallbusiness", "entrepreneur", "ecommerce"];

  console.log(`[reddit-agent] Fetching real posts from: ${targetSubreddits.join(", ")}`);

  // 1. Fetch REAL posts from Reddit JSON API
  const allPosts: RealRedditPost[] = [];
  for (const sub of targetSubreddits) {
    const posts = await fetchRealRedditPosts(sub);
    allPosts.push(...posts);
    // Small delay to be nice to Reddit
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[reddit-agent] Fetched ${allPosts.length} real Reddit posts`);

  if (allPosts.length === 0) {
    return { opportunities: [] };
  }

  // 2. Use AI to QUALIFY which posts are worth responding to
  const postsForAI = allPosts.slice(0, 30).map(p => ({
    id: p.id,
    title: p.title,
    body: p.body.substring(0, 200),
    subreddit: p.subreddit,
    url: p.url,
    score: p.score,
    comments: p.comments
  }));

  const prompt = `You are analyzing REAL Reddit posts to find engagement opportunities.

Business: ${project.brand_name || project.name}
Industry: ${project.business_type || "General"}
Target Audience: ${project.audience || "General audience"}
Keywords: ${keywords.join(", ") || "general topics"}

Here are REAL Reddit posts (with real URLs):
${JSON.stringify(postsForAI, null, 2)}

Select the TOP 10 posts where replying would be:
1. Natural and helpful (not promotional)
2. Relevant to the business expertise
3. Posts with < 50 comments are better (less competition)
4. Questions or discussions work best

Return JSON with ONLY these real posts (keep exact URLs):
{
  "opportunities": [
    {
      "id": "exact_post_id",
      "subreddit": "exact_subreddit",
      "title": "exact_title",
      "body": "post body if any",
      "url": "exact_url_from_input",
      "score": number,
      "comments": number,
      "engagementPotential": "high|medium|low",
      "reason": "Why this post is a good opportunity"
    }
  ]
}

CRITICAL: Return ONLY posts from the input. Do NOT invent URLs or post IDs.`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a Reddit analyst. Return valid JSON only. Never invent data." },
        { role: "user", content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    console.error(`[reddit-agent] AI API error: ${response.status}`);
    // Fallback: return raw posts without AI qualification
    return {
      opportunities: allPosts.slice(0, 10).map(p => ({
        id: p.id,
        subreddit: p.subreddit,
        title: p.title,
        body: p.body,
        url: p.url,
        score: p.score,
        comments: p.comments,
        engagementPotential: p.comments < 20 ? "high" : p.comments < 50 ? "medium" : "low",
        reason: "Real Reddit post"
      }))
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || [null, content];
    const parsed = JSON.parse(jsonMatch[1] || content);
    
    // 🔒 CRITICAL: Validate that returned URLs are REAL (from our input)
    const validUrls = new Set(allPosts.map(p => p.url));
    const validatedOpportunities = (parsed.opportunities || []).filter((opp: any) => 
      opp.url && validUrls.has(opp.url)
    );

    console.log(`[reddit-agent] Validated ${validatedOpportunities.length} opportunities with real URLs`);
    
    return { opportunities: validatedOpportunities };
  } catch (parseError) {
    console.error(`[reddit-agent] JSON parse error:`, parseError);
    // Fallback to raw posts
    return {
      opportunities: allPosts.slice(0, 10).map(p => ({
        id: p.id,
        subreddit: p.subreddit,
        title: p.title,
        body: p.body,
        url: p.url,
        score: p.score,
        comments: p.comments,
        engagementPotential: "medium",
        reason: "Real Reddit post"
      }))
    };
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

// 🔒 PATCH 3 — Reddit tone: VRAIMENT humain (no SEO jargon)
async function generateRedditReply(
  title: string,
  body: string,
  subreddit: string,
  mentionBrand: boolean,
  tone: string,
  brandName: string,
  apiKey: string
): Promise<{ reply: string; estimatedScore: number; brandMentioned: boolean }> {
  
  const toneInstructions: Record<string, string> = {
    expert_human: "Write like someone who's been doing this for years. Share from experience, not theory.",
    casual: "Write like you're chatting with a friend. Keep it real, maybe a bit sarcastic.",
    professional: "Write clearly but warmly. No corporate speak. Be direct and helpful."
  };

  // 🔒 PATCH 2 — Brand mention = probabilistic (20% chance)
  const shouldMentionBrand = mentionBrand && Math.random() < 0.2;
  const actualBrandName = brandName || "a tool I tried";

  // 🔒 PATCH 3 — System prompt: real Reddit user, no SEO vocabulary
  const systemPrompt = `You are a real Reddit user.
You write like someone who has actually done the work.
No jargon. No teaching. No SEO terms. No marketing language.
No structured lists unless it feels natural.
Short paragraphs. One idea per paragraph.
Slight uncertainty is OK ("I think", "in my case", "YMMV").
Never sound like an article or a blog post.
Never mention AI, machine learning, or automation.
Tone: ${toneInstructions[tone] || toneInstructions.expert_human}`;

  const userPrompt = `Reddit post to respond to:
Title: ${title}
${body ? `Body: ${body}` : "(No body text)"}
Subreddit: r/${subreddit}

Write a Reddit comment that:
- Answers practically as a fellow Redditor who's been there
- Maximum 100 words (shorter is better)
- Ends with a casual question or "curious what others think"
- Sounds like a real person, not a consultant
${shouldMentionBrand ? `- You can briefly mention "${actualBrandName}" as something you personally tried (1 phrase max, ultra casual)` : "- Do NOT mention any product, tool, or service by name"}

Write the Reddit comment now:`;

  console.log(`[reddit-agent] Generating reply for r/${subreddit}: "${title.substring(0, 50)}..." (brand mention: ${shouldMentionBrand})`);

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
      temperature: 0.8, // Higher for more natural variation
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
  const rawReply = data.choices?.[0]?.message?.content?.trim();

  if (!rawReply) {
    throw new Error("No reply generated");
  }

  // 🔒 PATCH 1 — Sanitize: remove any SEO/AEO terms that slipped through
  const reply = sanitizeRedditReply(rawReply);

  // 🔒 PATCH 4 — Stricter Reddit score
  const estimatedScore = estimateRedditScore(reply);

  console.log(`[reddit-agent] Generated reply (${reply.length} chars), score: ${estimatedScore}, brand: ${shouldMentionBrand}`);

  return { reply, estimatedScore, brandMentioned: shouldMentionBrand };
}

// 🔒 PATCH 4 — Score Reddit plus strict
function estimateRedditScore(reply: string): number {
  let score = 40; // Lower base, harder to get high score

  // Positive signals
  if (reply.length >= 80 && reply.length <= 350) score += 20; // Ideal length
  if (reply.length >= 50 && reply.length < 80) score += 10; // Short but OK
  if (reply.endsWith("?")) score += 10; // Ends with question
  if (/\?[^?]*$/.test(reply)) score += 5; // Has question somewhere
  if (/(in my experience|what worked for me|we tried|I've found|personally)/i.test(reply)) score += 15; // Personal experience
  if (/(honestly|tbh|imo|imho|fwiw)/i.test(reply)) score += 5; // Reddit-native language
  if (!/http|www|\.com|\.io/i.test(reply)) score += 5; // No links

  // Negative signals (heavy penalties)
  if (reply.length > 500) score -= 25; // Way too long
  if (reply.length > 350) score -= 10; // Getting long
  if (/(recommend|check out|try using|you should use)/i.test(reply)) score -= 20; // Promotional
  if (/(tool|platform|service|software|app)/i.test(reply)) score -= 10; // Product mentions
  if (/(seo|aeo|ai search|optimization|algorithm)/i.test(reply)) score -= 25; // SEO jargon = death
  if (/(best|top|leading|innovative|revolutionary)/i.test(reply)) score -= 15; // Marketing speak
  if (/\n\n.*\n\n/g.test(reply)) score -= 5; // Too structured
  if (/^(here's|here are|let me|allow me)/i.test(reply)) score -= 10; // AI-ish opening
  if (/\d+%/.test(reply)) score -= 5; // Stats = suspicious

  return Math.max(10, Math.min(95, score));
}
