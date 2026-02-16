import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v22";

const cut = (s: string, n: number): string => s.length > n ? s.slice(0, n) : s;

// ─── Helpers ─────────────────────────────────────────────

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
      body: JSON.stringify({ mutateOperations, partialFailure: false }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Atomic mutate failed: ${errorText}`);
  }
  return await response.json();
}

async function downloadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return base64Encode(new Uint8Array(buffer));
  } catch (e) {
    console.warn(`[PMAX] Failed to download image: ${url}`, e);
    return null;
  }
}

const GEO_MAP: Record<string, string> = {
  FR: "2250", BE: "2056", CH: "2756", DE: "2276", ES: "2724",
  IT: "2380", NL: "2528", US: "2840", GB: "2826", CA: "2124",
  PT: "2620", AT: "2040", LU: "2442", MA: "2504", TN: "2788",
};

const LANG_MAP: Record<string, string> = {
  fr: "1002", en: "1000", de: "1001", es: "1003",
  it: "1004", nl: "1010", pt: "1014",
};

// ─── Auth + Connection helper ────────────────────────────

async function getAuthAndConnection(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await anonClient.auth.getUser();
  if (userError || !user) throw new Error("Unauthorized");

  const { data: connection } = await supabase
    .from("user_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("connection_type", "google_ads")
    .eq("status", "connected")
    .maybeSingle();

  if (!connection?.access_token || !connection.account_id) {
    throw new Error("Google Ads not connected");
  }

  let accessToken = connection.access_token as string;
  if (connection.token_expires_at && new Date(connection.token_expires_at as string) < new Date()) {
    const newToken = await refreshAccessToken(connection.refresh_token || "");
    if (!newToken) throw new Error("Token refresh failed");
    accessToken = newToken;
    await supabase.from("user_connections").update({
      access_token: newToken,
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
    }).eq("id", connection.id);
  }

  const customerId = (connection.account_id as string).replace(/-/g, "");
  const metadata = connection.metadata as Record<string, unknown> || {};
  const managerCustomerId = (metadata.manager_customer_id as string || "").replace(/-/g, "") || undefined;

  return { supabase, user, accessToken, customerId, managerCustomerId };
}

// ─── CREATE PMax (Full Google Ads Structure) ─────────────

interface SitelinkInput {
  text: string;
  description1?: string;
  description2?: string;
  finalUrl: string;
}

interface LeadFormInput {
  headline?: string;
  description?: string;
  fields?: string[];
  privacyPolicyUrl?: string;
  businessName?: string;
}

interface PmaxParams {
  name: string;
  dailyBudget: number;
  brandName?: string;
  finalUrl: string;
  searchThemes: string[];
  headlines: string[];
  longHeadlines?: string[];
  descriptions: string[];
  imageUrls?: string[];
  businessLogoUrl?: string;
  locations?: string[];
  language?: string;
  biddingStrategy: "maximize_conversions" | "target_cpa";
  targetCpaMicros?: number;
  sitelinks?: SitelinkInput[];
  callouts?: string[];
  callToAction?: string;
  leadForm?: LeadFormInput;
  displayPath1?: string;
  displayPath2?: string;
  negativeKeywords?: string[];
}

async function createPmaxFull(
  accessToken: string,
  customerId: string,
  params: PmaxParams,
  managerCustomerId?: string
) {
  const warnings: string[] = [];

  // 1) Budget
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

  // 2) Build atomic ops
  let tempId = -1;
  const next = () => tempId--;
  const ops: unknown[] = [];

  // ── Campaign ──
  const campaignTempId = next();
  const campaignPayload: Record<string, unknown> = {
    resourceName: `customers/${customerId}/campaigns/${campaignTempId}`,
    name: params.name,
    status: "PAUSED",
    advertisingChannelType: "PERFORMANCE_MAX",
    campaignBudget: budgetResourceName,
    containsEuPoliticalAdvertising: false,
  };

  if (params.biddingStrategy === "target_cpa") {
    campaignPayload.maximizeConversions = {
      targetCpaMicros: String(params.targetCpaMicros || 0),
    };
  } else {
    campaignPayload.maximizeConversions = {};
  }

  ops.push({ campaignOperation: { create: campaignPayload } });

  // ── Asset Group ──
  const agTempId = next();
  ops.push({
    assetGroupOperation: {
      create: {
        resourceName: `customers/${customerId}/assetGroups/${agTempId}`,
        name: `${params.name} - Asset Group`,
        campaign: `customers/${customerId}/campaigns/${campaignTempId}`,
        finalUrls: [params.finalUrl],
      },
    },
  });

  // Helper to add text asset + link to asset group
  const addTextAsset = (text: string, fieldType: string, maxLen: number) => {
    const id = next();
    ops.push({
      assetOperation: {
        create: {
          resourceName: `customers/${customerId}/assets/${id}`,
          textAsset: { text: cut(text.trim(), maxLen) },
        },
      },
    });
    ops.push({
      assetGroupAssetOperation: {
        create: {
          assetGroup: `customers/${customerId}/assetGroups/${agTempId}`,
          asset: `customers/${customerId}/assets/${id}`,
          fieldType,
        },
      },
    });
  };

  // ── Headlines (max 15, 30 chars) ──
  for (const h of (params.headlines || []).slice(0, 15)) {
    if (h.trim()) addTextAsset(h, "HEADLINE", 30);
  }

  // ── Long Headlines (max 5, 90 chars) ──
  for (const lh of (params.longHeadlines || []).slice(0, 5)) {
    if (lh.trim()) addTextAsset(lh, "LONG_HEADLINE", 90);
  }

  // ── Descriptions (max 5, 90 chars) ──
  for (const d of (params.descriptions || []).slice(0, 5)) {
    if (d.trim()) addTextAsset(d, "DESCRIPTION", 90);
  }

  // ── Business Name ──
  if (params.brandName) {
    addTextAsset(params.brandName, "BUSINESS_NAME", 25);
  }

  // ── Search Themes (max 25) ──
  for (const theme of (params.searchThemes || []).slice(0, 25)) {
    if (theme.trim()) {
      ops.push({
        assetGroupSignalOperation: {
          create: {
            assetGroup: `customers/${customerId}/assetGroups/${agTempId}`,
            searchTheme: { text: cut(theme.trim(), 80) },
          },
        },
      });
    }
  }

  console.log(`[PMAX] ${ops.length} atomic ops prepared (text+campaign). Downloading images...`);

  // ── Images (download and convert to base64) ──
  const imageUrls = (params.imageUrls || []).filter(u => u.trim());
  let imagesAdded = 0;
  for (const imgUrl of imageUrls.slice(0, 20)) {
    const b64 = await downloadImageAsBase64(imgUrl.trim());
    if (!b64) {
      warnings.push(`Image download failed: ${imgUrl}`);
      continue;
    }
    const id = next();
    ops.push({
      assetOperation: {
        create: {
          resourceName: `customers/${customerId}/assets/${id}`,
          imageAsset: { data: b64 },
          name: `PMax Image ${Math.abs(id)}`,
        },
      },
    });
    ops.push({
      assetGroupAssetOperation: {
        create: {
          assetGroup: `customers/${customerId}/assetGroups/${agTempId}`,
          asset: `customers/${customerId}/assets/${id}`,
          fieldType: "MARKETING_IMAGE",
        },
      },
    });
    imagesAdded++;
  }

  // ── Logo ──
  if (params.businessLogoUrl?.trim()) {
    const logoB64 = await downloadImageAsBase64(params.businessLogoUrl.trim());
    if (logoB64) {
      const id = next();
      ops.push({
        assetOperation: {
          create: {
            resourceName: `customers/${customerId}/assets/${id}`,
            imageAsset: { data: logoB64 },
            name: `PMax Logo`,
          },
        },
      });
      ops.push({
        assetGroupAssetOperation: {
          create: {
            assetGroup: `customers/${customerId}/assetGroups/${agTempId}`,
            asset: `customers/${customerId}/assets/${id}`,
            fieldType: "LOGO",
          },
        },
      });
    } else {
      warnings.push("Logo download failed");
    }
  }

  console.log(`[PMAX] Total ${ops.length} atomic ops (incl ${imagesAdded} images). Sending...`);

  // ── Atomic Mutate (core campaign + asset group + assets) ──
  const atomicRes = await atomicMutate(accessToken, customerId, ops, managerCustomerId);
  const mutateResults = (atomicRes.mutateOperationResponses || []) as Record<string, unknown>[];
  const campaignResult = mutateResults.find(r => (r as Record<string, unknown>).campaignResult) as Record<string, unknown> | undefined;
  const campaignResourceName = (campaignResult?.campaignResult as Record<string, unknown>)?.resourceName as string | undefined;

  if (!campaignResourceName) throw new Error("Failed to create PMax campaign");
  const campaignId = campaignResourceName.split("/").pop();

  // ══════════════════════════════════════════════════════════
  // POST-ATOMIC: Extensions & targeting (separate API calls)
  // ══════════════════════════════════════════════════════════

  // ── Sitelinks (campaign-level assets) ──
  if (params.sitelinks?.length) {
    for (const sl of params.sitelinks.slice(0, 6)) {
      if (!sl.text?.trim() || !sl.finalUrl?.trim()) continue;
      try {
        // Create sitelink asset
        const sitelinkAssetPayload: Record<string, unknown> = {
          sitelinkAsset: {
            linkText: cut(sl.text.trim(), 25),
            finalUrls: [sl.finalUrl.trim()],
          },
        };
        if (sl.description1?.trim()) {
          (sitelinkAssetPayload.sitelinkAsset as Record<string, unknown>).description1 = cut(sl.description1.trim(), 35);
        }
        if (sl.description2?.trim()) {
          (sitelinkAssetPayload.sitelinkAsset as Record<string, unknown>).description2 = cut(sl.description2.trim(), 35);
        }

        const assetRes = await mutateResource(accessToken, customerId, "assets", [{
          create: sitelinkAssetPayload,
        }], managerCustomerId);

        const sitelinkResourceName = assetRes.results?.[0]?.resourceName;
        if (sitelinkResourceName) {
          // Link to campaign
          await mutateResource(accessToken, customerId, "campaignAssets", [{
            create: {
              campaign: campaignResourceName,
              asset: sitelinkResourceName,
              fieldType: "SITELINK",
            },
          }], managerCustomerId);
        }
      } catch (e: unknown) {
        warnings.push(`Sitelink "${sl.text}" skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Callouts (campaign-level) ──
  if (params.callouts?.length) {
    for (const callout of params.callouts.slice(0, 10)) {
      if (!callout.trim()) continue;
      try {
        const assetRes = await mutateResource(accessToken, customerId, "assets", [{
          create: {
            calloutAsset: { calloutText: cut(callout.trim(), 25) },
          },
        }], managerCustomerId);

        const calloutResourceName = assetRes.results?.[0]?.resourceName;
        if (calloutResourceName) {
          await mutateResource(accessToken, customerId, "campaignAssets", [{
            create: {
              campaign: campaignResourceName,
              asset: calloutResourceName,
              fieldType: "CALLOUT",
            },
          }], managerCustomerId);
        }
      } catch (e: unknown) {
        warnings.push(`Callout skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Lead Form (campaign-level) ──
  if (params.leadForm?.headline?.trim()) {
    try {
      const leadFormPayload: Record<string, unknown> = {
        headline: cut(params.leadForm.headline.trim(), 30),
        description: cut(params.leadForm.description?.trim() || "Fill out the form", 200),
        privacyPolicyUrl: params.leadForm.privacyPolicyUrl || params.finalUrl,
        businessName: params.leadForm.businessName || params.brandName || params.name,
        callToActionType: params.callToAction || "LEARN_MORE",
      };

      // Map field names to Google Ads field types
      const fieldMap: Record<string, string> = {
        FULL_NAME: "FULL_NAME",
        EMAIL: "EMAIL",
        PHONE_NUMBER: "PHONE_NUMBER",
        COMPANY_NAME: "COMPANY_NAME",
        CITY: "CITY",
        POSTAL_CODE: "POSTAL_CODE",
        WORK_EMAIL: "WORK_EMAIL",
        WORK_PHONE: "WORK_PHONE",
      };

      const fields = (params.leadForm.fields || ["FULL_NAME", "EMAIL"])
        .map(f => fieldMap[f.trim().toUpperCase()])
        .filter(Boolean)
        .map(inputType => ({ inputType }));

      if (fields.length > 0) {
        leadFormPayload.fields = fields;
      }

      const assetRes = await mutateResource(accessToken, customerId, "assets", [{
        create: { leadFormAsset: leadFormPayload },
      }], managerCustomerId);

      const leadFormResourceName = assetRes.results?.[0]?.resourceName;
      if (leadFormResourceName) {
        await mutateResource(accessToken, customerId, "campaignAssets", [{
          create: {
            campaign: campaignResourceName,
            asset: leadFormResourceName,
            fieldType: "LEAD_FORM",
          },
        }], managerCustomerId);
      }
    } catch (e: unknown) {
      warnings.push(`Lead form skipped: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ── Location targeting ──
  if (params.locations?.length) {
    const locationOps = params.locations
      .map(loc => GEO_MAP[loc.toUpperCase()])
      .filter(Boolean)
      .map(geoId => ({
        create: {
          campaign: campaignResourceName,
          location: { geoTargetConstant: `geoTargetConstants/${geoId}` },
        },
      }));

    if (locationOps.length) {
      try {
        await mutateResource(accessToken, customerId, "campaignCriteria", locationOps, managerCustomerId);
      } catch (e: unknown) {
        warnings.push(`Location targeting skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Language targeting ──
  if (params.language) {
    const langId = LANG_MAP[params.language.toLowerCase()];
    if (langId) {
      try {
        await mutateResource(accessToken, customerId, "campaignCriteria", [{
          create: {
            campaign: campaignResourceName,
            language: { languageConstant: `languageConstants/${langId}` },
          },
        }], managerCustomerId);
      } catch (e: unknown) {
        warnings.push(`Language targeting skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // ── Campaign-level negative keywords ──
  if (params.negativeKeywords?.length) {
    const negKwOps = params.negativeKeywords
      .filter(kw => kw.trim())
      .slice(0, 50)
      .map(kw => ({
        create: {
          campaign: campaignResourceName,
          negative: true,
          keyword: {
            text: kw.trim(),
            matchType: "BROAD",
          },
        },
      }));

    if (negKwOps.length) {
      try {
        await mutateResource(accessToken, customerId, "campaignCriteria", negKwOps, managerCustomerId);
      } catch (e: unknown) {
        warnings.push(`Negative keywords skipped: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  return {
    campaignResourceName,
    campaignId,
    budgetResourceName,
    totalOperations: ops.length,
    imagesAdded,
    searchThemes: params.searchThemes?.length || 0,
    headlines: params.headlines?.length || 0,
    descriptions: params.descriptions?.length || 0,
    sitelinks: params.sitelinks?.length || 0,
    callouts: params.callouts?.length || 0,
    hasLeadForm: !!params.leadForm?.headline,
    hasLogo: !!params.businessLogoUrl,
    warnings,
  };
}

// ─── UPDATE Budget ───────────────────────────────────────

async function updateBudget(
  accessToken: string,
  customerId: string,
  budgetResourceName: string,
  newDailyBudget: number,
  managerCustomerId?: string
) {
  return mutateResource(accessToken, customerId, "campaignBudgets", [{
    update: {
      resourceName: budgetResourceName,
      amountMicros: String(Math.round(newDailyBudget * 1_000_000)),
    },
    updateMask: "amount_micros",
  }], managerCustomerId);
}

// ─── UPDATE CPA Target ──────────────────────────────────

async function updateCPA(
  accessToken: string,
  customerId: string,
  campaignResourceName: string,
  targetCpaMicros: number,
  managerCustomerId?: string
) {
  return mutateResource(accessToken, customerId, "campaigns", [{
    update: {
      resourceName: campaignResourceName,
      maximizeConversions: {
        targetCpaMicros: String(targetCpaMicros),
      },
    },
    updateMask: "maximize_conversions.target_cpa_micros",
  }], managerCustomerId);
}

// ─── SET Campaign Status ─────────────────────────────────

async function setCampaignStatus(
  accessToken: string,
  customerId: string,
  campaignResourceName: string,
  status: "PAUSED" | "ENABLED",
  managerCustomerId?: string
) {
  return mutateResource(accessToken, customerId, "campaigns", [{
    update: {
      resourceName: campaignResourceName,
      status,
    },
    updateMask: "status",
  }], managerCustomerId);
}

// ─── Main Handler ────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { supabase, user, accessToken, customerId, managerCustomerId } = await getAuthAndConnection(req);
    const body = await req.json();
    const action = body.action as string;

    if (!action) throw new Error("action is required (create, update_budget, update_cpa, set_status)");

    let result: unknown;

    switch (action) {
      // ─── CREATE PMax ──────────────────────────
      case "create": {
        const createResult = await createPmaxFull(accessToken, customerId, body, managerCustomerId);

        // Sync to local DB
        try {
          await supabase.from("campaigns_sync").upsert({
            user_id: user.id,
            google_campaign_id: createResult.campaignId,
            google_customer_id: customerId,
            name: body.name,
            status: "PAUSED",
            advertising_channel_type: "PERFORMANCE_MAX",
            bidding_strategy_type: (body.biddingStrategy || "maximize_conversions").toUpperCase(),
            budget_amount_micros: Math.round(body.dailyBudget * 1_000_000),
            budget_resource_name: createResult.budgetResourceName,
            last_synced_at: new Date().toISOString(),
            sync_status: "synced",
          }, { onConflict: "user_id,google_campaign_id" });
        } catch (e) {
          console.warn("[PMAX] DB sync warning:", e);
        }

        const desc = [
          `PMax "${body.name}" created`,
          `${createResult.headlines} headlines`,
          `${createResult.descriptions} descriptions`,
          `${createResult.searchThemes} search themes`,
          `${createResult.imagesAdded} images`,
          `${createResult.sitelinks} sitelinks`,
          `${createResult.callouts} callouts`,
          createResult.hasLeadForm ? "lead form" : "",
          createResult.hasLogo ? "logo" : "",
          `budget €${body.dailyBudget}/day`,
        ].filter(Boolean).join(", ");

        await supabase.from("ads_actions").insert({
          user_id: user.id,
          action_type: "create_pmax_service",
          target_name: body.name,
          target_id: createResult.campaignId,
          description: desc,
          status: "executed",
        });

        result = { success: true, ...createResult };
        break;
      }

      // ─── UPDATE Budget ─────────────────────────
      case "update_budget": {
        if (!body.budgetResourceName || !body.newDailyBudget) {
          throw new Error("budgetResourceName and newDailyBudget are required");
        }
        await updateBudget(accessToken, customerId, body.budgetResourceName, body.newDailyBudget, managerCustomerId);

        await supabase.from("ads_actions").insert({
          user_id: user.id,
          action_type: "update_pmax_budget",
          target_name: body.campaignName || "PMax",
          description: `Budget updated to €${body.newDailyBudget}/day`,
          status: "executed",
        });

        result = { success: true, message: `Budget updated to €${body.newDailyBudget}/day` };
        break;
      }

      // ─── UPDATE CPA Target ─────────────────────
      case "update_cpa": {
        if (!body.campaignResourceName || !body.targetCpaMicros) {
          throw new Error("campaignResourceName and targetCpaMicros are required");
        }
        await updateCPA(accessToken, customerId, body.campaignResourceName, body.targetCpaMicros, managerCustomerId);

        const cpaEuros = (body.targetCpaMicros / 1_000_000).toFixed(2);
        await supabase.from("ads_actions").insert({
          user_id: user.id,
          action_type: "update_pmax_cpa",
          target_name: body.campaignName || "PMax",
          description: `Target CPA updated to €${cpaEuros}`,
          status: "executed",
        });

        result = { success: true, message: `CPA target updated to €${cpaEuros}` };
        break;
      }

      // ─── SET Status ────────────────────────────
      case "set_status": {
        if (!body.campaignResourceName || !body.status) {
          throw new Error("campaignResourceName and status (PAUSED|ENABLED) are required");
        }
        await setCampaignStatus(accessToken, customerId, body.campaignResourceName, body.status, managerCustomerId);

        await supabase.from("ads_actions").insert({
          user_id: user.id,
          action_type: "set_pmax_status",
          target_name: body.campaignName || "PMax",
          description: `Campaign status set to ${body.status}`,
          status: "executed",
        });

        // Update local sync
        if (body.googleCampaignId) {
          await supabase.from("campaigns_sync")
            .update({ status: body.status })
            .eq("user_id", user.id)
            .eq("google_campaign_id", body.googleCampaignId);
        }

        result = { success: true, message: `Campaign status set to ${body.status}` };
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}. Use: create, update_budget, update_cpa, set_status`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[PMAX] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "Unauthorized" || message === "Google Ads not connected" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
