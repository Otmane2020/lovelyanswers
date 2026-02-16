import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type } = await req.json(); // "search" | "pmax"
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not configured");

    // Scrape lovelyanswers.com homepage
    let pageContent = "";
    try {
      const res = await fetch("https://lovelyanswers.com", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; AdsBot/1.0)" },
      });
      const html = await res.text();
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
      : `You are a Google Ads Performance Max expert. Based on the website content, generate the MOST COMPLETE Performance Max (Service/Lead Gen) campaign possible for lovelyanswers.com.

Return ONLY valid JSON with this exact structure:
{
  "campaignName": "PMax - LovelyAnswers AEO",
  "dailyBudget": 25,
  "biddingStrategy": "maximize_conversions",
  "language": "en",
  "locations": ["FR", "US", "GB", "CA"],
  "brandName": "LovelyAnswers",
  "finalUrl": "https://lovelyanswers.com",
  "businessName": "LovelyAnswers",
  "businessLogoUrl": "https://lovelyanswers.com/favicon.png",
  "searchThemes": ["theme1", "theme2"],
  "headlines": ["Headline (30 chars max)"],
  "longHeadlines": ["Long headline (90 chars max)"],
  "descriptions": ["Description (90 chars max)"],
  "sitelinks": [
    {"text": "Sitelink Text (max 25 chars)", "description1": "Line 1 (max 35 chars)", "description2": "Line 2 (max 35 chars)", "finalUrl": "https://lovelyanswers.com/page"}
  ],
  "callouts": ["Callout text (max 25 chars)"],
  "callToAction": "SIGN_UP",
  "imageUrls": ["https://lovelyanswers.com/og-image.png"],
  "leadFormHeadline": "Get Started with LovelyAnswers",
  "leadFormDescription": "Sign up for a free trial and boost your AI visibility",
  "leadFormFields": ["FULL_NAME", "EMAIL", "PHONE_NUMBER", "COMPANY_NAME"],
  "leadFormPrivacyPolicyUrl": "https://lovelyanswers.com/privacy",
  "leadFormSubmitButtonText": "Submit",
  "audienceSignals": {
    "customSegments": ["AI SEO tools users", "Content marketing professionals"],
    "interests": ["Search Engine Optimization", "Digital Marketing", "AI Tools"],
    "demographics": {"ageRanges": ["25-34", "35-44", "45-54"], "genders": ["all"]}
  },
  "negativeKeywords": ["free download", "tutorial youtube"],
  "urlExclusions": ["/admin", "/superadmin", "/auth"]
}

RULES:
- 15-25 search themes covering all services, competitor terms, and use cases
- 10-15 headlines, max 30 chars each, mix of brand + benefit + CTA
- 3-5 long headlines, max 90 chars
- 4-5 descriptions, max 90 chars, benefit-focused
- 4-6 sitelinks with descriptions pointing to real pages (pricing, features, blog, signup, about)
- 6-8 callouts highlighting USPs (AI-Powered, Free Trial, No Code, 24/7 Support, etc.)
- callToAction: one of SIGN_UP, LEARN_MORE, GET_QUOTE, SUBSCRIBE, CONTACT_US, BOOK_NOW
- imageUrls: extract any OG images, hero images, or logo URLs from the website
- businessLogoUrl: the favicon or logo URL
- Lead form: generate a compelling headline + description for lead generation
- leadFormFields: choose from FULL_NAME, EMAIL, PHONE_NUMBER, COMPANY_NAME, CITY, POSTAL_CODE
- audienceSignals: define custom segments, interests, and demographics
- negativeKeywords: 10-15 irrelevant terms to exclude
- urlExclusions: admin/internal paths to exclude from dynamic URL expansion
- Search themes should include: service names, competitor names (chatgpt seo, perplexity optimization), use cases (get cited by ai, ai seo tool), and buying intent terms
- CRITICAL: ALL text (search themes, headlines, long headlines, descriptions, callouts, sitelinks, lead form) MUST be written in ENGLISH. Never use French or any other language.`;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
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
        return new Response(JSON.stringify({ error: "Crédits OpenRouter insuffisants" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed: " + errText);
    }

    const aiData = await aiResponse.json();
    const raw = aiData.choices?.[0]?.message?.content || "";
    
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
