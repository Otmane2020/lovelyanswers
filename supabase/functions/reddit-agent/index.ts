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
  // Language and business context
  language?: string;
  business_description?: string;
  target_audiences?: string[];
  // For aeo-reply action
  title?: string;
  body?: string;
  subreddit?: string;
  mention_brand?: boolean;
  include_link?: boolean;
  tone?: "expert_human" | "casual" | "professional";
  brand_name?: string;
  brand_url?: string;
  save_as_aeo?: boolean;
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

// 🔥 NEW: Fetch REAL Reddit posts using RSS feed (more reliable than JSON API)
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

// Parse Reddit RSS to extract posts
function parseRedditRss(xml: string, subreddit: string): RealRedditPost[] {
  const posts: RealRedditPost[] = [];
  
  // Simple XML parsing for Reddit RSS feed
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;
  
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];
    
    const titleMatch = entry.match(/<title>([^<]*)<\/title>/);
    const linkMatch = entry.match(/<link href="([^"]+)"/);
    const contentMatch = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    const updatedMatch = entry.match(/<updated>([^<]+)<\/updated>/);
    
    if (titleMatch && linkMatch) {
      const url = linkMatch[1];
      // Extract post ID from URL: /r/subreddit/comments/POST_ID/...
      const idMatch = url.match(/\/comments\/([a-z0-9]+)/i);
      
      if (idMatch) {
        // Decode HTML entities in title
        const title = titleMatch[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        // Extract text from content (remove HTML)
        const content = contentMatch ? contentMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500) : "";
        
        posts.push({
          id: idMatch[1],
          title,
          body: content,
          subreddit,
          url,
          score: 0, // RSS doesn't provide score
          comments: 0, // RSS doesn't provide comment count
          createdUtc: updatedMatch ? Math.floor(new Date(updatedMatch[1]).getTime() / 1000) : 0
        });
      }
    }
  }
  
  return posts;
}

async function fetchRealRedditPosts(subreddit: string): Promise<RealRedditPost[]> {
  try {
    // Use RSS feed which is more permissive from server environments
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/new.rss?limit=25`,
      { 
        headers: { 
          "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        } 
      }
    );

    if (!res.ok) {
      // Try alternative: Pushshift API or fallback
      console.error(`[reddit-agent] RSS failed for r/${subreddit}: ${res.status}, trying fallback...`);
      
      // Fallback: Use a public Reddit search proxy
      const searchRes = await fetch(
        `https://www.reddit.com/search.json?q=subreddit:${subreddit}&sort=new&limit=20&restrict_sr=off`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );
      
      if (!searchRes.ok) {
        console.error(`[reddit-agent] Fallback also failed for r/${subreddit}: ${searchRes.status}`);
        return [];
      }
      
      const searchJson = await searchRes.json();
      if (searchJson.data?.children) {
        return searchJson.data.children
          .filter((p: any) => p.data && !p.data.stickied)
          .map((p: any) => ({
            id: p.data.id,
            title: p.data.title,
            body: p.data.selftext || "",
            subreddit: p.data.subreddit,
            url: `https://www.reddit.com${p.data.permalink}`,
            score: p.data.score || 0,
            comments: p.data.num_comments || 0,
            createdUtc: p.data.created_utc || 0
          }));
      }
      return [];
    }

    const xml = await res.text();
    const posts = parseRedditRss(xml, subreddit);
    
    console.log(`[reddit-agent] Fetched ${posts.length} posts from r/${subreddit} via RSS`);
    return posts;
  } catch (error) {
    console.error(`[reddit-agent] Error fetching r/${subreddit}:`, error);
    return [];
  }
}

/* =======================
   PROJECT CONTEXT LOADER
======================= */
interface ProjectContext {
  projectId: string;
  brandName: string;
  language: string;
  businessDescription: string;
  targetAudiences: string[];
  websiteUrl: string;
  businessType: string;
  competitors: string[];
  tone: string;
}

async function loadProjectContext(supabase: any, projectId: string): Promise<ProjectContext> {
  // Load project base info
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Load generation settings for extra context - THIS IS THE SOURCE OF TRUTH FOR LANGUAGE
  const { data: settings } = await supabase
    .from("generation_settings")
    .select("*")
    .eq("project_id", projectId)
    .single();

  // 🔒 FIXED: Prioritize generation_settings.language over project.language
  const effectiveLanguage = settings?.language || project?.language || "en";
  
  console.log(`[reddit-agent] Language source: settings=${settings?.language}, project=${project?.language}, effective=${effectiveLanguage}`);

  return {
    projectId,
    brandName: settings?.brand_name || project.brand_name || project.name,
    language: effectiveLanguage, // ✅ FIXED: Use generation_settings first
    businessDescription: settings?.business_description || project.business_description || "",
    targetAudiences: settings?.target_audiences || [],
    websiteUrl: settings?.website_url || project.website_url || "",
    businessType: project.business_type || "General",
    competitors: settings?.competitors || project.competitors || [],
    tone: settings?.tone || "professional"
  };
}

/* =======================
   KEYWORD-BASED SUBREDDIT MAPPING (LANGUAGE-AWARE)
======================= */
function getSubredditsFromKeywords(keywords: string[], language: string): string[] {
  const subreddits = new Set<string>();
  
  // Category mappings with language-specific subreddits
  const categoryMap: Record<string, { fr: string[]; en: string[] }> = {
    // Tech/SaaS/Startup
    "tech|saas|startup|mvp|dev|application|logiciel|software|ai|ia|machine learning": {
      fr: ["startups_fr", "developpeurs", "vosfinances", "AskFrance", "france"],
      en: ["startups", "SideProject", "webdev", "Entrepreneur", "SaaS", "indiehackers"]
    },
    // Furniture/Home/Decor
    "meuble|furniture|décor|canapé|sofa|interior|design|maison|home|mobilier|fauteuil|table|lit": {
      fr: ["france", "deco", "maison", "ameublement", "BrisDecoMaison"],
      en: ["InteriorDesign", "furniture", "homedesign", "HomeImprovement", "malelivingspace"]
    },
    // E-commerce/Retail
    "ecommerce|boutique|shopify|vente|store|retail|commerce|magasin": {
      fr: ["ecommerce_france", "vosfinances", "entrepreneur", "france"],
      en: ["ecommerce", "shopify", "dropship", "Entrepreneur", "FulfillmentByAmazon"]
    },
    // Marketing/SEO
    "marketing|seo|traffic|référencement|growth|acquisition|leads|publicité": {
      fr: ["SEOfr", "marketing_france", "vosfinances", "france"],
      en: ["SEO", "marketing", "GrowthHacking", "bigseo", "digitalmarketing"]
    },
    // Freelance/Agency
    "freelance|agency|agence|consultant|client|prestataire": {
      fr: ["freelance_france", "vosfinances", "france", "AskFrance"],
      en: ["freelance", "webdev", "Entrepreneur", "DigitalNomad"]
    },
    // Finance/Investment
    "finance|investissement|argent|épargne|bourse|crypto|trading": {
      fr: ["vosfinances", "france", "cryptoFR"],
      en: ["personalfinance", "investing", "stocks", "CryptoCurrency"]
    }
  };

  keywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    Object.entries(categoryMap).forEach(([pattern, subs]) => {
      if (new RegExp(pattern, "i").test(kwLower)) {
        // 🔒 CRITICAL: Only add subreddits for the project's language
        const langSubs = language === "fr" ? subs.fr : subs.en;
        langSubs.forEach(s => subreddits.add(s));
      }
    });
  });

  // Strict language-based fallback
  if (subreddits.size === 0) {
    if (language === "fr") {
      ["france", "vosfinances", "AskFrance", "entrepreneur"].forEach(s => subreddits.add(s));
    } else {
      ["startups", "Entrepreneur", "smallbusiness", "webdev", "SideProject"].forEach(s => subreddits.add(s));
    }
  }

  console.log(`[reddit-agent] Generated ${subreddits.size} subreddits for lang=${language}: ${Array.from(subreddits).join(", ")}`);
  return Array.from(subreddits);
}

/* =======================
   COHERENCE SCORING
======================= */
function computeCoherenceScore(content: string, context: ProjectContext): number {
  let score = 100;

  // Language check: detect wrong language
  const frenchIndicators = /\b(le|la|les|de|du|des|et|ou|pour|avec|dans|sur|une?|est|sont|été)\b/gi;
  const englishIndicators = /\b(the|and|or|for|with|in|on|is|are|was|were|been|have|has)\b/gi;
  
  const frenchMatches = (content.match(frenchIndicators) || []).length;
  const englishMatches = (content.match(englishIndicators) || []).length;
  
  const detectedLanguage = frenchMatches > englishMatches ? "fr" : "en";
  
  if (detectedLanguage !== context.language) {
    score -= 40; // Heavy penalty for wrong language
    console.log(`[reddit-agent] Language mismatch: expected ${context.language}, detected ${detectedLanguage}`);
  }

  // Brand mention check
  if (context.brandName && !new RegExp(escapeRegex(context.brandName), "i").test(content)) {
    score -= 10; // Minor penalty if brand not mentioned when it should be
  }

  // Check for competing brand mentions (CRITICAL)
  const competitorMentions = context.competitors.filter(comp => 
    new RegExp(escapeRegex(comp), "i").test(content)
  );
  if (competitorMentions.length > 0) {
    score -= 20 * competitorMentions.length;
    console.log(`[reddit-agent] Competitor mentioned: ${competitorMentions.join(", ")}`);
  }

  // Check for off-topic content (SaaS in furniture context, etc.)
  const offTopicPatterns = detectOffTopicPatterns(content, context);
  score -= offTopicPatterns * 15;

  return Math.max(0, Math.min(100, score));
}

function detectOffTopicPatterns(content: string, context: ProjectContext): number {
  let offTopicCount = 0;
  const lowerContent = content.toLowerCase();
  const lowerBusiness = context.businessDescription.toLowerCase();
  
  // If business is furniture/home, SaaS/tech terms are off-topic
  if (/meuble|canapé|décor|mobilier|furniture|sofa|home/i.test(lowerBusiness)) {
    if (/saas|api|tech|startup|mvp|code|développeur|developer|software/i.test(lowerContent)) {
      offTopicCount++;
    }
  }
  
  // If business is tech/SaaS, furniture terms are off-topic
  if (/saas|tech|startup|software|application|développement/i.test(lowerBusiness)) {
    if (/meuble|canapé|décor|mobilier|furniture|sofa|interior design/i.test(lowerContent)) {
      offTopicCount++;
    }
  }

  return offTopicCount;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      language,
      business_description,
      target_audiences = [],
      title,
      body,
      subreddit,
      mention_brand = false,
      include_link = false,
      tone = "expert_human",
      brand_name,
      brand_url,
      save_as_aeo = false
    }: RedditRequest = await req.json();

    console.log(`[reddit-agent] Action: ${action}${projectId ? ` for project ${projectId}` : ""}`);

    // Handle aeo-reply action
    if (action === "aeo-reply") {
      if (!title || !subreddit) {
        throw new Error("title and subreddit are required for aeo-reply action");
      }
      
      // 🔥 FIXED: Load full project context if projectId is provided
      let contextForReply: ProjectContext | null = null;
      if (projectId) {
        contextForReply = await loadProjectContext(supabase, projectId);
        console.log(`[reddit-agent] Loaded context for ${contextForReply.brandName} (${contextForReply.language})`);
      }
      
      const effectiveLanguage = contextForReply?.language || language || "en";
      const effectiveBrandName = contextForReply?.brandName || brand_name || "";
      const effectiveBrandUrl = contextForReply?.websiteUrl || brand_url || "";
      const effectiveBusinessDesc = contextForReply?.businessDescription || business_description || "";
      const effectiveTone = contextForReply?.tone || tone;
      
      const result = await generateRedditReply(
        title, 
        body || "", 
        subreddit, 
        mention_brand,
        include_link,
        effectiveTone, 
        effectiveBrandName,
        effectiveBrandUrl,
        effectiveLanguage,
        effectiveBusinessDesc,
        lovableApiKey
      );
      
      // 🔒 COHERENCE CHECK: Validate reply matches project context
      if (contextForReply) {
        const coherenceScore = computeCoherenceScore(result.reply, contextForReply);
        console.log(`[reddit-agent] Coherence score: ${coherenceScore}/100`);
        
        if (coherenceScore < 60) {
          console.warn(`[reddit-agent] Low coherence score (${coherenceScore}), content may be off-topic`);
          // Could regenerate here, but for now just log warning
        }
      }
      
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
              answer: "",
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

    // 🔥 FIXED: Load FULL project context (brand, language, business, tone)
    const projectContext = await loadProjectContext(supabase, projectId);
    console.log(`[reddit-agent] Loaded context: ${projectContext.brandName} | ${projectContext.language} | ${projectContext.businessType}`);

    // Validate language consistency
    if (language && language !== projectContext.language) {
      console.warn(`[reddit-agent] Language override: request=${language}, project=${projectContext.language}`);
    }

    // 🔥 NEW: Fetch keywords from database if none provided
    let effectiveKeywords = keywords;
    if (effectiveKeywords.length === 0) {
      console.log(`[reddit-agent] No keywords provided, fetching from database...`);
      const { data: dbKeywords, error: keywordsError } = await supabase
        .from("keywords")
        .select("keyword")
        .eq("project_id", projectId)
        .limit(20);

      if (!keywordsError && dbKeywords && dbKeywords.length > 0) {
        effectiveKeywords = dbKeywords.map(k => k.keyword);
        console.log(`[reddit-agent] Using ${effectiveKeywords.length} keywords from database`);
      }
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
    let storeInDb = false;
    
    try {
      const body = await req.json();
      storeInDb = body.storeInDb === true;
    } catch {}

    switch (action) {
      case "find-opportunities":
        result = await findOpportunities(
          projectContext, 
          effectiveKeywords, 
          subreddits, 
          lovableApiKey
        );
        
        // 🔥 NEW: Store opportunities in database if requested
        if (storeInDb && result.opportunities && result.opportunities.length > 0) {
          console.log(`[reddit-agent] Storing ${result.opportunities.length} opportunities in database`);
          
          for (const opp of result.opportunities.slice(0, 20)) {
            try {
              // Check if this post already exists (by URL)
              const { data: existing } = await supabase
                .from("reddit_responses")
                .select("id")
                .eq("project_id", projectId)
                .eq("reddit_post_url", opp.url)
                .limit(1);
              
              if (!existing || existing.length === 0) {
                await supabase
                  .from("reddit_responses")
                  .insert({
                    project_id: projectId,
                    subreddit: opp.subreddit?.replace("r/", "") || "unknown",
                    reddit_post_title: opp.title || "Untitled",
                    reddit_post_url: opp.url,
                    generated_reply: "", // Empty until user generates
                    original_question: opp.title,
                    is_posted_to_reddit: false,
                    is_shared: false
                  });
              }
            } catch (insertErr) {
              console.error(`[reddit-agent] Failed to insert opportunity:`, insertErr);
            }
          }
        }
        break;
      case "generate-responses":
        result = await generateResponses(projectContext, subreddits, effectiveKeywords, lovableApiKey);
        break;
      case "analyze-subreddits":
        result = await analyzeSubreddits(projectContext, subreddits, lovableApiKey);
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

// 🔥 FIXED: Use REAL Reddit posts with LOCKED project context
async function findOpportunities(
  context: ProjectContext,
  keywords: string[],
  subreddits: string[],
  apiKey: string
): Promise<{ opportunities: any[] }> {
  
  // 🔒 FIXED: Use keywords to generate language-specific subreddits
  const targetSubreddits = subreddits.length > 0 
    ? subreddits.slice(0, 8) 
    : getSubredditsFromKeywords(keywords, context.language);

  console.log(`[reddit-agent] Finding opportunities for ${context.brandName} | lang=${context.language} | subs=${targetSubreddits.join(", ")}`);

  // 1. Fetch REAL posts from Reddit
  const allPosts: RealRedditPost[] = [];
  for (const sub of targetSubreddits) {
    const posts = await fetchRealRedditPosts(sub);
    allPosts.push(...posts);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[reddit-agent] Fetched ${allPosts.length} real Reddit posts`);

  if (allPosts.length === 0) {
    return { opportunities: [] };
  }

  // 2. Pre-filter posts by keyword relevance (boost efficiency)
  const keywordRegex = new RegExp(keywords.slice(0, 10).join("|"), "i");
  const relevantPosts = allPosts.filter(p => 
    keywordRegex.test(p.title) || keywordRegex.test(p.body)
  );
  
  // Mix: relevant posts first, then some general ones
  const postsToAnalyze = [
    ...relevantPosts.slice(0, 20),
    ...allPosts.filter(p => !relevantPosts.includes(p)).slice(0, 10)
  ];

  const postsForAI = postsToAnalyze.slice(0, 30).map(p => ({
    id: p.id,
    title: p.title,
    body: p.body.substring(0, 200),
    subreddit: p.subreddit,
    url: p.url,
    score: p.score,
    comments: p.comments
  }));

  // 🔥 FIXED: Build LOCKED context prompt (no context mixing)
  const prompt = `You are analyzing REAL Reddit posts to find engagement opportunities.

🔒 LOCKED CONTEXT (DO NOT DEVIATE):
- Brand: ${context.brandName}
- Language: ${context.language === "fr" ? "FRENCH (répondre uniquement en français)" : "ENGLISH (respond only in English)"}
- Industry: ${context.businessType}
- Business Description: ${context.businessDescription}
- Target Audiences: ${context.targetAudiences.join(", ") || "General"}
- Keywords: ${keywords.join(", ") || "general topics"}

CRITICAL LANGUAGE RULES:
${context.language === "fr" ? `
- ONLY select posts written in FRENCH (titre et contenu en français)
- Reject ANY post with English sentences unless it's a technical term
- French subreddits (r/france, r/vosfinances, r/AskFrance) are MANDATORY
- If no French posts match, return empty array rather than English posts
` : `
- ONLY select posts written in ENGLISH
- Reject ANY post with non-English text (except brand names)
`}

Here are REAL Reddit posts (with real URLs):
${JSON.stringify(postsForAI, null, 2)}

Select the TOP 10 posts where replying would be:
1. HIGHLY RELEVANT to "${context.brandName}"'s expertise: ${context.businessDescription.substring(0, 200)}
2. Natural place to share knowledge (not promotional)
3. Posts with < 50 comments (less competition)
4. Questions, help requests, or discussions work best
5. ${context.language === "fr" ? "ONLY French posts (French language mandatory)" : "English posts only"}

SCORING PRIORITY:
- Posts mentioning keywords directly = HIGH priority
- Posts about topics ${context.brandName} can genuinely help with = MEDIUM priority
- General industry posts = LOW priority

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
      "reason": "Why this post is relevant to ${context.brandName}'s expertise (in ${context.language === "fr" ? "French" : "English"})"
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
        { 
          role: "system", 
          content: `You are a Reddit analyst working EXCLUSIVELY for ${context.brandName}. 
Language: ${context.language === "fr" ? "FRENCH ONLY" : "ENGLISH ONLY"}.
Return valid JSON only. Never invent data. Never mention competing brands.` 
        },
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
  context: ProjectContext,
  subreddits: string[],
  keywords: string[],
  apiKey: string
): Promise<{ responses: Array<{ subreddit: string; topic: string; response: string }> }> {
  const prompt = `Generate helpful Reddit responses for a brand:

🔒 LOCKED CONTEXT:
- Brand: ${context.brandName}
- Website: ${context.websiteUrl}
- Industry: ${context.businessType}
- Business: ${context.businessDescription}
- Language: ${context.language === "fr" ? "FRENCH (répondre en français uniquement)" : "ENGLISH only"}
- Subreddits to target: ${subreddits.join(", ") || "general industry subreddits"}
- Topics/Keywords: ${keywords.join(", ") || "industry topics"}

Create 5 template responses that:
1. Answer common questions in the industry
2. Share useful tips and insights
3. Are genuinely helpful, not promotional
4. Build authority and trust for ${context.brandName}
5. Follow Reddit community guidelines
6. Are written ENTIRELY in ${context.language === "fr" ? "French" : "English"}

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
        { 
          role: "system", 
          content: `You are a Reddit expert working EXCLUSIVELY for ${context.brandName}. 
Write ONLY in ${context.language === "fr" ? "FRENCH" : "ENGLISH"}. Respond with valid JSON only.` 
        },
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
  context: ProjectContext,
  subreddits: string[],
  apiKey: string
): Promise<{ analysis: Array<{ subreddit: string; relevance: number; audienceMatch: number; activityLevel: string; bestPostTypes: string[] }> }> {
  
  // Suggest subreddits based on language
  const defaultSuggestions = context.language === "fr"
    ? "france, vosfinances, entrepreneur, startups, developpeurs"
    : "startups, Entrepreneur, SideProject, webdev, smallbusiness";

  const prompt = `Analyze subreddits for marketing potential:

🔒 LOCKED CONTEXT:
- Brand: ${context.brandName}
- Industry: ${context.businessType}
- Target Audience: ${context.targetAudiences.join(", ") || "General audience"}
- Language: ${context.language === "fr" ? "FRENCH (prioritize French-speaking subreddits)" : "ENGLISH"}
- Subreddits to analyze: ${subreddits.join(", ") || defaultSuggestions}

For each subreddit, analyze:
1. Relevance to ${context.brandName} (0-100)
2. Audience match for ${context.businessDescription.substring(0, 100)} (0-100)
3. Activity level (high/medium/low)
4. Best types of posts for engagement
5. Key topics discussed

Return JSON (respond in ${context.language === "fr" ? "French" : "English"}):
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
        { 
          role: "system", 
          content: `You are a Reddit analyst working for ${context.brandName}. 
Respond in ${context.language === "fr" ? "FRENCH" : "ENGLISH"} with valid JSON only.` 
        },
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

// 🔒 PATCH 3 — Reddit tone with language support
async function generateRedditReply(
  title: string,
  body: string,
  subreddit: string,
  mentionBrand: boolean,
  includeLink: boolean,
  tone: string,
  brandName: string,
  brandUrl: string,
  language: string,
  businessDescription: string,
  apiKey: string
): Promise<{ reply: string; estimatedScore: number; brandMentioned: boolean; linkIncluded: boolean }> {
  
  const toneInstructions: Record<string, string> = {
    expert_human: "Write like someone who's been doing this for years. Share from experience, not theory.",
    casual: "Write like you're chatting with a friend. Keep it real, maybe a bit sarcastic.",
    professional: "Write clearly but warmly. No corporate speak. Be direct and helpful."
  };

  // Language-specific instructions
  const languageInstructions = language === "fr" 
    ? "Écris en français naturel et conversationnel. Utilise le tutoiement si approprié sur Reddit."
    : "Write in natural, conversational English.";

  // 🔒 PATCH 2 — Brand mention = probabilistic (30% chance if enabled)
  const shouldMentionBrand = mentionBrand && brandName && Math.random() < 0.3;
  const shouldIncludeLink = includeLink && brandUrl && shouldMentionBrand && Math.random() < 0.5;
  const actualBrandName = brandName || (language === "fr" ? "un outil que j'ai testé" : "a tool I tried");

  // Business context for more relevant replies
  const businessContext = businessDescription 
    ? `\nYour expertise context (use subtly): ${businessDescription}` 
    : "";

  // 🔒 System prompt with language awareness
  const systemPrompt = `You are a real Reddit user.
You write like someone who has actually done the work.
No jargon. No teaching. No SEO terms. No marketing language.
No structured lists unless it feels natural.
Short paragraphs. One idea per paragraph.
Slight uncertainty is OK ("I think", "in my case", "YMMV").
Never sound like an article or a blog post.
Never mention AI, machine learning, or automation.
${languageInstructions}
Tone: ${toneInstructions[tone] || toneInstructions.expert_human}${businessContext}`;

  const userPrompt = `Reddit post to respond to:
Title: ${title}
${body ? `Body: ${body}` : "(No body text)"}
Subreddit: r/${subreddit}

Write a Reddit comment ${language === "fr" ? "EN FRANÇAIS" : "in English"} that:
- Answers practically as a fellow Redditor who's been there
- Maximum 100 words (shorter is better)
- Ends with a casual question or "curious what others think"
- Sounds like a real person, not a consultant
${shouldMentionBrand ? `- You can briefly mention "${actualBrandName}" as something you personally tried (1 phrase max, ultra casual)${shouldIncludeLink ? ` and casually drop the link: ${brandUrl}` : ""}` : "- Do NOT mention any product, tool, or service by name"}

Write the Reddit comment now:`;

  console.log(`[reddit-agent] Generating reply for r/${subreddit}: "${title.substring(0, 50)}..." (brand: ${shouldMentionBrand}, link: ${shouldIncludeLink})`);

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
      temperature: 0.8,
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

  console.log(`[reddit-agent] Generated reply (${reply.length} chars), score: ${estimatedScore}, brand: ${!!shouldMentionBrand}, link: ${!!shouldIncludeLink}`);

  return { 
    reply, 
    estimatedScore, 
    brandMentioned: !!shouldMentionBrand, 
    linkIncluded: !!shouldIncludeLink 
  };
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
