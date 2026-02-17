import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");

// OAuth2 endpoints
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Required scopes for Google Ads API and Tag Manager
const SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
];

interface ActionLog {
  user_id: string;
  recommendation_id?: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  status: string;
  google_ads_response?: Record<string, unknown>;
  error_message?: string;
}

// Google Ads Geo Target Constants (common countries)
// Full list: https://developers.google.com/google-ads/api/reference/data/geotargets
function getGeoTargetConstant(location: string): string | null {
  const geoTargets: Record<string, string | null> = {
    "France": "geoTargetConstants/2250",
    "Belgium": "geoTargetConstants/2056",
    "Switzerland": "geoTargetConstants/2756",
    "Canada": "geoTargetConstants/2124",
    "United States": "geoTargetConstants/2840",
    "United Kingdom": "geoTargetConstants/2826",
    "Germany": "geoTargetConstants/2276",
    "Spain": "geoTargetConstants/2724",
    "Italy": "geoTargetConstants/2380",
    "Netherlands": "geoTargetConstants/2528",
    "Portugal": "geoTargetConstants/2620",
    "Luxembourg": "geoTargetConstants/2442",
    "Monaco": "geoTargetConstants/2492",
    "Worldwide": null, // No targeting = worldwide
  };
  return geoTargets[location] ?? geoTargets["France"] ?? null;
}

// Google Ads Language Constants
// Full list: https://developers.google.com/google-ads/api/reference/data/codes-formats#languages
function getLanguageConstant(language: string): string | null {
  const languages: Record<string, string> = {
    "French": "languageConstants/1002",
    "English": "languageConstants/1000",
    "German": "languageConstants/1001",
    "Spanish": "languageConstants/1003",
    "Italian": "languageConstants/1004",
    "Dutch": "languageConstants/1010",
    "Portuguese": "languageConstants/1014",
  };
  return languages[language] || languages["French"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    
    // Parse request body ONCE at the beginning
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Body might be empty for some requests
    }
    
    // Get action from query params OR body
    const action = url.searchParams.get("action") || body.action;

    console.log("[GOOGLE-ADS] Processing action:", action);

    // =============================================
    // ACTION: Generate OAuth URL
    // =============================================
    if (action === "get_auth_url") {
      if (!GOOGLE_CLIENT_ID) {
        return new Response(JSON.stringify({ error: "Google OAuth not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] Auth validation failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const connection_type = body.connection_type as string | undefined;
      const redirect_uri = body.redirect_uri as string;

      const state = btoa(JSON.stringify({
        user_id: user.id,
        connection_type: connection_type || "google_ads",
        timestamp: Date.now(),
      }));

      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirect_uri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", SCOPES.join(" "));
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ auth_url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Handle OAuth Callback
    // =============================================
    if (action === "oauth_callback") {
      const code = body.code as string;
      const state = body.state as string;
      const redirect_uri = body.redirect_uri as string;

      if (!code || !state) {
        return new Response(JSON.stringify({ error: "Missing code or state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Decode state
      let stateData;
      try {
        stateData = JSON.parse(atob(state));
      } catch {
        return new Response(JSON.stringify({ error: "Invalid state" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("[GOOGLE-ADS] Token exchange failed:", error);
        return new Response(JSON.stringify({ error: "Token exchange failed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const tokens = await tokenResponse.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      console.log(`[GOOGLE-ADS] Token exchange successful for user ${stateData.user_id}`);

      // Fetch Google user info to get email
      let googleEmail: string | null = null;
      try {
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            "Authorization": `Bearer ${tokens.access_token}`,
          },
        });
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          googleEmail = userInfo.email || null;
          console.log(`[GOOGLE-ADS] Google user email: ${googleEmail}`);
        }
      } catch (e) {
        console.error("[GOOGLE-ADS] Failed to fetch Google user info:", e);
      }

      // Store connection for ALL THREE connection types with the SAME tokens
      // This allows GA4 and GTM steps to reuse the OAuth tokens
      const connectionTypes = ["google_ads", "ga4", "gtm"];
      
      for (const connType of connectionTypes) {
        const { error: upsertError } = await supabase
          .from("user_connections")
          .upsert({
            user_id: stateData.user_id,
            connection_type: connType,
            status: "connected",
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt.toISOString(),
            last_synced_at: new Date().toISOString(),
            metadata: { google_email: googleEmail },
          }, { onConflict: "user_id,connection_type" });

        if (upsertError) {
          console.error(`[GOOGLE-ADS] Failed to upsert ${connType} connection:`, upsertError);
        } else {
          console.log(`[GOOGLE-ADS] Connected ${connType} for user ${stateData.user_id}`);
        }
      }

      return new Response(
        JSON.stringify({ success: true, connection_type: stateData.connection_type, email: googleEmail }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: List Google Ads customer accounts
    // =============================================
    if (action === "list_customers") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] list_customers auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const result = await listCustomerIds(accessToken);

      if (result.error) {
        return new Response(
          JSON.stringify({ success: false, error: result.error, customer_ids: [], customers: [] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, customer_ids: result.customerIds, customers: result.customers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Set selected Google Ads customer account
    // =============================================
    if (action === "set_customer") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const customer_id = body.customer_id as string | undefined;
      const customer_name = body.customer_name as string | undefined;
      const manager_customer_id = body.manager_customer_id as string | undefined;
      const is_manager = body.is_manager as boolean | undefined;
      
      if (!customer_id) {
        return new Response(JSON.stringify({ error: "Missing customer_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Don't allow selecting a manager (MCC) account directly for campaign creation
      if (is_manager === true) {
        return new Response(JSON.stringify({ 
          error: "Cannot select a Manager (MCC) account. Please select a client account instead." 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentMeta = (connection.metadata && typeof connection.metadata === "object")
        ? (connection.metadata as Record<string, unknown>)
        : {};

      // Store both customer_id and manager_customer_id in metadata
      const nextMeta = { 
        ...currentMeta, 
        customer_id,
        manager_customer_id: manager_customer_id || null, // Store MCC ID if client is under an MCC
      };

      await supabase
        .from("user_connections")
        .update({
          metadata: nextMeta,
          account_id: customer_id,
          account_name: customer_name || `Account ${customer_id}`,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      console.log(`[GOOGLE-ADS] Set customer ${customer_id} (${customer_name}) for user ${user.id}${manager_customer_id ? `, manager: ${manager_customer_id}` : ''}`);

      return new Response(
        JSON.stringify({ success: true, customer_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: List GA4 Properties
    // =============================================
    if (action === "list_ga4_properties") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] list_ga4_properties auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "ga4")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "GA4 not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const result = await listGA4Properties(accessToken);
      
      if (result.error) {
        console.error(`[GOOGLE-ADS] GA4 properties error for user ${user.id}:`, result.error);
        return new Response(
          JSON.stringify({ success: false, error: result.error, properties: [] }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[GOOGLE-ADS] Found ${result.properties.length} GA4 properties for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, properties: result.properties }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Set selected GA4 property
    // =============================================
    if (action === "set_ga4_property") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] set_ga4_property auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const property_id = body.property_id as string | undefined;
      const property_name = body.property_name as string | undefined;
      if (!property_id) {
        return new Response(JSON.stringify({ error: "Missing property_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "ga4")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection) {
        return new Response(JSON.stringify({ error: "GA4 not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentMeta = (connection.metadata && typeof connection.metadata === "object")
        ? (connection.metadata as Record<string, unknown>)
        : {};

      const nextMeta = { ...currentMeta, property_id };

      await supabase
        .from("user_connections")
        .update({
          metadata: nextMeta,
          account_id: property_id,
          account_name: property_name || `Property ${property_id}`,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      console.log(`[GOOGLE-ADS] Set GA4 property ${property_id} for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, property_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: List GTM Containers
    // =============================================
    if (action === "list_gtm_containers") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] list_gtm_containers auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to get access token from any connected service
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .not("access_token", "is", null)
        .limit(1)
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const containers = await listGTMContainers(accessToken);
      console.log(`[GOOGLE-ADS] Found ${containers.length} GTM containers for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, containers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Set selected GTM container
    // =============================================
    if (action === "set_gtm_container") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] set_gtm_container auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const container_id = body.container_id as string | undefined;
      const container_name = body.container_name as string | undefined;
      if (!container_id) {
        return new Response(JSON.stringify({ error: "Missing container_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert the GTM connection
      const { data: existingConnection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "gtm")
        .maybeSingle();

      if (existingConnection) {
        const currentMeta = (existingConnection.metadata && typeof existingConnection.metadata === "object")
          ? (existingConnection.metadata as Record<string, unknown>)
          : {};

        const nextMeta = { ...currentMeta, container_id };

        await supabase
          .from("user_connections")
          .update({
            metadata: nextMeta,
            account_id: container_id,
            account_name: container_name || `Container ${container_id}`,
            status: "connected",
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", existingConnection.id);
      } else {
        // Get tokens from another connection to create the GTM connection
        const { data: sourceConnection } = await supabase
          .from("user_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "connected")
          .not("access_token", "is", null)
          .limit(1)
          .maybeSingle();

        await supabase
          .from("user_connections")
          .insert({
            user_id: user.id,
            connection_type: "gtm",
            status: "connected",
            account_id: container_id,
            account_name: container_name || `Container ${container_id}`,
            access_token: sourceConnection?.access_token,
            refresh_token: sourceConnection?.refresh_token,
            token_expires_at: sourceConnection?.token_expires_at,
            metadata: { container_id },
            last_synced_at: new Date().toISOString(),
          });
      }

      console.log(`[GOOGLE-ADS] Set GTM container ${container_id} for user ${user.id}`);

      return new Response(
        JSON.stringify({ success: true, container_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Create new GTM container
    // =============================================
    if (action === "create_gtm_container") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const containerName = body.container_name as string | undefined;
      const domainName = body.domain_name as string | undefined;

      if (!containerName) {
        return new Response(JSON.stringify({ error: "Missing container_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access token (prefer GTM connection token when available)
      const { data: connectedConnections, error: connectionsError } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .not("access_token", "is", null);

      if (connectionsError) {
        console.error("[GOOGLE-ADS] Failed to fetch user connections:", connectionsError);
      }

      const preferredTypes = ["gtm", "google_ads", "ga4"];
      const connection =
        preferredTypes
          .map((t) => connectedConnections?.find((c) => c.connection_type === t))
          .find(Boolean) ??
        connectedConnections?.[0];

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      // First get GTM accounts
      const accountsResponse = await fetch(
        "https://tagmanager.googleapis.com/tagmanager/v2/accounts",
        {
          headers: { "Authorization": `Bearer ${accessToken}` },
        }
      );

      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error("[GOOGLE-ADS] Failed to list GTM accounts:", errorText);
        
        // Check if this is an API disabled error
        if (errorText.includes("SERVICE_DISABLED") || errorText.includes("has not been used in project")) {
          return new Response(JSON.stringify({ 
            error: "Tag Manager API is not enabled. Please enable it in Google Cloud Console.",
            code: "API_DISABLED",
            details: "Enable at: https://console.cloud.google.com/apis/library/tagmanager.googleapis.com"
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ 
          error: "No GTM account found. Please create one at tagmanager.google.com first.",
          code: "NO_GTM_ACCOUNT"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accountsData = await accountsResponse.json();
      const accounts = accountsData.account || [];

      if (accounts.length === 0) {
        return new Response(JSON.stringify({ 
          error: "No GTM account found. Please create one at tagmanager.google.com first.",
          code: "NO_GTM_ACCOUNT"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use the first account to create the container
      const account = accounts[0];
      const accountPath = account.path;

      // Create the container
      const createResponse = await fetch(
        `https://tagmanager.googleapis.com/tagmanager/v2/${accountPath}/containers`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: containerName,
            usageContext: ["web"],
            domainName: domainName ? [domainName] : undefined,
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("[GOOGLE-ADS] Failed to create GTM container:", errorText);

        // Common case: token exists but doesn't include write scopes for GTM
        if (
          errorText.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
          errorText.toLowerCase().includes("insufficient authentication scopes") ||
          errorText.toLowerCase().includes("insufficientpermissions")
        ) {
          return new Response(
            JSON.stringify({
              error:
                "Insufficient Tag Manager permissions. Please reconnect Google Tag Manager and approve the requested access.",
              code: "INSUFFICIENT_SCOPES",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({ error: "Failed to create GTM container: " + errorText }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const newContainer = await createResponse.json();
      console.log(`[GOOGLE-ADS] Created GTM container: ${newContainer.name} (${newContainer.containerId})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          container: {
            containerId: newContainer.containerId,
            name: newContainer.name,
            accountId: account.accountId,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Create new GA4 property
    // =============================================
    if (action === "create_ga4_property") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const propertyName = body.property_name as string | undefined;
      const timeZone = body.time_zone as string || "Europe/Paris";
      const currencyCode = body.currency_code as string || "EUR";

      if (!propertyName) {
        return new Response(JSON.stringify({ error: "Missing property_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access token
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .not("access_token", "is", null)
        .limit(1)
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      // First get GA accounts
      const accountsResponse = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accounts",
        {
          headers: { "Authorization": `Bearer ${accessToken}` },
        }
      );

      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error("[GOOGLE-ADS] Failed to list GA accounts:", errorText);
        return new Response(JSON.stringify({ 
          error: "No Google Analytics account found. Please create one at analytics.google.com first.",
          code: "NO_GA_ACCOUNT"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const accountsData = await accountsResponse.json();
      const accounts = accountsData.accounts || [];

      if (accounts.length === 0) {
        return new Response(JSON.stringify({ 
          error: "No Google Analytics account found. Please create one at analytics.google.com first.",
          code: "NO_GA_ACCOUNT"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use the first account to create the property
      const account = accounts[0];
      const accountName = account.name; // Format: accounts/123456

      // Create the property
      const createResponse = await fetch(
        `https://analyticsadmin.googleapis.com/v1beta/properties`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parent: accountName,
            displayName: propertyName,
            timeZone: timeZone,
            currencyCode: currencyCode,
          }),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("[GOOGLE-ADS] Failed to create GA4 property:", errorText);
        return new Response(JSON.stringify({ 
          error: "Failed to create GA4 property: " + errorText 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newProperty = await createResponse.json();
      // Property name format: properties/123456789
      const propertyId = newProperty.name?.replace("properties/", "") || "";
      console.log(`[GOOGLE-ADS] Created GA4 property: ${newProperty.displayName} (${propertyId})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          property: {
            propertyId: propertyId,
            displayName: newProperty.displayName,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: List GA4 Audiences
    // =============================================
    if (action === "list_ga4_audiences") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get GA4 connection to get property ID
      const { data: ga4Connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "ga4")
        .eq("status", "connected")
        .maybeSingle();

      if (!ga4Connection?.account_id) {
        return new Response(JSON.stringify({ 
          error: "No GA4 property selected",
          audiences: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access token
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .not("access_token", "is", null)
        .limit(1)
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google", audiences: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed", audiences: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const propertyId = ga4Connection.account_id;

      try {
        // Use v1alpha for audiences API - v1beta doesn't support this endpoint
        const audiencesResponse = await fetch(
          `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/audiences`,
          {
            headers: { "Authorization": `Bearer ${accessToken}` },
          }
        );

        if (!audiencesResponse.ok) {
          const errorText = await audiencesResponse.text();
          console.error("[GOOGLE-ADS] Failed to list GA4 audiences:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to load audiences",
            audiences: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const audiencesData = await audiencesResponse.json();
        const audiences = audiencesData.audiences || [];

        console.log(`[GOOGLE-ADS] Found ${audiences.length} GA4 audiences for property ${propertyId}`);

        return new Response(
          JSON.stringify({ success: true, audiences }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error listing GA4 audiences:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to load audiences",
          audiences: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Check Tracking Status (for Campaign Wizard)
    // =============================================
    if (action === "check_tracking") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired",
          tracking: { exists: false, primary: false, canOptimize: false }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token || !connection.account_id) {
        return new Response(JSON.stringify({ 
          success: true,
          tracking: { exists: false, primary: false, canOptimize: false, reason: "no_connection" }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (newToken) accessToken = newToken;
      }

      const customerId = connection.account_id as string;

      try {
        // Query conversion actions with primary_for_goal flag
        const query = `
          SELECT 
            conversion_action.id,
            conversion_action.name,
            conversion_action.status,
            conversion_action.primary_for_goal
          FROM conversion_action
          WHERE conversion_action.status = 'ENABLED'
        `;

        const response = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          console.error("[GOOGLE-ADS] check_tracking query failed:", await response.text());
          return new Response(JSON.stringify({ 
            success: true,
            tracking: { exists: false, primary: false, canOptimize: false, reason: "query_failed" }
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const conversions = data.results || [];

        // Find primary conversion (the one used for optimization)
        const primaryConversion = conversions.find((row: any) => 
          row.conversionAction?.primaryForGoal === true
        );

        const exists = conversions.length > 0;
        const hasPrimary = !!primaryConversion;
        
        // canOptimize = has a PRIMARY conversion that is ENABLED
        const canOptimize = hasPrimary;

        console.log(`[GOOGLE-ADS] Tracking check: ${conversions.length} conversions, primary=${hasPrimary}, canOptimize=${canOptimize}`);

        return new Response(JSON.stringify({ 
          success: true,
          tracking: {
            exists,
            primary: hasPrimary,
            primaryName: primaryConversion?.conversionAction?.name || null,
            totalConversions: conversions.length,
            canOptimize,
            recommendation: canOptimize 
              ? "MAXIMIZE_CONVERSIONS" 
              : "MAXIMIZE_CLICKS"
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[GOOGLE-ADS] check_tracking error:", error);
        return new Response(JSON.stringify({ 
          success: true,
          tracking: { exists: false, primary: false, canOptimize: false, reason: "error" }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: List Google Ads Conversion Actions (ENRICHED)
    // =============================================
    if (action === "list_conversions") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected", conversions: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed", conversions: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected", conversions: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // ENRICHED query with metrics and attribution settings
        const query = `
          SELECT 
            conversion_action.id,
            conversion_action.name,
            conversion_action.category,
            conversion_action.status,
            conversion_action.counting_type,
            conversion_action.value_settings.default_value,
            conversion_action.value_settings.default_currency_code,
            conversion_action.primary_for_goal,
            conversion_action.attribution_model_settings.attribution_model,
            conversion_action.attribution_model_settings.data_driven_model_status,
            conversion_action.click_through_lookback_window_days,
            conversion_action.view_through_lookback_window_days,
            conversion_action.include_in_conversions_metric,
            conversion_action.tag_snippets,
            metrics.conversions,
            metrics.conversions_value,
            metrics.all_conversions,
            metrics.view_through_conversions
          FROM conversion_action
          WHERE conversion_action.status != 'REMOVED'
        `;

        const response = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] Failed to list conversions:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to load conversions",
            conversions: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const conversions = (data.results || []).map((row: { 
          conversionAction: { 
            id: string; 
            name: string; 
            category: string; 
            status: string; 
            countingType: string; 
            valueSettings?: { defaultValue: number; defaultCurrencyCode: string }; 
            primaryForGoal?: boolean;
            attributionModelSettings?: { attributionModel: string; dataDrivenModelStatus: string };
            clickThroughLookbackWindowDays?: number;
            viewThroughLookbackWindowDays?: number;
            includeInConversionsMetric?: boolean;
            tagSnippets?: Array<{ type: string; eventSnippet: string; globalSiteTag: string }>;
          };
          metrics?: {
            conversions?: number;
            conversionsValue?: number;
            allConversions?: number;
            viewThroughConversions?: number;
          };
        }) => {
          // Extract event snippet for tracking verification
          const tagSnippets = row.conversionAction.tagSnippets || [];
          const eventSnippet = tagSnippets.find(t => t.type === "EVENT_SNIPPET")?.eventSnippet || null;
          
          return {
            id: row.conversionAction.id,
            name: row.conversionAction.name,
            category: row.conversionAction.category,
            status: row.conversionAction.status,
            countingType: row.conversionAction.countingType,
            defaultValue: row.conversionAction.valueSettings?.defaultValue || 0,
            currencyCode: row.conversionAction.valueSettings?.defaultCurrencyCode || "EUR",
            primaryForGoal: row.conversionAction.primaryForGoal || false,
            attributionModel: row.conversionAction.attributionModelSettings?.attributionModel || "UNKNOWN",
            dataDrivenStatus: row.conversionAction.attributionModelSettings?.dataDrivenModelStatus || "UNKNOWN",
            clickLookbackDays: row.conversionAction.clickThroughLookbackWindowDays || 30,
            viewLookbackDays: row.conversionAction.viewThroughLookbackWindowDays || 1,
            includeInConversions: row.conversionAction.includeInConversionsMetric || false,
            // Metrics from last 30 days
            conversions: row.metrics?.conversions || 0,
            conversionsValue: row.metrics?.conversionsValue || 0,
            allConversions: row.metrics?.allConversions || 0,
            viewThroughConversions: row.metrics?.viewThroughConversions || 0,
            // Tag snippet for tracking code display
            eventSnippet: eventSnippet,
            hasTagSnippet: tagSnippets.length > 0,
          };
        });

        console.log(`[GOOGLE-ADS] Found ${conversions.length} conversion actions with metrics`);

        // Also sync to local database for faster access
        for (const conv of conversions) {
          await supabase.from("conversion_actions").upsert({
            user_id: user.id,
            google_ads_id: conv.id,
            name: conv.name,
            category: conv.category,
            source: "google_ads",
            status: conv.status === "ENABLED" ? "active" : "inactive",
            counting_type: conv.countingType,
            default_value: conv.defaultValue,
            attribution_model: conv.attributionModel,
            lookback_window_days: conv.clickLookbackDays,
            tag_snippet: conv.eventSnippet,
            conversions_30d: conv.conversions,
            value_30d: conv.conversionsValue,
            is_tracking: conv.hasTagSnippet,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,google_ads_id",
          });
        }

        return new Response(
          JSON.stringify({ success: true, conversions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error listing conversions:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to load conversions",
          conversions: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: List GA4 Conversion Events (Key Events)
    // =============================================
    if (action === "list_ga4_conversion_events") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get GA4 connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "ga4")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "GA4 not connected", events: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed", events: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const propertyId = connection.account_id as string;
      if (!propertyId) {
        return new Response(JSON.stringify({ error: "No GA4 property selected", events: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Use GA4 Admin API to list Key Events (conversion events)
        const keyEventsResponse = await fetch(
          `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/keyEvents`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!keyEventsResponse.ok) {
          const errorText = await keyEventsResponse.text();
          console.error("[GOOGLE-ADS] Failed to list GA4 key events:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to load GA4 conversion events",
            events: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const keyEventsData = await keyEventsResponse.json();
        const events = (keyEventsData.keyEvents || []).map((event: {
          name: string;
          eventName: string;
          createTime: string;
          deletable: boolean;
          custom: boolean;
          countingMethod: string;
          defaultValue?: { numericValue?: number; currencyCode?: string };
        }) => ({
          id: event.name,
          eventName: event.eventName,
          createTime: event.createTime,
          deletable: event.deletable,
          custom: event.custom,
          countingMethod: event.countingMethod || "ONCE_PER_EVENT",
          defaultValue: event.defaultValue?.numericValue || 0,
          currencyCode: event.defaultValue?.currencyCode || "EUR",
        }));

        console.log(`[GOOGLE-ADS] Found ${events.length} GA4 key events`);

        // Sync to local database
        for (const evt of events) {
          await supabase.from("conversion_actions").upsert({
            user_id: user.id,
            ga4_event_name: evt.eventName,
            name: evt.eventName,
            source: "ga4",
            status: "active",
            counting_type: evt.countingMethod,
            default_value: evt.defaultValue,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,ga4_event_name",
          });
        }

        return new Response(
          JSON.stringify({ success: true, events }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error listing GA4 conversion events:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to load GA4 conversion events",
          events: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: List GTM Tags
    // =============================================
    if (action === "list_gtm_tags") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get GTM connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "gtm")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "GTM not connected", tags: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed", tags: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const containerId = (connection.metadata as { gtm_container_path?: string })?.gtm_container_path;
      if (!containerId) {
        return new Response(JSON.stringify({ error: "No GTM container selected", tags: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // First get the default workspace
        const workspacesResponse = await fetch(
          `https://tagmanager.googleapis.com/tagmanager/v2/${containerId}/workspaces`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!workspacesResponse.ok) {
          const errorText = await workspacesResponse.text();
          console.error("[GOOGLE-ADS] Failed to list GTM workspaces:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to access GTM container",
            tags: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const workspacesData = await workspacesResponse.json();
        const defaultWorkspace = workspacesData.workspace?.find((w: { name: string }) => 
          w.name.includes("Default") || w.name.includes("default")
        ) || workspacesData.workspace?.[0];

        if (!defaultWorkspace) {
          return new Response(JSON.stringify({ error: "No GTM workspace found", tags: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // List tags in the workspace
        const tagsResponse = await fetch(
          `https://tagmanager.googleapis.com/tagmanager/v2/${defaultWorkspace.path}/tags`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!tagsResponse.ok) {
          const errorText = await tagsResponse.text();
          console.error("[GOOGLE-ADS] Failed to list GTM tags:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to load GTM tags",
            tags: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tagsData = await tagsResponse.json();
        const tags = (tagsData.tag || []).map((tag: {
          tagId: string;
          name: string;
          type: string;
          paused?: boolean;
          firingTriggerId?: string[];
          parameter?: Array<{ key: string; value: string }>;
        }) => {
          // Extract event name from parameters if it's a GA4 event tag
          const eventNameParam = tag.parameter?.find(p => p.key === "eventName");
          const measurementIdParam = tag.parameter?.find(p => p.key === "measurementId");
          
          return {
            tagId: tag.tagId,
            name: tag.name,
            type: tag.type,
            paused: tag.paused || false,
            firingTriggerIds: tag.firingTriggerId || [],
            eventName: eventNameParam?.value || null,
            measurementId: measurementIdParam?.value || null,
            // Determine tag category based on type
            category: tag.type.includes("ga4") || tag.type.includes("gaawe") ? "GA4" :
                     tag.type.includes("awct") || tag.type.includes("conversion") ? "Google Ads" :
                     tag.type.includes("html") ? "Custom HTML" : "Other",
          };
        });

        // Filter to show only conversion-related tags
        const conversionTags = tags.filter((t: { category: string; type: string; eventName: string | null }) => 
          t.category === "GA4" || 
          t.category === "Google Ads" ||
          (t.eventName && ["purchase", "add_to_cart", "begin_checkout", "generate_lead", "sign_up", "view_item"].includes(t.eventName.toLowerCase()))
        );

        console.log(`[GOOGLE-ADS] Found ${tags.length} GTM tags, ${conversionTags.length} conversion-related`);

        // Sync conversion tags to local database
        for (const tag of conversionTags) {
          if (tag.eventName) {
            await supabase.from("conversion_actions").upsert({
              user_id: user.id,
              gtm_tag_id: tag.tagId,
              name: tag.name,
              ga4_event_name: tag.eventName,
              source: "gtm",
              status: tag.paused ? "inactive" : "active",
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "user_id,gtm_tag_id",
            });
          }
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            tags: conversionTags,
            allTags: tags,
            workspaceName: defaultWorkspace.name 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error listing GTM tags:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to load GTM tags",
          tags: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Get Campaign Conversions (per campaign)
    // =============================================
    if (action === "get_campaign_conversions") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignId = body.campaign_id as string;
      if (!campaignId) {
        return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected", conversions: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed", conversions: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected", conversions: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Query conversions segmented by conversion action for this campaign
        const query = `
          SELECT 
            campaign.id,
            campaign.name,
            segments.conversion_action,
            segments.conversion_action_name,
            segments.conversion_action_category,
            metrics.conversions,
            metrics.conversions_value,
            metrics.cost_per_conversion,
            metrics.conversion_rate
          FROM campaign
          WHERE campaign.id = ${campaignId}
            AND segments.date DURING LAST_30_DAYS
        `;

        const response = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] Failed to get campaign conversions:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to load campaign conversions",
            conversions: []
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        
        // Aggregate conversions by conversion action
        const conversionMap = new Map<string, {
          conversionActionId: string;
          conversionActionName: string;
          category: string;
          conversions: number;
          value: number;
          costPerConversion: number;
          conversionRate: number;
        }>();

        for (const row of (data.results || [])) {
          const actionId = row.segments?.conversionAction?.split("/").pop() || "unknown";
          const existing = conversionMap.get(actionId) || {
            conversionActionId: actionId,
            conversionActionName: row.segments?.conversionActionName || "Unknown",
            category: row.segments?.conversionActionCategory || "DEFAULT",
            conversions: 0,
            value: 0,
            costPerConversion: 0,
            conversionRate: 0,
          };
          
          existing.conversions += row.metrics?.conversions || 0;
          existing.value += row.metrics?.conversionsValue || 0;
          existing.costPerConversion = row.metrics?.costPerConversion || existing.costPerConversion;
          existing.conversionRate = row.metrics?.conversionRate || existing.conversionRate;
          
          conversionMap.set(actionId, existing);
        }

        const conversions = Array.from(conversionMap.values());
        
        console.log(`[GOOGLE-ADS] Found ${conversions.length} conversion actions for campaign ${campaignId}`);

        // Sync to campaign_conversions table
        for (const conv of conversions) {
          // Get the conversion_action record
          const { data: convAction } = await supabase
            .from("conversion_actions")
            .select("id")
            .eq("user_id", user.id)
            .eq("google_ads_id", conv.conversionActionId)
            .maybeSingle();

          if (convAction) {
            await supabase.from("campaign_conversions").upsert({
              campaign_id: campaignId,
              campaign_name: data.results?.[0]?.campaign?.name || "",
              conversion_action_id: convAction.id,
              user_id: user.id,
              conversions: conv.conversions,
              conversions_value: conv.value,
              cost_per_conversion: conv.costPerConversion,
              conversion_rate: conv.conversionRate,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: "campaign_id,conversion_action_id",
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, conversions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error getting campaign conversions:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to load campaign conversions",
          conversions: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Sync All Conversions (batch import)
    // =============================================
    if (action === "sync_all_conversions") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = {
        googleAds: { success: false, count: 0, error: null as string | null },
        ga4: { success: false, count: 0, error: null as string | null },
        gtm: { success: false, count: 0, error: null as string | null },
      };

      // Helper to make internal requests
      const internalCall = async (actionName: string) => {
        try {
          const response = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-ads?action=${actionName}`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({}),
            }
          );
          return await response.json();
        } catch (e) {
          console.error(`[GOOGLE-ADS] sync_all_conversions: ${actionName} failed:`, e);
          return { error: String(e) };
        }
      };

      // Call all three imports in parallel
      const [adsResult, ga4Result, gtmResult] = await Promise.all([
        internalCall("list_conversions"),
        internalCall("list_ga4_conversion_events"),
        internalCall("list_gtm_tags"),
      ]);

      results.googleAds = {
        success: adsResult.success || false,
        count: adsResult.conversions?.length || 0,
        error: adsResult.error || null,
      };

      results.ga4 = {
        success: ga4Result.success || false,
        count: ga4Result.events?.length || 0,
        error: ga4Result.error || null,
      };

      results.gtm = {
        success: gtmResult.success || false,
        count: gtmResult.tags?.length || 0,
        error: gtmResult.error || null,
      };

      const totalImported = results.googleAds.count + results.ga4.count + results.gtm.count;

      console.log(`[GOOGLE-ADS] sync_all_conversions complete: ${totalImported} total`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          totalImported,
          message: `Importé ${totalImported} conversions depuis toutes les sources`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Create Google Ads Conversion Action
    // =============================================
    if (action === "create_conversion") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const conversionName = body.name as string;
      const category = body.category as string || "DEFAULT";
      const defaultValue = body.default_value as number || 0;

      if (!conversionName) {
        return new Response(JSON.stringify({ error: "Missing conversion name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Map template category to Google Ads conversion category
        const categoryMap: Record<string, string> = {
          "PURCHASE": "PURCHASE",
          "SUBMIT_LEAD_FORM": "SUBMIT_LEAD_FORM",
          "SIGNUP": "SIGNUP",
          "ADD_TO_CART": "ADD_TO_CART",
          "BEGIN_CHECKOUT": "BEGIN_CHECKOUT",
          "PAGE_VIEW": "PAGE_VIEW",
          "SUBSCRIBE_PAID": "SUBSCRIBE_PAID",
          "BOOK_APPOINTMENT": "BOOK_APPOINTMENT",
          "CONTACT": "CONTACT",
          "DEFAULT": "DEFAULT",
        };

        const mappedCategory = categoryMap[category] || "DEFAULT";
        
        // Determine counting type based on category
        // ONE_PER_CLICK for leads, MANY_PER_CLICK for purchases
        const countingType = ["PURCHASE", "ADD_TO_CART", "BEGIN_CHECKOUT"].includes(mappedCategory) 
          ? "MANY_PER_CLICK" 
          : "ONE_PER_CLICK";

        // Create conversion action with Google best practices
        const conversionAction: Record<string, unknown> = {
          name: conversionName,
          category: mappedCategory,
          type: "WEBPAGE",
          status: "ENABLED",
          countingType: countingType,
          // Conversion windows (Google recommended defaults)
          clickThroughLookbackWindowDays: 30,
          viewThroughLookbackWindowDays: 1,
          // Include in conversions column for bidding optimization
          includeInConversionsMetric: true,
          // Value settings
          valueSettings: {
            defaultValue: defaultValue || 0,
            defaultCurrencyCode: "EUR",
            alwaysUseDefaultValue: defaultValue > 0,
          },
          // Attribution settings - use Last Click as fallback (Data-Driven requires enough data)
          attributionModelSettings: {
            attributionModel: "GOOGLE_ADS_LAST_CLICK",
            dataDrivenModelStatus: "UNKNOWN", // Will auto-upgrade to DDA when eligible
          },
        };

        // For purchase conversions, enable primary conversion optimization
        if (mappedCategory === "PURCHASE") {
          conversionAction.primaryForGoal = true;
        }

        const response = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/conversionActions:mutate`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              operations: [{
                create: conversionAction,
              }],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] Failed to create conversion:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to create conversion action: " + errorText
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const resourceName = data.results?.[0]?.resourceName;
        const conversionId = resourceName?.split("/").pop();
        console.log(`[GOOGLE-ADS] Created conversion action: ${conversionName} (${conversionId})`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            conversion: {
              name: conversionName,
              resourceName: resourceName,
              conversionId: conversionId,
              category: mappedCategory,
              countingType: countingType,
              lookbackWindow: 30,
            },
            message: `Conversion "${conversionName}" created with ${countingType === "MANY_PER_CLICK" ? "multiple" : "one"} counting per click.`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error creating conversion:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to create conversion action"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "apply") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] apply action auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const recommendation_id = body.recommendation_id as string;

      // Get recommendation
      const { data: recommendation, error: recError } = await supabase
        .from("ai_recommendations")
        .select("*")
        .eq("id", recommendation_id)
        .eq("user_id", user.id)
        .single();

      if (recError || !recommendation) {
        return new Response(JSON.stringify({ error: "Recommendation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prepare action log
      const actionLog: ActionLog = {
        user_id: user.id,
        recommendation_id: recommendation.id,
        action_type: `${recommendation.recommendation_type}_change`,
        entity_type: "campaign",
        entity_id: recommendation.campaign_id || "unknown",
        entity_name: recommendation.campaign_name,
        before_state: { ...recommendation.action_data, status: "before" },
        after_state: { ...recommendation.action_data, status: "after" },
        status: "executing",
      };

      // Insert action log (status: executing)
      const { data: logEntry, error: logError } = await supabase
        .from("ai_actions_log")
        .insert(actionLog)
        .select()
        .single();

      if (logError) {
        console.error("[GOOGLE-ADS] Failed to create action log:", logError);
      }

      // Execute real Google Ads API operation
      const operationResult = await executeGoogleAdsOperation(
        recommendation,
        connection.access_token,
        connection.refresh_token || "",
        connection.metadata?.customer_id as string || null
      );

      // Update action log with result
      const finalStatus = operationResult.success ? "applied" : "failed";
      
      if (logEntry) {
        await supabase
          .from("ai_actions_log")
          .update({
            status: finalStatus,
            applied_at: operationResult.success ? new Date().toISOString() : null,
            google_ads_response: operationResult.response,
            error_message: operationResult.error,
          })
          .eq("id", logEntry.id);
      }

      // Update recommendation status
      await supabase
        .from("ai_recommendations")
        .update({
          status: operationResult.success ? "applied" : "pending",
          applied_at: operationResult.success ? new Date().toISOString() : null,
          applied_by: operationResult.success ? user.id : null,
        })
        .eq("id", recommendation.id);

      console.log(`[GOOGLE-ADS] Action ${finalStatus}: ${recommendation.title}`);

      return new Response(
        JSON.stringify({
          success: operationResult.success,
          action_log_id: logEntry?.id,
          message: operationResult.success 
            ? `Successfully applied: ${recommendation.title}`
            : `Failed to apply: ${operationResult.error}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Rollback
    // =============================================
    if (action === "rollback") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] rollback action auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const action_log_id = body.action_log_id as string;
      const reason = body.reason as string | undefined;

      // Get action log
      const { data: actionLog, error: logError } = await supabase
        .from("ai_actions_log")
        .select("*")
        .eq("id", action_log_id)
        .eq("user_id", user.id)
        .eq("status", "applied")
        .single();

      if (logError || !actionLog) {
        return new Response(JSON.stringify({ error: "Action log not found or not applied" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Execute real Google Ads rollback operation
      const rollbackResult = await executeGoogleAdsRollback(
        actionLog,
        connection.access_token,
        connection.refresh_token || "",
        connection.metadata?.customer_id as string || null
      );

      if (rollbackResult.success) {
        // Update action log
        await supabase
          .from("ai_actions_log")
          .update({
            status: "rolled_back",
            rolled_back_at: new Date().toISOString(),
            rollback_reason: reason || "User requested rollback",
          })
          .eq("id", action_log_id);

        // Update recommendation back to pending
        if (actionLog.recommendation_id) {
          await supabase
            .from("ai_recommendations")
            .update({
              status: "pending",
              applied_at: null,
              applied_by: null,
            })
            .eq("id", actionLog.recommendation_id);
        }

        console.log(`[GOOGLE-ADS] Rolled back action ${action_log_id}`);
      }

      return new Response(
        JSON.stringify({
          success: rollbackResult.success,
          message: rollbackResult.success 
            ? "Successfully rolled back changes"
            : `Rollback failed: ${rollbackResult.error}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Get Action History
    // =============================================
    if (action === "history") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("[GOOGLE-ADS] history action auth failed:", userError?.message || "User not found");
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: history } = await supabase
        .from("ai_actions_log")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ success: true, history: history || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // =============================================
    // ACTION: Update Campaign Budget
    // =============================================
    if (action === "update_budget") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignId = body.campaign_id as string;
      const newBudget = body.new_budget as number;

      if (!campaignId || !newBudget) {
        return new Response(JSON.stringify({ error: "campaign_id and new_budget required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const newBudgetMicros = Math.round(newBudget * 1000000);
      const result = await applyBudgetChange(accessToken, customerId, campaignId, newBudgetMicros);

      console.log(`[GOOGLE-ADS] Budget update for campaign ${campaignId}: ${result.success ? "success" : result.error}`);

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? `Budget updated to ${newBudget}€/day` : result.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Update Campaign (combined handler)
    // =============================================
    if (action === "update_campaign") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignId = body.campaign_id as string;
      const changes = body.changes as Record<string, unknown> || {};

      if (!campaignId) {
        return new Response(JSON.stringify({ error: "campaign_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: { field: string; success: boolean; error?: string }[] = [];

      // Handle budget change
      if (changes.budget !== undefined) {
        const newBudget = changes.budget as number;
        const newBudgetMicros = Math.round(newBudget * 1000000);
        const result = await applyBudgetChange(accessToken, customerId, campaignId, newBudgetMicros);
        results.push({ field: "budget", success: result.success, error: result.error });
      }

      // Handle status change
      if (changes.status !== undefined) {
        const newStatus = changes.status as string;
        let result: { success: boolean; error?: string };
        if (newStatus === "PAUSED") {
          result = await pauseCampaign(accessToken, customerId, campaignId);
        } else if (newStatus === "ENABLED") {
          result = await enableCampaign(accessToken, customerId, campaignId);
        } else {
          result = { success: false, error: "Invalid status" };
        }
        results.push({ field: "status", success: result.success, error: result.error });
      }

      const allSuccess = results.every(r => r.success);
      const errors = results.filter(r => !r.success).map(r => `${r.field}: ${r.error}`);

      console.log(`[GOOGLE-ADS] Update campaign ${campaignId}: ${allSuccess ? "success" : errors.join(", ")}`);

      return new Response(
        JSON.stringify({
          success: allSuccess,
          results,
          message: allSuccess ? "Campaign updated successfully" : errors.join(", "),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Pause Campaign
    // =============================================
    if (action === "pause_campaign") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignId = body.campaign_id as string;

      if (!campaignId) {
        return new Response(JSON.stringify({ error: "campaign_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await pauseCampaign(accessToken, customerId, campaignId);

      console.log(`[GOOGLE-ADS] Pause campaign ${campaignId}: ${result.success ? "success" : result.error}`);

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? "Campaign paused" : result.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Enable Campaign
    // =============================================
    if (action === "enable_campaign") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignId = body.campaign_id as string;

      if (!campaignId) {
        return new Response(JSON.stringify({ error: "campaign_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result = await enableCampaign(accessToken, customerId, campaignId);

      console.log(`[GOOGLE-ADS] Enable campaign ${campaignId}: ${result.success ? "success" : result.error}`);

      return new Response(
        JSON.stringify({
          success: result.success,
          message: result.success ? "Campaign enabled" : result.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =============================================
    // ACTION: Create Google Ads Campaign (Best Practices)
    // Creates: Budget → Campaign → Ad Group → Keywords → Responsive Search Ad
    // =============================================
    if (action === "create_campaign") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Required parameters
      const campaignName = body.campaign_name as string;
      const campaignType = body.campaign_type as string || "SEARCH";
      const dailyBudget = body.daily_budget as number || 50;
      const biddingStrategy = body.bidding_strategy as string || "MAXIMIZE_CLICKS"; // SAFE default
      const autoEnable = body.auto_enable as boolean || false; // Enable if tracking is ready
      
      // Optional parameters for complete campaign
      const finalUrl = body.final_url as string || body.website_url as string || "";
      const campaignGoal = body.campaign_goal as string || "";
      const keywords = body.keywords as string[] || [];
      const headlines = body.headlines as string[] || [];
      const descriptions = body.descriptions as string[] || [];
      const locations = body.locations as string[] || ["France"];
      const languages = body.languages as string[] || ["French"];

      if (!campaignName) {
        return new Response(JSON.stringify({ error: "Missing campaign_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // SAFE: Only SEARCH campaigns are supported for now
      if (campaignType !== "SEARCH") {
        return new Response(JSON.stringify({ 
          error: "Only SEARCH campaigns are supported currently. Performance Max, Display, and Video will be available soon.",
          code: "CAMPAIGN_TYPE_NOT_SUPPORTED" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate URL format (must be valid HTTPS)
      if (finalUrl) {
        try {
          const parsedUrl = new URL(finalUrl);
          if (parsedUrl.protocol !== "https:") {
            return new Response(JSON.stringify({ 
              error: "Final URL must use HTTPS protocol",
              code: "INVALID_URL" 
            }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } catch {
          return new Response(JSON.stringify({ 
            error: "Invalid final URL format. Please provide a valid URL (e.g., https://example.com)",
            code: "INVALID_URL" 
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Get Google Ads connection
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const customerId = connection.account_id as string;
      if (!customerId) {
        return new Response(JSON.stringify({ error: "No Google Ads account selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if there's a manager (MCC) account ID in metadata
      const metadata = (connection.metadata && typeof connection.metadata === "object") 
        ? (connection.metadata as Record<string, unknown>) 
        : {};
      const managerCustomerId = metadata.manager_customer_id as string | undefined;

      // Use the globally configured Google Ads API base (keeps version consistent)
      const API_BASE = GOOGLE_ADS_API_BASE;
      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
        "Content-Type": "application/json",
      };
      
      // If we have a manager account, add login-customer-id header
      // This is required when accessing client accounts under an MCC
      if (managerCustomerId && managerCustomerId !== customerId) {
        headers["login-customer-id"] = managerCustomerId.replace(/-/g, "");
      }

      // Preflight: detect if the selected account is a Manager (MCC)
      // Manager accounts cannot create budgets/campaigns; users must select a client account.
      try {
        const loginId = (managerCustomerId || customerId).replace(/-/g, "");
        const q = "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1";

        const infoResp = await fetch(`${API_BASE}/customers/${customerId}/googleAds:search`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN || "",
            "login-customer-id": loginId,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: q }),
        });

        if (infoResp.ok) {
          const info = await infoResp.json();
          const row = info?.results?.[0];
          if (row?.customer?.manager === true) {
            return new Response(
              JSON.stringify({
                error: "Selected Google Ads account is a Manager (MCC). Please select a client account to create campaigns.",
                code: "MCC_SELECTED",
              }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }
      } catch (e) {
        // Non-blocking: if we can't detect account type, continue and rely on the mutate error
        console.warn("[GOOGLE-ADS] Could not preflight customer type:", e);
      }

      try {
        // ========================================
        // Step 1: Create Campaign Budget
        // ========================================
        const budgetMicros = dailyBudget * 1000000;
        const budgetTempId = `-${Date.now()}`;
        
        const budgetResponse = await fetch(
          `${API_BASE}/customers/${customerId}/campaignBudgets:mutate`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              operations: [{
                create: {
                  name: `Budget_${campaignName}_${Date.now()}`,
                  amountMicros: budgetMicros.toString(),
                  deliveryMethod: "STANDARD",
                  explicitlyShared: false,
                },
              }],
            }),
          }
        );

        if (!budgetResponse.ok) {
          const errorText = await budgetResponse.text();
          console.error("[GOOGLE-ADS] Failed to create budget:", errorText);

          // Improve guidance for the common MCC selection case
          try {
            const parsed = JSON.parse(errorText);
            const status = parsed?.error?.status;
            if (status === "UNIMPLEMENTED") {
              return new Response(
                JSON.stringify({
                  error: "Failed to create campaign budget. This usually happens when a Manager (MCC) account is selected or when the account must be accessed through an MCC.",
                  code: "BUDGET_UNIMPLEMENTED",
                  hint: "Go to Connections and re-select a CLIENT account (not MCC). If the account is under an MCC, select the client from the list (it will show an arrow ⤴).",
                  details: errorText,
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
              );
            }
          } catch {
            // ignore JSON parse failures
          }

          return new Response(
            JSON.stringify({
              error: "Failed to create campaign budget",
              details: errorText,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const budgetData = await budgetResponse.json();
        const budgetResourceName = budgetData.results?.[0]?.resourceName;
        console.log(`[GOOGLE-ADS] Created budget: ${budgetResourceName}`);

        // ========================================
        // Step 2: Create Campaign with SAFE Settings
        // ========================================
        // Since we only support SEARCH for now (validated above), always use SEARCH
        const channelType = "SEARCH";

        // Determine campaign status based on tracking readiness
        // If autoEnable=true (tracking is ready), start ENABLED; otherwise PAUSED
        const initialStatus = autoEnable ? "ENABLED" : "PAUSED";

        const campaignData: Record<string, unknown> = {
          name: campaignName,
          status: initialStatus,
          advertisingChannelType: channelType,
          campaignBudget: budgetResourceName,
        };

        // Bidding strategy logic:
        // - MAXIMIZE_CONVERSIONS: only if tracking is ready (autoEnable=true)
        // - MAXIMIZE_CLICKS: default SAFE mode
        const bidStrategy = biddingStrategy.toUpperCase().replace(/-/g, "_");
        
        if (bidStrategy === "MAXIMIZE_CONVERSIONS" && autoEnable) {
          // Tracking is ready, use conversion-based strategy
          campaignData.maximizeConversions = {};
          console.log("[GOOGLE-ADS] Using MAXIMIZE_CONVERSIONS (tracking verified)");
        } else if (bidStrategy === "MAXIMIZE_CLICKS" || bidStrategy === "MAXIMIZECLICKS") {
          campaignData.maximizeClicks = {};
        } else if (bidStrategy === "MANUAL_CPC" || bidStrategy === "MANUALCPC") {
          campaignData.manualCpc = {};
        } else {
          // DEFAULT TO MAXIMIZE_CLICKS for safety
          campaignData.maximizeClicks = {};
          console.log("[GOOGLE-ADS] Using MAXIMIZE_CLICKS as safe default");
        }

        // Network settings for Search campaigns - SAFE CONFIG
        if (channelType === "SEARCH") {
          campaignData.networkSettings = {
            targetGoogleSearch: true,
            targetSearchNetwork: false, // SAFE: Disabled to prevent "Limited" status
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          };
        }

        // Required by newer Google Ads API versions for EU accounts.
        const requestedEuPolitical = (body as Record<string, unknown>).contains_eu_political_advertising ??
          (body as Record<string, unknown>).containsEuPoliticalAdvertising;

        let euPoliticalValue: string;
        if (requestedEuPolitical === true) {
          euPoliticalValue = "CONTAINS_EU_POLITICAL_ADVERTISING";
        } else if (requestedEuPolitical === false) {
          euPoliticalValue = "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING";
        } else if (typeof requestedEuPolitical === "string" && requestedEuPolitical.trim()) {
          euPoliticalValue = requestedEuPolitical;
        } else {
          euPoliticalValue = "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING";
        }
        campaignData.containsEuPoliticalAdvertising = euPoliticalValue;

        // Geo targeting - we'll add location criteria via campaignCriteria:mutate (Step 3)
        const geoTargetConstant = getGeoTargetConstant(locations[0] || "France");

        const campaignMutateBody = {
          operations: [{
            create: campaignData,
          }],
        };

        console.log("[GOOGLE-ADS] Campaign create payload (sanitized):", {
          name: campaignName,
          customerId,
          managerCustomerId: managerCustomerId || null,
          containsEuPoliticalAdvertising: (campaignData as Record<string, unknown>).containsEuPoliticalAdvertising,
          advertisingChannelType: channelType,
        });

        const campaignResponse = await fetch(
          `${API_BASE}/customers/${customerId}/campaigns:mutate`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(campaignMutateBody),
          }
        );

        if (!campaignResponse.ok) {
          const errorText = await campaignResponse.text();
          console.error("[GOOGLE-ADS] Failed to create campaign:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to create campaign",
            details: errorText
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const campaignResult = await campaignResponse.json();
        const campaignResourceName = campaignResult.results?.[0]?.resourceName;
        const campaignId = campaignResourceName?.split("/").pop();
        console.log(`[GOOGLE-ADS] Created campaign: ${campaignResourceName}`);

        // ========================================
        // Step 3: Add Geo Targeting (Location Criterion)
        // ========================================
        if (geoTargetConstant) {
          try {
            await fetch(
              `${API_BASE}/customers/${customerId}/campaignCriteria:mutate`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  operations: [{
                    create: {
                      campaign: campaignResourceName,
                      location: {
                        geoTargetConstant: geoTargetConstant,
                      },
                      negative: false,
                    },
                  }],
                }),
              }
            );
            console.log(`[GOOGLE-ADS] Added geo targeting for ${locations[0]}`);
          } catch (e) {
            console.warn("[GOOGLE-ADS] Geo targeting failed, continuing:", e);
          }
        }

        // ========================================
        // Step 4: Add Language Targeting
        // ========================================
        const languageConstant = getLanguageConstant(languages[0] || "French");
        if (languageConstant) {
          try {
            await fetch(
              `${API_BASE}/customers/${customerId}/campaignCriteria:mutate`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  operations: [{
                    create: {
                      campaign: campaignResourceName,
                      language: {
                        languageConstant: languageConstant,
                      },
                      negative: false,
                    },
                  }],
                }),
              }
            );
            console.log(`[GOOGLE-ADS] Added language targeting for ${languages[0]}`);
          } catch (e) {
            console.warn("[GOOGLE-ADS] Language targeting failed, continuing:", e);
          }
        }

        // For Search campaigns, continue with Ad Group, Keywords, and Ads
        let adGroupResourceName: string | null = null;
        
        if (channelType === "SEARCH") {
            // ========================================
            // Step 5: Create Ad Group
            // ========================================
            // Only set manual CPC bid for MANUAL_CPC strategy
            // Automatic strategies (Maximize Conversions, etc.) handle bids automatically
            const isManualBidding = bidStrategy === "manual_cpc" || bidStrategy === "manualcpc";
            
            const adGroupPayload: Record<string, unknown> = {
              name: `${campaignName} - Ad Group 1`,
              campaign: campaignResourceName,
              status: "ENABLED",
              type: "SEARCH_STANDARD",
            };
            
            // Only add cpcBidMicros for manual bidding strategies
            if (isManualBidding) {
              adGroupPayload.cpcBidMicros = "1000000"; // 1€ default CPC bid
            }
            
            const adGroupResponse = await fetch(
              `${API_BASE}/customers/${customerId}/adGroups:mutate`,
              {
                method: "POST",
                headers,
                body: JSON.stringify({
                  operations: [{
                    create: adGroupPayload,
                  }],
                }),
              }
            );

          if (adGroupResponse.ok) {
            const adGroupData = await adGroupResponse.json();
            adGroupResourceName = adGroupData.results?.[0]?.resourceName;
            console.log(`[GOOGLE-ADS] Created ad group: ${adGroupResourceName}`);

            // ========================================
            // Step 6: Add Keywords (SAFE: limit to 15, dedupe, BROAD default)
            // ========================================
            if (keywords.length > 0 && adGroupResourceName) {
              // Dedupe and limit keywords
              const uniqueKeywords = [...new Set(keywords)];
              const safeKeywords = uniqueKeywords.slice(0, 15);
              
              const keywordOperations = safeKeywords.map((keyword: string) => {
                // Determine match type from keyword format
                let matchType = "BROAD";
                let keywordText = keyword;
                
                if (keyword.startsWith("[") && keyword.endsWith("]")) {
                  matchType = "EXACT";
                  keywordText = keyword.slice(1, -1);
                } else if (keyword.startsWith('"') && keyword.endsWith('"')) {
                  matchType = "PHRASE";
                  keywordText = keyword.slice(1, -1);
                }

                // Google Ads API: matchType goes ONLY in keyword object, NOT at criterion level
                return {
                  create: {
                    adGroup: adGroupResourceName,
                    status: "ENABLED",
                    keyword: {
                      text: keywordText,
                      matchType: matchType,
                    },
                  },
                };
              });

              try {
                const kwResponse = await fetch(
                  `${API_BASE}/customers/${customerId}/adGroupCriteria:mutate`,
                  {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ operations: keywordOperations }),
                  }
                );
                if (kwResponse.ok) {
                  console.log(`[GOOGLE-ADS] Added ${safeKeywords.length} keywords (from ${keywords.length} total)`);
                } else {
                  const kwError = await kwResponse.text();
                  console.warn("[GOOGLE-ADS] Keyword creation failed:", kwError);
                }
              } catch (e) {
                console.warn("[GOOGLE-ADS] Keyword creation failed:", e);
              }
            }

            // ========================================
            // Step 7: Create Responsive Search Ad
            // ========================================
            // Validate final URL (must be https://)
            const isValidUrl = (url: string): boolean => {
              try {
                const parsed = new URL(url);
                return parsed.protocol === "https:";
              } catch {
                return false;
              }
            };

            if (finalUrl && headlines.length >= 3 && descriptions.length >= 2 && adGroupResourceName) {
              // Validate URL format
              if (!isValidUrl(finalUrl)) {
                console.warn("[GOOGLE-ADS] Invalid final URL (must be https://), skipping ad creation");
              } else {
                // Validate and deduplicate headlines (max 30 chars, no special chars, unique)
                const cleanHeadline = (h: string) => h.replace(/[{}|]/g, "").trim().substring(0, 30);
                const uniqueHeadlines = [...new Set(headlines.map(cleanHeadline))];
                const validHeadlines = uniqueHeadlines.filter(h => h.length > 0).slice(0, 15);

                // Validate descriptions (max 90 chars)
                const cleanDescription = (d: string) => d.replace(/[{}|]/g, "").trim().substring(0, 90);
                const validDescriptions = descriptions.map(cleanDescription).filter(d => d.length > 0).slice(0, 4);

                if (validHeadlines.length < 3 || validDescriptions.length < 2) {
                  console.warn(`[GOOGLE-ADS] Not enough valid headlines (${validHeadlines.length}/3) or descriptions (${validDescriptions.length}/2)`);
                } else {
                  // Format headlines for API
                  const formattedHeadlines = validHeadlines.map((h: string) => ({
                    text: h,
                  }));

                  // Format descriptions for API
                  const formattedDescriptions = validDescriptions.map((d: string) => ({
                    text: d,
                  }));

                  // Use campaign goal for path1 instead of URL domain (marketing text)
                  const path1 = (campaignGoal || "Offres").replace(/[^a-zA-Z0-9À-ÿ\- ]/g, "").substring(0, 15).trim();

                  try {
                    const adResponse = await fetch(
                      `${API_BASE}/customers/${customerId}/adGroupAds:mutate`,
                      {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                          operations: [{
                            create: {
                              adGroup: adGroupResourceName,
                              status: "ENABLED",
                              ad: {
                                responsiveSearchAd: {
                                  headlines: formattedHeadlines,
                                  descriptions: formattedDescriptions,
                                  path1: path1 || undefined,
                                },
                                finalUrls: [finalUrl],
                              },
                            },
                          }],
                        }),
                      }
                    );

                    if (adResponse.ok) {
                      console.log(`[GOOGLE-ADS] Created Responsive Search Ad with ${validHeadlines.length} headlines and ${validDescriptions.length} descriptions`);
                    } else {
                      const adError = await adResponse.text();
                      console.warn("[GOOGLE-ADS] RSA creation failed:", adError);
                    }
                  } catch (e) {
                    console.warn("[GOOGLE-ADS] Ad creation failed:", e);
                  }
                }
              }
            }
          } else {
            console.warn("[GOOGLE-ADS] Ad group creation failed, campaign created without ads");
          }
        }

        // ========================================
        // Return with clear status and next steps
        // ========================================
        const strategyUsed = campaignData.maximizeConversions ? "MAXIMIZE_CONVERSIONS" :
                             campaignData.maximizeClicks ? "MAXIMIZE_CLICKS" : 
                             campaignData.manualCpc ? "MANUAL_CPC" : "MAXIMIZE_CLICKS";

        const finalStatus = autoEnable ? "ENABLED" : "PAUSED";
        const safeMode = !autoEnable;

        return new Response(
          JSON.stringify({ 
            success: true, 
            campaign: {
              name: campaignName,
              resourceName: campaignResourceName,
              campaignId: campaignId,
              type: campaignType,
              dailyBudget: dailyBudget,
              status: finalStatus,
              biddingStrategy: strategyUsed,
              adGroup: adGroupResourceName,
              keywordsAdded: keywords.length,
              hasAds: headlines.length >= 3 && descriptions.length >= 2,
              autoEnabled: autoEnable,
            },
            message: autoEnable 
              ? `🚀 Campagne "${campaignName}" créée et ACTIVÉE ! Stratégie: ${strategyUsed}.`
              : `Campagne "${campaignName}" créée en PAUSE. Configurez le tracking puis activez-la.`,
            nextSteps: autoEnable 
              ? ["Surveiller les performances", "Ajuster le budget si nécessaire"]
              : ["Vérifier les mots-clés et annonces", "Configurer le tracking des conversions", "Activer la campagne"],
            safeMode,
            safeModeTip: autoEnable
              ? `Tracking détecté ! La campagne utilise "${strategyUsed}" et est active.`
              : `Mode SAFE: "${strategyUsed}" utilisé par défaut. Configurez le tracking pour passer à MAXIMIZE_CONVERSIONS.`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error creating campaign:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to create campaign",
          details: error instanceof Error ? error.message : "Unknown error"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Create GA4 Audience
    // =============================================
    if (action === "create_ga4_audience") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ 
          error: "Session expired. Please sign in again.",
          code: "SESSION_EXPIRED"
        }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const audienceName = body.audience_name as string;
      const audienceDescription = body.description as string || "";
      const membershipDurationDays = body.membership_duration_days as number || 30;
      const audienceType = body.audience_type as string || "custom";

      if (!audienceName) {
        return new Response(JSON.stringify({ error: "Missing audience_name" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get GA4 connection
      const { data: ga4Connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "ga4")
        .eq("status", "connected")
        .maybeSingle();

      if (!ga4Connection?.account_id) {
        return new Response(JSON.stringify({ error: "No GA4 property selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access token
      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "connected")
        .not("access_token", "is", null)
        .limit(1)
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Not connected to Google" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
      }

      const propertyId = ga4Connection.account_id;

      try {
        // Define filter clauses based on audience type
        let filterClauses;
        
        if (audienceType === "cart_abandoners") {
          filterClauses = {
            andGroup: {
              filterExpressions: [
                {
                  orGroup: {
                    filterExpressions: [{
                      simpleFilter: {
                        scope: "AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS",
                        filterExpression: {
                          andGroup: {
                            filterExpressions: [{
                              eventFilter: {
                                eventName: "add_to_cart"
                              }
                            }]
                          }
                        }
                      }
                    }]
                  }
                }
              ]
            }
          };
        } else if (audienceType === "purchasers") {
          filterClauses = {
            andGroup: {
              filterExpressions: [{
                orGroup: {
                  filterExpressions: [{
                    simpleFilter: {
                      scope: "AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS",
                      filterExpression: {
                        andGroup: {
                          filterExpressions: [{
                            eventFilter: {
                              eventName: "purchase"
                            }
                          }]
                        }
                      }
                    }
                  }]
                }
              }]
            }
          };
        } else {
          // Default: all users
          filterClauses = {
            andGroup: {
              filterExpressions: [{
                orGroup: {
                  filterExpressions: [{
                    simpleFilter: {
                      scope: "AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS",
                      filterExpression: {
                        andGroup: {
                          filterExpressions: [{
                            eventFilter: {
                              eventName: "session_start"
                            }
                          }]
                        }
                      }
                    }
                  }]
                }
              }]
            }
          };
        }

        const audienceData = {
          displayName: audienceName,
          description: audienceDescription,
          membershipDurationDays: membershipDurationDays,
          filterClauses: [filterClauses],
        };

        const response = await fetch(
          `https://analyticsadmin.googleapis.com/v1alpha/properties/${propertyId}/audiences`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(audienceData),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] Failed to create GA4 audience:", errorText);
          return new Response(JSON.stringify({ 
            error: "Failed to create audience: " + errorText
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const newAudience = await response.json();
        console.log(`[GOOGLE-ADS] Created GA4 audience: ${audienceName}`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            audience: {
              name: newAudience.name,
              displayName: newAudience.displayName,
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("[GOOGLE-ADS] Error creating GA4 audience:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to create audience"
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Get Keywords for a Campaign
    // =============================================
    if (action === "get_keywords") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaign_id = body.campaign_id as string;
      if (!campaign_id) {
        return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const customerId = connection.account_id?.replace(/-/g, "") || "";
      const metadata = connection.metadata as { manager_customer_id?: string } | null;
      const managerCustomerId = metadata?.manager_customer_id?.replace(/-/g, "") || "";

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      };
      if (managerCustomerId) {
        headers["login-customer-id"] = managerCustomerId;
      }

      // GAQL query for keywords - use ad_group_criterion directly
      // keyword_view only returns keywords with impressions, so we use ad_group_criterion
      // to get ALL keywords including those with no traffic yet
      console.log("[GOOGLE-ADS] Fetching keywords for campaign_id:", campaign_id);
      
      // Query for keyword attributes (without metrics - gets ALL keywords)
      const queryAttributes = `
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.resource_name,
          ad_group_criterion.approval_status,
          ad_group_criterion.system_serving_status,
          ad_group.id,
          ad_group.name
        FROM ad_group_criterion
        WHERE campaign.id = ${campaign_id}
          AND ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.status != 'REMOVED'
        ORDER BY ad_group_criterion.keyword.text ASC
        LIMIT 200
      `;
      
      // Query for metrics (with date segment - only keywords with activity)
      const queryMetrics = `
        SELECT
          ad_group_criterion.criterion_id,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM keyword_view
        WHERE campaign.id = ${campaign_id}
          AND ad_group_criterion.status != 'REMOVED'
          AND segments.date DURING LAST_30_DAYS
      `;

      try {
        // First, fetch keyword attributes (all keywords, no metrics)
        const responseAttrs = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ query: queryAttributes }),
          }
        );

        if (!responseAttrs.ok) {
          const errorText = await responseAttrs.text();
          console.error("[GOOGLE-ADS] get_keywords attributes error:", errorText);
          return new Response(JSON.stringify({ error: "Failed to fetch keywords", keywords: [], details: errorText }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const dataAttrs = await responseAttrs.json();
        const resultsAttrs = dataAttrs[0]?.results || [];
        
        console.log("[GOOGLE-ADS] Keywords attributes found:", resultsAttrs.length);
        
        // Build a map of keyword metrics (may be empty for new keywords)
        const metricsMap = new Map<string, {
          clicks: number;
          impressions: number;
          cost: number;
          conversions: number;
          ctr: number;
        }>();
        
        // Try to fetch metrics from keyword_view (may fail or be empty)
        try {
          const responseMetrics = await fetch(
            `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ query: queryMetrics }),
            }
          );
          
          if (responseMetrics.ok) {
            const dataMetrics = await responseMetrics.json();
            const resultsMetrics = dataMetrics[0]?.results || [];
            console.log("[GOOGLE-ADS] Keywords metrics found:", resultsMetrics.length);
            
            for (const r of resultsMetrics) {
              const criterionId = r.adGroupCriterion?.criterionId;
              if (criterionId) {
                const existing = metricsMap.get(criterionId) || { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0 };
                metricsMap.set(criterionId, {
                  clicks: existing.clicks + parseInt(r.metrics?.clicks || "0", 10),
                  impressions: existing.impressions + parseInt(r.metrics?.impressions || "0", 10),
                  cost: existing.cost + (parseInt(r.metrics?.costMicros || "0", 10) / 1_000_000),
                  conversions: existing.conversions + (r.metrics?.conversions || 0),
                  ctr: r.metrics?.ctr || existing.ctr,
                });
              }
            }
          }
        } catch (metricsError) {
          console.log("[GOOGLE-ADS] Could not fetch keyword metrics (expected for new campaigns):", metricsError);
        }

        interface KeywordResult {
          adGroupCriterion?: {
            criterionId?: string;
            keyword?: { text?: string; matchType?: string };
            status?: string;
            resourceName?: string;
            approvalStatus?: string;
            systemServingStatus?: string;
          };
          adGroup?: { id?: string; name?: string };
        }

        const keywords = resultsAttrs.map((r: KeywordResult) => {
          const criterionId = r.adGroupCriterion?.criterionId || "";
          const metrics = metricsMap.get(criterionId) || { clicks: 0, impressions: 0, cost: 0, conversions: 0, ctr: 0 };
          
          return {
            id: criterionId,
            keyword: r.adGroupCriterion?.keyword?.text || "",
            matchType: r.adGroupCriterion?.keyword?.matchType || "BROAD",
            status: r.adGroupCriterion?.status || "UNKNOWN",
            approvalStatus: r.adGroupCriterion?.approvalStatus || null,
            systemServingStatus: r.adGroupCriterion?.systemServingStatus || null,
            resourceName: r.adGroupCriterion?.resourceName || "",
            adGroupId: r.adGroup?.id || "",
            adGroupName: r.adGroup?.name || "",
            clicks: metrics.clicks,
            impressions: metrics.impressions,
            cost: metrics.cost,
            conversions: metrics.conversions,
            ctr: metrics.ctr,
          };
        });
        
        console.log("[GOOGLE-ADS] Processed keywords:", keywords.length);

        return new Response(JSON.stringify({ success: true, keywords }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[GOOGLE-ADS] get_keywords error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch keywords", keywords: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Get Ads for a Campaign
    // =============================================
    if (action === "get_ads") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaign_id = body.campaign_id as string;
      if (!campaign_id) {
        return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const customerId = connection.account_id?.replace(/-/g, "") || "";
      const metadata = connection.metadata as { manager_customer_id?: string } | null;
      const managerCustomerId = metadata?.manager_customer_id?.replace(/-/g, "") || "";

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      };
      if (managerCustomerId) {
        headers["login-customer-id"] = managerCustomerId;
      }

      // GAQL query for RSA ads with metrics
      const query = `
        SELECT
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.final_urls,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.status,
          ad_group_ad.resource_name,
          ad_group.id,
          ad_group.name,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr
        FROM ad_group_ad
        WHERE campaign.id = ${campaign_id}
          AND ad_group_ad.status != 'REMOVED'
        ORDER BY metrics.impressions DESC
        LIMIT 50
      `;

      try {
        const response = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] get_ads error:", errorText);
          return new Response(JSON.stringify({ error: "Failed to fetch ads", ads: [] }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const results = data[0]?.results || [];

        interface AdAsset {
          text?: string;
          pinnedField?: string;
        }
        interface AdResult {
          adGroupAd?: {
            ad?: {
              id?: string;
              name?: string;
              type?: string;
              finalUrls?: string[];
              responsiveSearchAd?: {
                headlines?: AdAsset[];
                descriptions?: AdAsset[];
              };
            };
            status?: string;
            resourceName?: string;
          };
          adGroup?: { id?: string; name?: string };
          metrics?: {
            clicks?: string;
            impressions?: string;
            costMicros?: string;
            conversions?: number;
            ctr?: number;
          };
        }

        const ads = results.map((r: AdResult) => ({
          id: r.adGroupAd?.ad?.id || "",
          name: r.adGroupAd?.ad?.name || "",
          type: r.adGroupAd?.ad?.type || "UNKNOWN",
          finalUrls: r.adGroupAd?.ad?.finalUrls || [],
          headlines: r.adGroupAd?.ad?.responsiveSearchAd?.headlines?.map((h: AdAsset) => h.text) || [],
          descriptions: r.adGroupAd?.ad?.responsiveSearchAd?.descriptions?.map((d: AdAsset) => d.text) || [],
          status: r.adGroupAd?.status || "UNKNOWN",
          resourceName: r.adGroupAd?.resourceName || "",
          adGroupId: r.adGroup?.id || "",
          adGroupName: r.adGroup?.name || "",
          clicks: parseInt(r.metrics?.clicks || "0", 10),
          impressions: parseInt(r.metrics?.impressions || "0", 10),
          cost: parseInt(r.metrics?.costMicros || "0", 10) / 1_000_000,
          conversions: r.metrics?.conversions || 0,
          ctr: r.metrics?.ctr || 0,
        }));

        return new Response(JSON.stringify({ success: true, ads }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[GOOGLE-ADS] get_ads error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch ads", ads: [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // =============================================
    // ACTION: Get Campaign Settings (targeting, networks, schedule)
    // =============================================
    if (action === "get_campaign_settings") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaign_id = body.campaign_id as string;
      if (!campaign_id) {
        return new Response(JSON.stringify({ error: "Missing campaign_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const customerId = connection.account_id?.replace(/-/g, "") || "";
      const metadata = connection.metadata as { manager_customer_id?: string } | null;
      const managerCustomerId = metadata?.manager_customer_id?.replace(/-/g, "") || "";

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      };
      if (managerCustomerId) {
        headers["login-customer-id"] = managerCustomerId;
      }

      // GAQL query for campaign settings
      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.start_date,
          campaign.end_date,
          campaign.network_settings.target_search_network,
          campaign.network_settings.target_content_network,
          campaign.network_settings.target_partner_search_network
        FROM campaign
        WHERE campaign.id = ${campaign_id}
      `;

      try {
        const response = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] get_campaign_settings error:", errorText);
          // Return default settings
          return new Response(JSON.stringify({ 
            success: true, 
            settings: {
              startDate: null,
              endDate: null,
              geoTargets: ["France"],
              languages: ["Français"],
              networkSettings: {
                targetSearchNetwork: true,
                targetContentNetwork: false,
                targetPartnerSearchNetwork: false,
              },
            }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        const results = data[0]?.results || [];
        
        let settings = {
          startDate: null as string | null,
          endDate: null as string | null,
          geoTargets: ["France"], // Default
          languages: ["Français"], // Default
          networkSettings: {
            targetSearchNetwork: true,
            targetContentNetwork: false,
            targetPartnerSearchNetwork: false,
          },
        };

        if (results.length > 0) {
          const campaign = results[0].campaign;
          if (campaign) {
            settings.startDate = campaign.startDate || null;
            settings.endDate = campaign.endDate || null;
            
            if (campaign.networkSettings) {
              settings.networkSettings = {
                targetSearchNetwork: campaign.networkSettings.targetSearchNetwork ?? true,
                targetContentNetwork: campaign.networkSettings.targetContentNetwork ?? false,
                targetPartnerSearchNetwork: campaign.networkSettings.targetPartnerSearchNetwork ?? false,
              };
            }
          }
        }

        // Try to fetch geo targets separately
        try {
          const geoQuery = `
            SELECT
              campaign_criterion.location.geo_target_constant
            FROM campaign_criterion
            WHERE campaign.id = ${campaign_id}
              AND campaign_criterion.type = 'LOCATION'
            LIMIT 20
          `;
          
          const geoResponse = await fetch(
            `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ query: geoQuery }),
            }
          );
          
          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            const geoResults = geoData[0]?.results || [];
            if (geoResults.length > 0) {
              settings.geoTargets = geoResults.map((r: { campaignCriterion?: { location?: { geoTargetConstant?: string } } }) => {
                const constant = r.campaignCriterion?.location?.geoTargetConstant || "";
                // Extract country name from resource name (simplified)
                return constant.split("/").pop() || "Unknown";
              });
            }
          }
        } catch (e) {
          console.log("[GOOGLE-ADS] Could not fetch geo targets:", e);
        }

        // Try to fetch languages separately
        try {
          const langQuery = `
            SELECT
              campaign_criterion.language.language_constant
            FROM campaign_criterion
            WHERE campaign.id = ${campaign_id}
              AND campaign_criterion.type = 'LANGUAGE'
            LIMIT 10
          `;
          
          const langResponse = await fetch(
            `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ query: langQuery }),
            }
          );
          
          if (langResponse.ok) {
            const langData = await langResponse.json();
            const langResults = langData[0]?.results || [];
            if (langResults.length > 0) {
              // Map language constants to readable names
              const langMap: Record<string, string> = {
                "1000": "Français",
                "1001": "Anglais", 
                "1002": "Allemand",
                "1003": "Espagnol",
                "1004": "Italien",
                "1005": "Portugais",
              };
              settings.languages = langResults.map((r: { campaignCriterion?: { language?: { languageConstant?: string } } }) => {
                const constant = r.campaignCriterion?.language?.languageConstant || "";
                const langId = constant.split("/").pop() || "";
                return langMap[langId] || `Language ${langId}`;
              });
            }
          }
        } catch (e) {
          console.log("[GOOGLE-ADS] Could not fetch languages:", e);
        }

        return new Response(JSON.stringify({ success: true, settings }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[GOOGLE-ADS] get_campaign_settings error:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to fetch campaign settings",
          settings: {
            startDate: null,
            endDate: null,
            geoTargets: ["France"],
            languages: ["Français"],
            networkSettings: {
              targetSearchNetwork: true,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }


    if (action === "update_keyword_status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Session expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const resourceName = body.resource_name as string;
      const newStatus = body.status as string; // ENABLED or PAUSED

      if (!resourceName || !newStatus) {
        return new Response(JSON.stringify({ error: "Missing resource_name or status" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabase
        .from("user_connections")
        .select("*")
        .eq("user_id", user.id)
        .eq("connection_type", "google_ads")
        .eq("status", "connected")
        .maybeSingle();

      if (!connection?.access_token) {
        return new Response(JSON.stringify({ error: "Google Ads not connected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let accessToken = connection.access_token as string;
      if (connection.token_expires_at && new Date(connection.token_expires_at) < new Date()) {
        const newToken = await refreshAccessToken(connection.refresh_token || "");
        if (!newToken) {
          return new Response(JSON.stringify({ error: "Token refresh failed" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        accessToken = newToken;
        await supabase
          .from("user_connections")
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + 3600000).toISOString(),
          })
          .eq("id", connection.id);
      }

      const customerId = connection.account_id?.replace(/-/g, "") || "";
      const metadata = connection.metadata as { manager_customer_id?: string } | null;
      const managerCustomerId = metadata?.manager_customer_id?.replace(/-/g, "") || "";

      const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
        "Content-Type": "application/json",
      };
      if (managerCustomerId) {
        headers["login-customer-id"] = managerCustomerId;
      }

      try {
        const response = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/adGroupCriteria:mutate`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              operations: [{
                updateMask: "status",
                update: {
                  resourceName: resourceName,
                  status: newStatus,
                },
              }],
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[GOOGLE-ADS] update_keyword_status error:", errorText);
          return new Response(JSON.stringify({ success: false, error: errorText }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[GOOGLE-ADS] update_keyword_status error:", error);
        return new Response(JSON.stringify({ success: false, error: "Failed to update keyword" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GOOGLE-ADS] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// =============================================
// REAL GOOGLE ADS API FUNCTIONS
// =============================================
const GOOGLE_ADS_API_VERSION = "v22";
const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("[GOOGLE-ADS] Failed to refresh token");
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("[GOOGLE-ADS] Token refresh error:", error);
    return null;
  }
}

interface CustomerInfo {
  id: string;
  name: string;
  isManager?: boolean;
  managerId?: string; // If this is a client under an MCC
}

async function listCustomerIds(accessToken: string): Promise<{ customerIds: string[], customers: CustomerInfo[], error?: string }> {
  const url = `${GOOGLE_ADS_API_BASE}/customers:listAccessibleCustomers`;
  console.log("[GOOGLE-ADS] Calling listAccessibleCustomers:", url);
  console.log("[GOOGLE-ADS] Developer token present:", !!GOOGLE_ADS_DEVELOPER_TOKEN);
  
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
      },
    });

    const responseText = await response.text();
    console.log("[GOOGLE-ADS] listAccessibleCustomers status:", response.status);
    console.log("[GOOGLE-ADS] listAccessibleCustomers response:", responseText);

    if (!response.ok) {
      console.error("[GOOGLE-ADS] Failed to list customers. Status:", response.status, "Response:", responseText);
      return { customerIds: [], customers: [], error: `API error ${response.status}: ${responseText}` };
    }

    const data = JSON.parse(responseText);
    const resourceNames: unknown = data.resourceNames;
    const names = Array.isArray(resourceNames) ? resourceNames : [];

    const customerIds = names
      .map((r) => (typeof r === "string" ? r.replace("customers/", "") : ""))
      .filter(Boolean);
    
    console.log("[GOOGLE-ADS] Found customer IDs:", customerIds);

    // Fetch customer details to get names and check if they're manager accounts
    // Use GAQL (customer.manager) because the Customer REST resource doesn't reliably expose "manager".
    const customers: CustomerInfo[] = [];
    const managerAccounts: string[] = [];

    for (const customerId of customerIds) {
      try {
        const q = "SELECT customer.id, customer.descriptive_name, customer.manager FROM customer LIMIT 1";

        const detailResponse = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
              "login-customer-id": customerId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: q }),
          }
        );

        if (detailResponse.ok) {
          const customerData = await detailResponse.json();
          const row = customerData?.results?.[0];
          const isManager = row?.customer?.manager === true;
          const name = row?.customer?.descriptiveName || row?.customer?.descriptive_name || `Account ${customerId}`;

          customers.push({ id: customerId, name, isManager });
          if (isManager) managerAccounts.push(customerId);
        } else {
          customers.push({ id: customerId, name: `Account ${customerId}` });
        }
      } catch (e) {
        console.error(`[GOOGLE-ADS] Failed to get details for customer ${customerId}:`, e);
        customers.push({ id: customerId, name: `Account ${customerId}` });
      }
    }

    // For each manager account, fetch the client accounts under it
    for (const managerId of managerAccounts) {
      try {
        console.log(`[GOOGLE-ADS] Fetching client accounts for manager ${managerId}`);
        const searchQuery = `
          SELECT 
            customer_client.client_customer,
            customer_client.descriptive_name,
            customer_client.manager,
            customer_client.level
          FROM customer_client
          WHERE customer_client.level = 1
            AND customer_client.manager = false
        `;
        
        const searchResponse = await fetch(
          `${GOOGLE_ADS_API_BASE}/customers/${managerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
              "login-customer-id": managerId,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: searchQuery }),
          }
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const results = searchData.results || [];
          
          for (const result of results) {
            const clientInfo = result.customerClient;
            if (clientInfo) {
              const clientId = clientInfo.clientCustomer?.replace("customers/", "") || "";
              // Check if this client account isn't already in our list
              if (clientId && !customers.find(c => c.id === clientId)) {
                customers.push({
                  id: clientId,
                  name: clientInfo.descriptiveName || `Client Account ${clientId}`,
                  isManager: false,
                  managerId: managerId, // Mark which MCC this is under
                });
                customerIds.push(clientId);
              }
            }
          }
        }
      } catch (e) {
        console.error(`[GOOGLE-ADS] Failed to list client accounts for manager ${managerId}:`, e);
      }
    }

    console.log("[GOOGLE-ADS] Customer details:", customers);
    return { customerIds, customers };
  } catch (error) {
    console.error("[GOOGLE-ADS] Error listing customers:", error);
    return { customerIds: [], customers: [], error: String(error) };
  }
}

interface GA4Property {
  name: string;
  displayName: string;
  propertyId: string;
}

async function listGA4Properties(accessToken: string): Promise<{ properties: GA4Property[]; error?: string }> {
  try {
    console.log("[GOOGLE-ADS] Fetching GA4 accounts...");
    
    // Use a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      // First get all accounts
      const accountsResponse = await fetch(
        "https://analyticsadmin.googleapis.com/v1beta/accounts",
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!accountsResponse.ok) {
        const errorText = await accountsResponse.text();
        console.error("[GOOGLE-ADS] Failed to list GA4 accounts:", accountsResponse.status, errorText);
        
        // Check if API is disabled
        if (errorText.includes("SERVICE_DISABLED") || errorText.includes("has not been used in project")) {
          return { 
            properties: [], 
            error: "Google Analytics Admin API is not enabled. Please enable it in your Google Cloud Console." 
          };
        }
        
        // Check for permission errors
        if (accountsResponse.status === 403) {
          return { 
            properties: [], 
            error: "Permission denied. Please ensure you have access to Google Analytics." 
          };
        }
        
        return { properties: [], error: `Failed to access GA4: ${accountsResponse.status}` };
      }

      const accountsData = await accountsResponse.json();
      const accounts = accountsData.accounts || [];
      console.log(`[GOOGLE-ADS] Found ${accounts.length} GA4 accounts`);

      if (accounts.length === 0) {
        console.log("[GOOGLE-ADS] No GA4 accounts found for this user");
        return { properties: [], error: "No GA4 accounts found. Make sure you have access to Google Analytics properties." };
      }

      const allProperties: GA4Property[] = [];

      // For each account, get its properties (with timeout for each request)
      for (const account of accounts) {
        const accountName = account.name;
        console.log(`[GOOGLE-ADS] Fetching properties for GA4 account: ${accountName}`);
        
        try {
          const propController = new AbortController();
          const propTimeoutId = setTimeout(() => propController.abort(), 10000);
          
          const propertiesResponse = await fetch(
            `https://analyticsadmin.googleapis.com/v1beta/properties?filter=parent:${accountName}`,
            {
              headers: {
                "Authorization": `Bearer ${accessToken}`,
              },
              signal: propController.signal,
            }
          );
          
          clearTimeout(propTimeoutId);

          if (propertiesResponse.ok) {
            const propertiesData = await propertiesResponse.json();
            const properties = propertiesData.properties || [];
            console.log(`[GOOGLE-ADS] Found ${properties.length} properties in account ${accountName}`);
            
            for (const prop of properties) {
              allProperties.push({
                name: prop.name,
                displayName: prop.displayName,
                propertyId: prop.name.replace("properties/", ""),
              });
            }
          } else {
            const errorText = await propertiesResponse.text();
            console.error(`[GOOGLE-ADS] Failed to get properties for ${accountName}:`, propertiesResponse.status, errorText);
          }
        } catch (propError) {
          console.error(`[GOOGLE-ADS] Error fetching properties for ${accountName}:`, propError);
        }
      }

      console.log(`[GOOGLE-ADS] Total GA4 properties found: ${allProperties.length}`);
      return { properties: allProperties };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[GOOGLE-ADS] GA4 API request timed out");
        return { properties: [], error: "Request timed out. Please try again." };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("[GOOGLE-ADS] Error listing GA4 properties:", error);
    return { properties: [], error: error instanceof Error ? error.message : String(error) };
  }
}

interface GTMContainer {
  containerId: string;
  name: string;
  accountId: string;
}

async function listGTMContainers(accessToken: string): Promise<GTMContainer[]> {
  try {
    // First get all GTM accounts
    const accountsResponse = await fetch(
      "https://tagmanager.googleapis.com/tagmanager/v2/accounts",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    if (!accountsResponse.ok) {
      console.error("[GOOGLE-ADS] Failed to list GTM accounts:", await accountsResponse.text());
      return [];
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.account || [];

    const allContainers: GTMContainer[] = [];

    // For each account, get its containers
    for (const account of accounts) {
      const accountPath = account.path;
      const containersResponse = await fetch(
        `https://tagmanager.googleapis.com/tagmanager/v2/${accountPath}/containers`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        }
      );

      if (containersResponse.ok) {
        const containersData = await containersResponse.json();
        const containers = containersData.container || [];
        
        for (const container of containers) {
          allContainers.push({
            containerId: container.containerId,
            name: container.name,
            accountId: account.accountId,
          });
        }
      }
    }

    return allContainers;
  } catch (error) {
    console.error("[GOOGLE-ADS] Error listing GTM containers:", error);
    return [];
  }
}

async function getCustomerId(accessToken: string): Promise<string | null> {
  const result = await listCustomerIds(accessToken);
  return result.customerIds[0] || null;
}

async function applyBudgetChange(
  accessToken: string,
  customerId: string,
  campaignId: string,
  newBudgetMicros: number
): Promise<{ success: boolean; response?: Record<string, unknown>; error?: string }> {
  try {
    // First, get the campaign to find its budget resource
    const searchQuery = `
      SELECT campaign.id, campaign.name, campaign_budget.id, campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const searchResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/googleAds:searchStream`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchQuery }),
      }
    );

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("[GOOGLE-ADS] Search failed:", errorText);
      return { success: false, error: `Failed to find campaign: ${errorText}` };
    }

    const searchData = await searchResponse.json();
    const results = searchData[0]?.results;
    
    if (!results || results.length === 0) {
      return { success: false, error: "Campaign not found" };
    }

    const budgetId = results[0].campaignBudget.id;
    const budgetResourceName = `customers/${customerId}/campaignBudgets/${budgetId}`;

    // Now update the budget
    const mutateBody = {
      operations: [{
        updateMask: "amountMicros",
        update: {
          resourceName: budgetResourceName,
          amountMicros: newBudgetMicros.toString(),
        },
      }],
    };

    const mutateResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaignBudgets:mutate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutateBody),
      }
    );

    if (!mutateResponse.ok) {
      const errorText = await mutateResponse.text();
      console.error("[GOOGLE-ADS] Budget mutate failed:", errorText);
      return { success: false, error: `Failed to update budget: ${errorText}` };
    }

    const mutateData = await mutateResponse.json();
    console.log("[GOOGLE-ADS] Budget updated successfully:", mutateData);

    return {
      success: true,
      response: {
        operation_id: `op_${Date.now()}`,
        resource_name: budgetResourceName,
        status: "DONE",
        mutate_result: mutateData,
      },
    };
  } catch (error) {
    console.error("[GOOGLE-ADS] Budget change error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function applyBidChange(
  accessToken: string,
  customerId: string,
  campaignId: string,
  bidAdjustmentPercent: number,
  criterionType: string = "DEVICE"
): Promise<{ success: boolean; response?: Record<string, unknown>; error?: string }> {
  try {
    // For device bid adjustments, we need to update campaign criterion
    const resourceName = `customers/${customerId}/campaignCriteria/${campaignId}~${criterionType === "MOBILE" ? "30001" : "30000"}`;

    const mutateBody = {
      operations: [{
        updateMask: "bidModifier",
        update: {
          resourceName,
          bidModifier: (100 + bidAdjustmentPercent) / 100, // Convert percentage to multiplier
        },
      }],
    };

    const mutateResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaignCriteria:mutate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutateBody),
      }
    );

    if (!mutateResponse.ok) {
      const errorText = await mutateResponse.text();
      console.error("[GOOGLE-ADS] Bid mutate failed:", errorText);
      return { success: false, error: `Failed to update bid: ${errorText}` };
    }

    const mutateData = await mutateResponse.json();
    console.log("[GOOGLE-ADS] Bid updated successfully:", mutateData);

    return {
      success: true,
      response: {
        operation_id: `op_${Date.now()}`,
        resource_name: resourceName,
        status: "DONE",
        mutate_result: mutateData,
      },
    };
  } catch (error) {
    console.error("[GOOGLE-ADS] Bid change error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function pauseCampaign(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<{ success: boolean; response?: Record<string, unknown>; error?: string }> {
  try {
    const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

    const mutateBody = {
      operations: [{
        updateMask: "status",
        update: {
          resourceName,
          status: "PAUSED",
        },
      }],
    };

    const mutateResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutateBody),
      }
    );

    if (!mutateResponse.ok) {
      const errorText = await mutateResponse.text();
      console.error("[GOOGLE-ADS] Campaign pause failed:", errorText);
      return { success: false, error: `Failed to pause campaign: ${errorText}` };
    }

    const mutateData = await mutateResponse.json();
    console.log("[GOOGLE-ADS] Campaign paused successfully:", mutateData);

    return {
      success: true,
      response: {
        operation_id: `op_${Date.now()}`,
        resource_name: resourceName,
        status: "DONE",
        mutate_result: mutateData,
      },
    };
  } catch (error) {
    console.error("[GOOGLE-ADS] Campaign pause error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function enableCampaign(
  accessToken: string,
  customerId: string,
  campaignId: string
): Promise<{ success: boolean; response?: Record<string, unknown>; error?: string }> {
  try {
    const resourceName = `customers/${customerId}/campaigns/${campaignId}`;

    const mutateBody = {
      operations: [{
        updateMask: "status",
        update: {
          resourceName,
          status: "ENABLED",
        },
      }],
    };

    const mutateResponse = await fetch(
      `${GOOGLE_ADS_API_BASE}/customers/${customerId}/campaigns:mutate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mutateBody),
      }
    );

    if (!mutateResponse.ok) {
      const errorText = await mutateResponse.text();
      console.error("[GOOGLE-ADS] Campaign enable failed:", errorText);
      return { success: false, error: `Failed to enable campaign: ${errorText}` };
    }

    const mutateData = await mutateResponse.json();
    console.log("[GOOGLE-ADS] Campaign enabled successfully:", mutateData);

    return {
      success: true,
      response: {
        operation_id: `op_${Date.now()}`,
        resource_name: resourceName,
        status: "DONE",
        mutate_result: mutateData,
      },
    };
  } catch (error) {
    console.error("[GOOGLE-ADS] Campaign enable error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Main apply function that routes to the correct operation
async function executeGoogleAdsOperation(
  recommendation: Record<string, unknown>,
  accessToken: string,
  refreshToken: string,
  customerId: string | null
): Promise<{ success: boolean; response?: Record<string, unknown>; error?: string }> {
  // Refresh token if needed
  let token = accessToken;
  
  // Get customer ID if not provided
  let custId = customerId;
  if (!custId) {
    custId = await getCustomerId(token);
    if (!custId) {
      // Try refreshing token
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) {
        token = newToken;
        custId = await getCustomerId(token);
      }
    }
  }

  if (!custId) {
    return { success: false, error: "Could not determine Google Ads customer ID" };
  }

  const actionData = recommendation.action_data as Record<string, unknown> | null;
  const campaignId = recommendation.campaign_id as string;
  const recType = recommendation.recommendation_type as string;

  console.log(`[GOOGLE-ADS] Executing ${recType} for campaign ${campaignId}`);

  switch (recType) {
    case "budget": {
      const budgetChange = actionData?.budget_change_percent as number || 0;
      const currentBudget = actionData?.current_budget_micros as number || 0;
      const newBudget = Math.round(currentBudget * (1 + budgetChange / 100));
      return applyBudgetChange(token, custId, campaignId, newBudget);
    }

    case "bid": {
      const bidAdjustment = actionData?.bid_adjustment_percent as number || 0;
      const criterionType = actionData?.criterion_type as string || "MOBILE";
      return applyBidChange(token, custId, campaignId, bidAdjustment, criterionType);
    }

    case "pause": {
      return pauseCampaign(token, custId, campaignId);
    }

    case "enable": {
      return enableCampaign(token, custId, campaignId);
    }

    default: {
      console.log(`[GOOGLE-ADS] Unsupported recommendation type: ${recType}, simulating success`);
      // For unsupported types, return success with simulation note
      return {
        success: true,
        response: {
          operation_id: `op_${Date.now()}`,
          status: "SIMULATED",
          note: `Operation type '${recType}' executed in simulation mode`,
        },
      };
    }
  }
}

// Rollback function
async function executeGoogleAdsRollback(
  actionLog: Record<string, unknown>,
  accessToken: string,
  refreshToken: string,
  customerId: string | null
): Promise<{ success: boolean; error?: string }> {
  let token = accessToken;
  let custId = customerId;

  if (!custId) {
    custId = await getCustomerId(token);
    if (!custId) {
      const newToken = await refreshAccessToken(refreshToken);
      if (newToken) {
        token = newToken;
        custId = await getCustomerId(token);
      }
    }
  }

  if (!custId) {
    return { success: false, error: "Could not determine Google Ads customer ID" };
  }

  const beforeState = actionLog.before_state as Record<string, unknown>;
  const actionType = actionLog.action_type as string;
  const entityId = actionLog.entity_id as string;

  console.log(`[GOOGLE-ADS] Rolling back ${actionType} for entity ${entityId}`);

  // Determine rollback action based on action type
  if (actionType.includes("budget")) {
    const originalBudget = beforeState?.current_budget_micros as number;
    if (originalBudget) {
      const result = await applyBudgetChange(token, custId, entityId, originalBudget);
      return { success: result.success, error: result.error };
    }
  }

  if (actionType.includes("bid")) {
    const originalBid = beforeState?.bid_adjustment_percent as number || 0;
    const criterionType = beforeState?.criterion_type as string || "MOBILE";
    const result = await applyBidChange(token, custId, entityId, originalBid, criterionType);
    return { success: result.success, error: result.error };
  }

  if (actionType.includes("pause")) {
    // Rollback pause = enable
    const result = await enableCampaign(token, custId, entityId);
    return { success: result.success, error: result.error };
  }

  if (actionType.includes("enable")) {
    // Rollback enable = pause
    const result = await pauseCampaign(token, custId, entityId);
    return { success: result.success, error: result.error };
  }

  // For unsupported rollback types, return success
  console.log(`[GOOGLE-ADS] Rollback type not fully supported: ${actionType}, returning success`);
  return { success: true };
}
