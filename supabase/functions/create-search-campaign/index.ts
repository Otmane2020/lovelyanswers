import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v22";

// ─── Helpers ─────────────────────────────────────────────

const cut = (s: string, n: number): string => s.length > n ? s.slice(0, n) : s;

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

async function mutateResource(
  accessToken: string,
  customerId: string,
  resource: string,
  operations: unknown[],
  managerCustomerId?: string
): Promise<{ results?: { resourceName?: string }[] }> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "",
    "Content-Type": "application/json",
  };
  if (managerCustomerId && managerCustomerId !== customerId) {
    headers["login-customer-id"] = managerCustomerId;
  }

  const response = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${customerId}/${resource}:mutate`,
    { method: "POST", headers, body: JSON.stringify({ operations }) }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`mutate ${resource} failed: ${errorText}`);
  }
  return await response.json();
}

async function atomicMutate(
  accessToken: string,
  customerId: string,
  mutateOperations: unknown[],
  managerCustomerId?: string
): Promise<{ mutateOperationResponses?: unknown[] }> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "",
    "Content-Type": "application/json",
  };
  if (managerCustomerId && managerCustomerId !== customerId) {
    headers["login-customer-id"] = managerCustomerId;
  }

  const response = await fetch(
    `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        mutateOperations,
        partialFailure: false,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Atomic mutate failed: ${errorText}`);
  }
  return await response.json();
}

// ─── Geo & Language maps ─────────────────────────────────

const GEO_MAP: Record<string, string> = {
  FR: "2250", BE: "2056", CH: "2756", DE: "2276", ES: "2724",
  IT: "2380", NL: "2528", US: "2840", GB: "2826", CA: "2124",
  PT: "2620", AT: "2040", LU: "2442", MA: "2504", TN: "2788",
};

const LANG_MAP: Record<string, string> = {
  fr: "1002", en: "1000", de: "1001", es: "1003",
  it: "1004", nl: "1010", pt: "1014",
};

// ─── Interfaces ──────────────────────────────────────────

interface SearchAdGroup {
  name: string;
  cpcBidMicros?: number;
  finalUrl: string;
  keywords: { text: string; matchType: "EXACT" | "PHRASE" | "BROAD" }[];
  headlines: string[];
  descriptions: string[];
  path1?: string;
  path2?: string;
}

interface SearchSitelink {
  linkText: string;
  finalUrls: string[];
  description1?: string;
  description2?: string;
}

interface SearchCampaignParams {
  name: string;
  dailyBudget: number;
  locations?: string[];
  language?: string;
  brandName?: string;
  biddingStrategy: "manual_cpc" | "maximize_clicks" | "maximize_conversions" | "target_cpa";
  targetCpaMicros?: number;
  adGroups: SearchAdGroup[];
  sitelinks?: SearchSitelink[];
  callouts?: string[];
}

// ─── Main ────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Google Ads connection
    const { data: connection } = await supabase
      .from("user_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("connection_type", "google_ads")
      .eq("status", "connected")
      .maybeSingle();

    if (!connection?.access_token || !connection.account_id) {
      return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.access_token as string;
    if (connection.token_expires_at && new Date(connection.token_expires_at as string) < new Date()) {
      const newToken = await refreshAccessToken(connection.refresh_token || "");
      if (!newToken) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = newToken;
      await supabase.from("user_connections").update({
        access_token: newToken,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      }).eq("id", connection.id);
    }

    const customerId = (connection.account_id as string).replace(/-/g, "");
    const metadata = connection.metadata as Record<string, unknown> || {};
    const managerCustomerId = (metadata.manager_customer_id as string || "").replace(/-/g, "") || undefined;

    // Parse params
    const params: SearchCampaignParams = await req.json();
    const warnings: string[] = [];

    // Validate
    if (!params.name) throw new Error("Campaign name is required");
    if (!params.adGroups?.length) throw new Error("At least one ad group is required");
    for (const ag of params.adGroups) {
      if (ag.headlines.length < 3) throw new Error(`AdGroup "${ag.name}" needs at least 3 headlines`);
      if (ag.descriptions.length < 2) throw new Error(`AdGroup "${ag.name}" needs at least 2 descriptions`);
    }

    console.log(`[SEARCH-CAMPAIGN] Creating "${params.name}" with ${params.adGroups.length} ad groups for user ${user.id}`);

    // ─────────────────────────────────────────────
    // 1) Budget (non-atomic, needed as dependency)
    // ─────────────────────────────────────────────
    const budgetAmountMicros = Math.round(params.dailyBudget * 1_000_000);

    const budgetRes = await mutateResource(accessToken, customerId, "campaignBudgets", [{
      create: {
        name: `${params.name} - Budget`,
        amountMicros: String(budgetAmountMicros),
        deliveryMethod: "STANDARD",
        explicitlyShared: false,
      },
    }], managerCustomerId);

    const budgetResourceName = budgetRes.results?.[0]?.resourceName;
    if (!budgetResourceName) throw new Error("Failed to create budget");
    console.log("[SEARCH-CAMPAIGN] Budget created:", budgetResourceName);

    // ─────────────────────────────────────────────
    // 2) Build atomic operations
    // ─────────────────────────────────────────────
    let tempId = -1;
    const nextId = () => tempId--;
    const ops: unknown[] = [];

    const campaignTempId = nextId();

    // Campaign payload
    const campaignPayload: Record<string, unknown> = {
      resourceName: `customers/${customerId}/campaigns/${campaignTempId}`,
      name: params.name,
      status: "PAUSED",
      advertisingChannelType: "SEARCH",
      campaignBudget: budgetResourceName,
    };

    // Bidding strategy
    switch (params.biddingStrategy) {
      case "manual_cpc":
        campaignPayload.manualCpc = {};
        break;
      case "maximize_clicks":
        campaignPayload.maximizeClicks = {};
        break;
      case "maximize_conversions":
        campaignPayload.maximizeConversions = {};
        break;
      case "target_cpa":
        campaignPayload.maximizeConversions = {
          targetCpaMicros: String(params.targetCpaMicros || 0),
        };
        break;
    }

    ops.push({ campaignOperation: { create: campaignPayload } });

    // ─────────────────────────────────────────────
    // 3) Extensions: Sitelinks
    // ─────────────────────────────────────────────
    if (params.sitelinks?.length) {
      for (const sl of params.sitelinks) {
        const slTempId = nextId();
        ops.push({
          assetOperation: {
            create: {
              resourceName: `customers/${customerId}/assets/${slTempId}`,
              name: cut(sl.linkText, 25),
              sitelinkAsset: {
                linkText: cut(sl.linkText, 25),
                ...(sl.description1 ? { description1: cut(sl.description1, 35) } : {}),
                ...(sl.description2 ? { description2: cut(sl.description2, 35) } : {}),
              },
              finalUrls: sl.finalUrls,
            },
          },
        });
        ops.push({
          campaignAssetOperation: {
            create: {
              campaign: `customers/${customerId}/campaigns/${campaignTempId}`,
              asset: `customers/${customerId}/assets/${slTempId}`,
              fieldType: "SITELINK",
            },
          },
        });
      }
    }

    // ─────────────────────────────────────────────
    // 4) Extensions: Callouts
    // ─────────────────────────────────────────────
    if (params.callouts?.length) {
      for (const co of params.callouts) {
        const text = cut(co.trim(), 25);
        if (!text) continue;
        const coTempId = nextId();
        ops.push({
          assetOperation: {
            create: {
              resourceName: `customers/${customerId}/assets/${coTempId}`,
              name: text,
              calloutAsset: { calloutText: text },
            },
          },
        });
        ops.push({
          campaignAssetOperation: {
            create: {
              campaign: `customers/${customerId}/campaigns/${campaignTempId}`,
              asset: `customers/${customerId}/assets/${coTempId}`,
              fieldType: "CALLOUT",
            },
          },
        });
      }
    }

    // ─────────────────────────────────────────────
    // 5) Ad Groups + Keywords + RSA Ads
    // ─────────────────────────────────────────────
    for (const ag of params.adGroups) {
      const agTempId = nextId();

      ops.push({
        adGroupOperation: {
          create: {
            resourceName: `customers/${customerId}/adGroups/${agTempId}`,
            name: cut(ag.name, 128),
            campaign: `customers/${customerId}/campaigns/${campaignTempId}`,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
            ...(ag.cpcBidMicros ? { cpcBidMicros: String(ag.cpcBidMicros) } : {}),
          },
        },
      });

      // Keywords
      for (const kw of ag.keywords) {
        const kwTempId = nextId();
        ops.push({
          adGroupCriterionOperation: {
            create: {
              resourceName: `customers/${customerId}/adGroupCriteria/${kwTempId}`,
              adGroup: `customers/${customerId}/adGroups/${agTempId}`,
              status: "ENABLED",
              keyword: {
                text: kw.text,
                matchType: kw.matchType,
              },
            },
          },
        });
      }

      // RSA Ad
      ops.push({
        adGroupAdOperation: {
          create: {
            adGroup: `customers/${customerId}/adGroups/${agTempId}`,
            status: "PAUSED",
            ad: {
              finalUrls: [ag.finalUrl],
              responsiveSearchAd: {
                headlines: ag.headlines.slice(0, 15).map(h => ({ text: cut(h, 30) })),
                descriptions: ag.descriptions.slice(0, 4).map(d => ({ text: cut(d, 90) })),
                ...(ag.path1 ? { path1: cut(ag.path1, 15) } : {}),
                ...(ag.path2 ? { path2: cut(ag.path2, 15) } : {}),
              },
            },
          },
        },
      });
    }

    console.log(`[SEARCH-CAMPAIGN] Sending ${ops.length} atomic operations...`);

    // ─────────────────────────────────────────────
    // 6) Atomic mutate
    // ─────────────────────────────────────────────
    const atomicRes = await atomicMutate(accessToken, customerId, ops, managerCustomerId);

    const mutateResults = (atomicRes.mutateOperationResponses || []) as Record<string, unknown>[];
    const campaignResult = mutateResults.find((r) => (r as Record<string, unknown>).campaignResult) as Record<string, unknown> | undefined;
    const campaignResourceName = (campaignResult?.campaignResult as Record<string, unknown>)?.resourceName as string | undefined;

    if (!campaignResourceName) throw new Error("Failed to create Search campaign");

    const campaignId = campaignResourceName.split("/").pop();
    console.log("[SEARCH-CAMPAIGN] Campaign created:", campaignResourceName);

    // ─────────────────────────────────────────────
    // 7) Location targeting (post-atomic)
    // ─────────────────────────────────────────────
    if (params.locations?.length) {
      const locationOps = params.locations
        .map(loc => GEO_MAP[loc.toUpperCase()])
        .filter(Boolean)
        .map(geoId => ({
          create: {
            campaign: campaignResourceName,
            location: {
              geoTargetConstant: `geoTargetConstants/${geoId}`,
            },
          },
        }));

      if (locationOps.length) {
        try {
          await mutateResource(accessToken, customerId, "campaignCriteria", locationOps, managerCustomerId);
          console.log("[SEARCH-CAMPAIGN] Location targeting set:", params.locations);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          warnings.push(`Location targeting skipped: ${msg}`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 8) Language targeting (post-atomic)
    // ─────────────────────────────────────────────
    if (params.language) {
      const langId = LANG_MAP[params.language.toLowerCase()];
      if (langId) {
        try {
          await mutateResource(accessToken, customerId, "campaignCriteria", [{
            create: {
              campaign: campaignResourceName,
              language: {
                languageConstant: `languageConstants/${langId}`,
              },
            },
          }], managerCustomerId);
          console.log("[SEARCH-CAMPAIGN] Language targeting set:", params.language);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          warnings.push(`Language targeting skipped: ${msg}`);
        }
      }
    }

    // ─────────────────────────────────────────────
    // 9) Sync to local DB
    // ─────────────────────────────────────────────
    try {
      await supabase.from("campaigns_sync").upsert({
        user_id: user.id,
        google_campaign_id: campaignId,
        google_customer_id: customerId,
        name: params.name,
        status: "PAUSED",
        advertising_channel_type: "SEARCH",
        bidding_strategy_type: params.biddingStrategy.toUpperCase(),
        budget_amount_micros: budgetAmountMicros,
        budget_resource_name: budgetResourceName,
        last_synced_at: new Date().toISOString(),
        sync_status: "synced",
      }, { onConflict: "user_id,google_campaign_id" });
    } catch (dbErr) {
      console.warn("[SEARCH-CAMPAIGN] DB sync warning:", dbErr);
    }

    // Log action
    await supabase.from("ads_actions").insert({
      user_id: user.id,
      action_type: "create_search_campaign",
      target_name: params.name,
      target_id: campaignId,
      description: `Search campaign "${params.name}" created with ${params.adGroups.length} ad group(s), ${params.adGroups.reduce((sum, ag) => sum + ag.keywords.length, 0)} keywords, budget €${params.dailyBudget}/day`,
      status: "executed",
    });

    return new Response(JSON.stringify({
      success: true,
      campaignResourceName,
      campaignId,
      totalOperations: ops.length,
      adGroups: params.adGroups.length,
      totalKeywords: params.adGroups.reduce((sum, ag) => sum + ag.keywords.length, 0),
      sitelinks: params.sitelinks?.length || 0,
      callouts: params.callouts?.length || 0,
      warnings,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[SEARCH-CAMPAIGN] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
