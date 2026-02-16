import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type } = await req.json(); // "search" | "pmax"
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Scrape lovelyanswers.com homepage
    let pageContent = "";
    try {
      const res = await fetch("https://lovelyanswers.com", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AdsBot/1.0)" },
      });
      const html = await res.text();
      // Extract text content from HTML
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 6000);
    } catch (e) {
      console.error("Scrape failed:", e);
      pageContent = "LovelyAnswers - AI-powered AEO (Answer Engine Optimization) SaaS platform. Helps businesses get cited by ChatGPT, Perplexity, Gemini. Services: AEO content generation, article creation, keyword research, SEO audit, Reddit marketing, Google Ads management, local SEO. Target: marketing agencies, SaaS companies, e-commerce. Pricing plans available.";
    }

    const systemPrompt = type === "search"
      ? `You are a Google Ads expert. Based on the website content, generate a complete Search campaign configuration for lovelyanswers.com (a SaaS AEO platform).

Return ONLY valid JSON with this exact structure:
{
  "campaignName": "Search - LovelyAnswers AEO",
  "dailyBudget": "30",
  "biddingStrategy": "maximize_conversions",
  "language": "en",
  "locations": ["FR", "US", "GB", "CA"],
  "callouts": ["string array, max 25 chars each, 4-6 items"],
  "sitelinks": [{"text": "Link Text", "url": "https://lovelyanswers.com/page"}],
  "negativeKeywords": ["irrelevant terms"],
  "adGroups": [
    {
      "name": "Ad Group Name",
      "finalUrl": "https://lovelyanswers.com/relevant-page",
      "seedKeywords": ["keyword1", "keyword2", "keyword3"],
      "headlines": ["Headline 1 (30 chars max)", "Headline 2", "Headline 3"],
      "descriptions": ["Description 1 (90 chars max)", "Description 2"],
      "path1": "path1",
      "path2": "path2"
    }
  ]
}

RULES:
- Create 3-5 ad groups based on distinct service categories found on the site
- Each ad group: 5-8 seed keywords (long-tail, high intent, EN)
- Headlines: 5-8 per group, max 30 chars, compelling with CTA
- Descriptions: 2-3 per group, max 90 chars, benefit-focused
- Sitelinks: 4-6, link to real pages on the site
- Callouts: highlight key USPs (AI-powered, free trial, etc.)
- Negative keywords: 10-15 irrelevant terms
- Focus on conversion intent keywords (buy, pricing, tool, platform, software)
- Include competitor comparison keywords if relevant`
      : `You are a Google Ads expert. Based on the website content, generate a complete Performance Max (Service/Lead Gen) campaign for lovelyanswers.com (a SaaS AEO platform).

Return ONLY valid JSON with this exact structure:
{
  "campaignName": "PMax - LovelyAnswers AEO",
  "dailyBudget": "25",
  "biddingStrategy": "maximize_conversions",
  "language": "en",
  "locations": ["FR", "US", "GB", "CA"],
  "brandName": "LovelyAnswers",
  "finalUrl": "https://lovelyanswers.com",
  "searchThemes": ["theme1", "theme2"],
  "headlines": ["Headline (30 chars max)"],
  "longHeadlines": ["Long headline (90 chars max)"],
  "descriptions": ["Description (90 chars max)"]
}

RULES:
- 15-25 search themes covering all services, competitor terms, and use cases
- 10-15 headlines, max 30 chars each, mix of brand + benefit + CTA
- 3-5 long headlines, max 90 chars
- 4-5 descriptions, max 90 chars, benefit-focused
- Search themes should include: service names, competitor names (chatgpt seo, perplexity optimization), use cases (get cited by ai, ai seo tool), and buying intent terms`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the website content to analyze:\n\n${pageContent}\n\nGenerate the ${type === "search" ? "Search" : "PMax"} campaign configuration now. Return ONLY the JSON, no markdown.` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please retry in a moment" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants. Ajoutez des crédits dans Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed: " + errText);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    
    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI returned no valid JSON");

    const config = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-google-ads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
