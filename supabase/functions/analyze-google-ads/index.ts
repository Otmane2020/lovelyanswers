import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { focus, campaign_id } = await req.json();
    // focus: "all" | "ad_groups" | "keywords" | "roas" | "strategy" | "conversions"

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch campaigns
    let campaignsQuery = adminClient
      .from("campaigns_sync")
      .select("*")
      .eq("user_id", userId)
      .order("spend_7d", { ascending: false });

    if (campaign_id) {
      campaignsQuery = campaignsQuery.eq("google_campaign_id", campaign_id);
    }

    const { data: campaigns } = await campaignsQuery;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune campagne trouvée. Synchronisez d'abord." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch keywords and ads for all campaigns
    const campaignIds = campaigns.map(c => c.id);

    const [{ data: keywords }, { data: ads }] = await Promise.all([
      adminClient
        .from("keywords_sync")
        .select("*")
        .eq("user_id", userId)
        .in("campaign_sync_id", campaignIds)
        .order("clicks", { ascending: false })
        .limit(200),
      adminClient
        .from("ads_sync")
        .select("*")
        .eq("user_id", userId)
        .in("campaign_sync_id", campaignIds)
        .order("clicks", { ascending: false })
        .limit(100),
    ]);

    // Build context for AI
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend_7d || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks_7d || 0), 0);
    const totalConversions = campaigns.reduce((s, c) => s + (c.conversions_7d || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue_7d || 0), 0);
    const avgCTR = campaigns.reduce((s, c) => s + (c.ctr_7d || 0), 0) / campaigns.length;
    const globalROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const globalCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;

    const campaignsSummary = campaigns.map(c => ({
      name: c.name,
      status: c.status,
      type: c.advertising_channel_type,
      bidding: c.bidding_strategy_type,
      budget_day: c.budget_amount_micros ? (c.budget_amount_micros / 1000000).toFixed(2) : "?",
      spend_7d: (c.spend_7d || 0).toFixed(2),
      clicks_7d: c.clicks_7d || 0,
      impressions_7d: c.impressions_7d || 0,
      ctr_7d: ((c.ctr_7d || 0) * 100).toFixed(2) + "%",
      cpc_7d: (c.cpc_7d || 0).toFixed(2),
      conversions_7d: (c.conversions_7d || 0).toFixed(1),
      revenue_7d: (c.revenue_7d || 0).toFixed(2),
      roas_7d: (c.roas_7d || 0).toFixed(2),
      primary_status: c.primary_status,
    }));

    const keywordsSummary = (keywords || []).slice(0, 100).map(k => ({
      keyword: k.keyword_text,
      match: k.match_type,
      qs: k.quality_score,
      qs_creative: k.quality_score_creative,
      qs_landing: k.quality_score_landing,
      qs_ctr: k.quality_score_expected_ctr,
      status: k.status,
      clicks: k.clicks || 0,
      impressions: k.impressions || 0,
      cost: k.cost_micros ? (k.cost_micros / 1000000).toFixed(2) : "0",
      conversions: k.conversions || 0,
      ad_group: k.ad_group_name,
      cpc_bid: k.cpc_bid_micros ? (k.cpc_bid_micros / 1000000).toFixed(2) : null,
      first_page_cpc: k.first_page_cpc_micros ? (k.first_page_cpc_micros / 1000000).toFixed(2) : null,
    }));

    const adsSummary = (ads || []).slice(0, 50).map(a => {
      const headlines = Array.isArray(a.headlines)
        ? a.headlines.map((h: any) => typeof h === "string" ? h : h.text || "")
        : [];
      const descriptions = Array.isArray(a.descriptions)
        ? a.descriptions.map((d: any) => typeof d === "string" ? d : d.text || "")
        : [];
      return {
        ad_group: a.ad_group_name,
        status: a.status,
        strength: a.ad_strength,
        headlines,
        descriptions,
        urls: a.final_urls,
        clicks: a.clicks || 0,
        impressions: a.impressions || 0,
        cost: a.cost_micros ? (a.cost_micros / 1000000).toFixed(2) : "0",
        conversions: a.conversions || 0,
      };
    });

    // Build focus-specific prompt
    let focusInstruction = "";
    switch (focus) {
      case "keywords":
        focusInstruction = `
FOCUS: Keyword Optimization
- Identify low Quality Score keywords and suggest improvements (landing page, ad relevance, expected CTR)
- Find keywords with high spend but 0 conversions → suggest pausing or adjusting bids
- Identify keywords with good conversions but low impression share → suggest bid increases
- Suggest negative keywords to add based on patterns
- Recommend match type changes (broad → phrase → exact) where appropriate
- Highlight keyword cannibalization between ad groups`;
        break;
      case "ad_groups":
        focusInstruction = `
FOCUS: Ad Group Optimization
- Analyze ad group structure and suggest consolidation or splitting
- Identify ad groups with too many/few keywords
- Check ad-to-keyword relevance within each group
- Suggest new ad groups for better segmentation
- Identify underperforming ad groups to pause
- Check landing page alignment per ad group`;
        break;
      case "roas":
        focusInstruction = `
FOCUS: ROAS & Revenue Optimization
- Calculate and compare ROAS by campaign, ad group, and keyword
- Identify high-ROAS segments to scale up
- Find low-ROAS segments bleeding budget → suggest fixes or pause
- Recommend budget reallocation for maximum ROAS
- Suggest bidding strategy changes (tROAS, Max Conv Value)
- Estimate revenue impact of recommended changes`;
        break;
      case "strategy":
        focusInstruction = `
FOCUS: Strategic Campaign Analysis
- Evaluate overall account structure and campaign strategy
- Assess bidding strategies vs business goals
- Recommend campaign type changes (Search, PMax, Display)
- Suggest new campaign opportunities based on data gaps
- Evaluate budget distribution across campaigns
- Recommend A/B testing priorities
- Assess competitive positioning and market opportunity`;
        break;
      case "conversions": {
        // Non-streaming: generate conversion goals as JSON
        const convSystemPrompt = `Tu es un expert Google Ads. Analyse les données de campagnes et génère des objectifs de conversion pertinents.
Retourne UNIQUEMENT un JSON valide avec cette structure:
{"goals":[{"name":"Nom de l'objectif","type":"purchase|lead|signup|call|page_view","value":50,"tag":"CONVERSION_LABEL_SUGGESTION"}]}
Génère 3-6 objectifs basés sur le type de business et les données de campagnes.`;

        const convUserPrompt = `Données campagnes (7j): Dépenses=${totalSpend.toFixed(2)}€, Clics=${totalClicks}, Conversions=${totalConversions.toFixed(1)}, Revenue=${totalRevenue.toFixed(2)}€
Campagnes: ${JSON.stringify(campaignsSummary.map(c => ({ name: c.name, type: c.type, bidding: c.bidding })))}
Mots-clés principaux: ${keywordsSummary.slice(0, 20).map(k => k.keyword).join(", ")}`;

        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const convResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: convSystemPrompt },
              { role: "user", content: convUserPrompt },
            ],
          }),
        });

        if (!convResp.ok) {
          return new Response(JSON.stringify({ error: "AI generation failed" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const convData = await convResp.json();
        let content = convData.choices?.[0]?.message?.content || "";
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        
        try {
          const parsed = JSON.parse(content);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          return new Response(JSON.stringify({ goals: [], raw: content }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      default: // "all"
        focusInstruction = `
FOCUS: Complete Account Audit
Cover ALL areas: keywords, ad groups, ads, ROAS, bidding strategy, budget allocation, and account structure.
Prioritize recommendations by estimated impact.`;
    }

    const systemPrompt = `Tu es un expert Google Ads senior avec 15 ans d'expérience. Tu analyses des données réelles de campagnes Google Ads et fournis des recommandations actionnables et précises.

Règles:
- Réponds TOUJOURS en français
- Sois direct et actionnable, pas de généralités
- Utilise des données chiffrées pour appuyer tes recommandations
- Classe les recommandations par impact estimé (🔴 Critique, 🟡 Important, 🟢 Amélioration)
- Pour chaque recommandation, estime l'impact potentiel en €/mois ou en %
- Donne des actions concrètes (pas "améliorez vos annonces" mais "ajoutez le mot-clé X dans le titre 1")

${focusInstruction}`;

    const userPrompt = `Analyse ces données Google Ads (7 derniers jours):

## KPIs Globaux
- Dépenses: ${totalSpend.toFixed(2)}€
- Clics: ${totalClicks}
- Conversions: ${totalConversions.toFixed(1)}
- Revenue: ${totalRevenue.toFixed(2)}€
- ROAS global: ${globalROAS.toFixed(2)}
- CPA moyen: ${globalCPA.toFixed(2)}€
- CTR moyen: ${(avgCTR * 100).toFixed(2)}%

## Campagnes (${campaigns.length})
${JSON.stringify(campaignsSummary, null, 2)}

## Mots-clés (top ${keywordsSummary.length})
${JSON.stringify(keywordsSummary, null, 2)}

## Annonces (top ${adsSummary.length})
${JSON.stringify(adsSummary, null, 2)}

Fournis une analyse détaillée avec des recommandations actionnables classées par impact.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits AI insuffisants." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stream the response back
    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error: any) {
    console.error("analyze-google-ads error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
