import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { accountId, prompt, websiteUrl, businessDescription, language = "fr", budget } = body;

    if (!accountId || !prompt) {
      return new Response(JSON.stringify({ error: "accountId and prompt are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to generate complete campaign structure
    const systemPrompt = `You are a Google Ads expert. Generate a complete Google Ads campaign structure based on the user's request.
Return a JSON object with this exact structure:
{
  "campaign": {
    "name": "Campaign name",
    "campaign_type": "SEARCH",
    "bidding_strategy": "MAXIMIZE_CLICKS",
    "budget_amount": ${budget || 10},
    "budget_currency": "EUR",
    "target_locations": ["France"],
    "target_languages": ["${language}"]
  },
  "ad_groups": [
    {
      "name": "Ad Group Name",
      "cpc_bid": 1.5,
      "ads": [
        {
          "headlines": ["Headline 1", "Headline 2", "Headline 3"],
          "descriptions": ["Description 1", "Description 2"],
          "final_urls": ["${websiteUrl || "https://example.com"}"],
          "path1": "path1",
          "path2": "path2"
        }
      ],
      "keywords": [
        { "keyword": "keyword 1", "match_type": "PHRASE", "is_negative": false },
        { "keyword": "negative keyword", "match_type": "EXACT", "is_negative": true }
      ]
    }
  ]
}

Rules:
- Headlines max 30 chars each, provide 3-15 per ad
- Descriptions max 90 chars each, provide 2-4 per ad
- Generate 2-5 ad groups with relevant themes
- Each ad group should have 2-3 ads
- Include 10-20 positive keywords and 5-10 negative keywords per ad group
- Use ${language} language for all ad copy
- Match types: BROAD, PHRASE, EXACT
- Business context: ${businessDescription || "N/A"}
- ONLY return valid JSON, no markdown or explanation`;

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
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let campaignData;
    try {
      campaignData = JSON.parse(content);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const camp = campaignData.campaign;

    // 1. Create campaign
    const { data: campaignRow, error: campErr } = await adminClient
      .from("google_ads_campaigns")
      .insert({
        account_id: accountId,
        name: camp.name,
        campaign_type: camp.campaign_type || "SEARCH",
        bidding_strategy: camp.bidding_strategy || "MAXIMIZE_CLICKS",
        budget_amount: camp.budget_amount,
        budget_currency: camp.budget_currency || "EUR",
        target_locations: camp.target_locations || [],
        target_languages: camp.target_languages || [language],
        ai_generated: true,
        ai_prompt: prompt,
        status: "draft",
      })
      .select("id")
      .single();

    if (campErr) {
      console.error("Campaign insert error:", campErr);
      return new Response(JSON.stringify({ error: "Failed to save campaign" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const campaignId = campaignRow.id;
    const results = { campaign_id: campaignId, ad_groups: [] as any[] };

    // 2. Create ad groups, ads, keywords
    for (const ag of campaignData.ad_groups || []) {
      const { data: agRow, error: agErr } = await adminClient
        .from("google_ads_ad_groups")
        .insert({
          campaign_id: campaignId,
          name: ag.name,
          cpc_bid: ag.cpc_bid || 1.0,
          ai_generated: true,
          status: "draft",
        })
        .select("id")
        .single();

      if (agErr) {
        console.error("Ad group insert error:", agErr);
        continue;
      }

      const adGroupId = agRow.id;
      const agResult: any = { id: adGroupId, name: ag.name, ads: [], keywords: [] };

      // Insert ads
      for (const ad of ag.ads || []) {
        const { data: adRow, error: adErr } = await adminClient
          .from("google_ads_ads")
          .insert({
            ad_group_id: adGroupId,
            headlines: ad.headlines || [],
            descriptions: ad.descriptions || [],
            final_urls: ad.final_urls || [],
            path1: ad.path1 || null,
            path2: ad.path2 || null,
            ai_generated: true,
            status: "draft",
          })
          .select("id")
          .single();

        if (!adErr && adRow) agResult.ads.push(adRow.id);
      }

      // Insert keywords
      for (const kw of ag.keywords || []) {
        const { data: kwRow, error: kwErr } = await adminClient
          .from("google_ads_keywords")
          .insert({
            ad_group_id: adGroupId,
            keyword: kw.keyword,
            match_type: kw.match_type || "PHRASE",
            is_negative: kw.is_negative || false,
            ai_generated: true,
            status: "active",
          })
          .select("id")
          .single();

        if (!kwErr && kwRow) agResult.keywords.push({ id: kwRow.id, keyword: kw.keyword, is_negative: kw.is_negative });
      }

      results.ad_groups.push(agResult);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
