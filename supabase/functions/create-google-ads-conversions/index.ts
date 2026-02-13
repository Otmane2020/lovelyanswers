import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API_BASE = "https://googleads.googleapis.com/v22";

const CONVERSIONS_TO_CREATE = [
  {
    name: "Sign Up",
    category: "SIGNUP",
    type: "WEBPAGE",
    countingType: "ONE_PER_CLICK",
    defaultValue: 5.0,
    currencyCode: "USD",
    status: "ENABLED",
    tag: "signup",
  },
  {
    name: "Onboarding Complete",
    category: "LEAD",
    type: "WEBPAGE",
    countingType: "ONE_PER_CLICK",
    defaultValue: 10.0,
    currencyCode: "USD",
    status: "ENABLED",
    tag: "onboarding",
  },
  {
    name: "Begin Checkout",
    category: "BEGIN_CHECKOUT",
    type: "WEBPAGE",
    countingType: "ONE_PER_CLICK",
    defaultValue: 29.0,
    currencyCode: "USD",
    status: "ENABLED",
    tag: "checkout",
  },
  {
    name: "Purchase",
    category: "PURCHASE",
    type: "WEBPAGE",
    countingType: "ONE_PER_CLICK",
    defaultValue: 49.0,
    currencyCode: "USD",
    status: "ENABLED",
    tag: "purchase",
  },
  {
    name: "Pricing Page View",
    category: "PAGE_VIEW",
    type: "WEBPAGE",
    countingType: "ONE_PER_CLICK",
    defaultValue: 1.0,
    currencyCode: "USD",
    status: "ENABLED",
    tag: "pricing_view",
  },
];

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: GOOGLE_CLIENT_SECRET || "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Get Google Ads connection
    const { data: connection } = await supabase
      .from("user_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("connection_type", "google_ads")
      .eq("status", "connected")
      .maybeSingle();

    if (!connection?.access_token || !connection.account_id) {
      return new Response(JSON.stringify({ error: "Google Ads not connected or no account selected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.access_token as string;
    if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
      const newToken = await refreshAccessToken(connection.refresh_token || "");
      if (!newToken) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = newToken;
    }

    const customerId = connection.account_id as string;
    const metadata = connection.metadata as Record<string, unknown> || {};
    const managerCustomerId = metadata.manager_customer_id as string | undefined;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
      "Content-Type": "application/json",
    };
    if (managerCustomerId && managerCustomerId !== customerId) {
      headers["login-customer-id"] = managerCustomerId;
    }

    // First, list existing conversion actions to avoid duplicates
    const listQuery = `SELECT conversion_action.name, conversion_action.id, conversion_action.tag_snippets FROM conversion_action`;
    const listResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
      { method: "POST", headers, body: JSON.stringify({ query: listQuery }) }
    );

    const existingConversions: Record<string, { id: string; tagSnippets?: unknown[] }> = {};
    if (listResponse.ok) {
      const listData = await listResponse.json();
      for (const row of (listData.results || [])) {
        const ca = row.conversionAction;
        if (ca?.name) {
          existingConversions[ca.name] = { id: ca.id, tagSnippets: ca.tagSnippets };
        }
      }
    }

    const results: { name: string; tag: string; status: string; conversionLabel?: string; error?: string }[] = [];

    for (const conv of CONVERSIONS_TO_CREATE) {
      // Skip if already exists
      if (existingConversions[conv.name]) {
        console.log(`[CONV] "${conv.name}" already exists, skipping`);
        
        // Try to get the conversion label from tag snippets
        const existing = existingConversions[conv.name];
        let label = "";
        
        // Query for tag snippets specifically
        const snippetQuery = `SELECT conversion_action.tag_snippets, conversion_action.id FROM conversion_action WHERE conversion_action.name = '${conv.name}'`;
        const snippetRes = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
          { method: "POST", headers, body: JSON.stringify({ query: snippetQuery }) }
        );
        if (snippetRes.ok) {
          const snippetData = await snippetRes.json();
          const snippets = snippetData.results?.[0]?.conversionAction?.tagSnippets;
          if (snippets && Array.isArray(snippets)) {
            for (const snippet of snippets) {
              if (snippet.type === "EVENT_SNIPPET" && snippet.eventSnippet) {
                const match = snippet.eventSnippet.match(/send_to.*?'(AW-[^']+)'/);
                if (match) label = match[1];
              }
            }
          }
        }
        
        results.push({ 
          name: conv.name, 
          tag: conv.tag, 
          status: "already_exists",
          conversionLabel: label || `AW-${customerId}/${existing.id}`,
        });
        continue;
      }

      // Create the conversion action
      const createBody = {
        operations: [{
          create: {
            name: conv.name,
            category: conv.category,
            type: conv.type,
            countingType: conv.countingType,
            status: conv.status,
            valueSettings: {
              defaultValue: conv.defaultValue,
              defaultCurrencyCode: conv.currencyCode,
              alwaysUseDefaultValue: false,
            },
          },
        }],
      };

      console.log(`[CONV] Creating "${conv.name}"...`);
      const createResponse = await fetch(
        `${GOOGLE_ADS_API_BASE}/customers/${customerId}/conversionActions:mutate`,
        { method: "POST", headers, body: JSON.stringify(createBody) }
      );

      if (!createResponse.ok) {
        const errText = await createResponse.text();
        console.error(`[CONV] Failed to create "${conv.name}":`, errText);
        results.push({ name: conv.name, tag: conv.tag, status: "error", error: errText });
        continue;
      }

      const createData = await createResponse.json();
      const resourceName = createData.results?.[0]?.resourceName || "";
      // Extract ID from resource name: "customers/123/conversionActions/456" → "456"
      const convId = resourceName.split("/").pop() || "";

      // Now fetch the tag snippet for this new conversion
      let conversionLabel = "";
      const tagQuery = `SELECT conversion_action.tag_snippets FROM conversion_action WHERE conversion_action.resource_name = '${resourceName}'`;
      const tagRes = await fetch(
        `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
        { method: "POST", headers, body: JSON.stringify({ query: tagQuery }) }
      );
      if (tagRes.ok) {
        const tagData = await tagRes.json();
        const snippets = tagData.results?.[0]?.conversionAction?.tagSnippets;
        if (snippets && Array.isArray(snippets)) {
          for (const snippet of snippets) {
            if (snippet.type === "EVENT_SNIPPET" && snippet.eventSnippet) {
              const match = snippet.eventSnippet.match(/send_to.*?'(AW-[^']+)'/);
              if (match) conversionLabel = match[1];
            }
          }
        }
      }

      results.push({
        name: conv.name,
        tag: conv.tag,
        status: "created",
        conversionLabel: conversionLabel || `AW-${customerId}/${convId}`,
      });
      console.log(`[CONV] Created "${conv.name}" → ${conversionLabel || convId}`);
    }

    return new Response(JSON.stringify({ success: true, conversions: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("[CONV] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
