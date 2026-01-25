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
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
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
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const userId = claimsData.claims.sub;
    const { domain, days = 30 } = await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ error: "Domain is required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Get user's Google OAuth tokens from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.google_oauth_token) {
      return new Response(JSON.stringify({ error: "Google not connected" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    let accessToken = profile.google_oauth_token;
    let tokenRefreshed = false;

    // Admin client for updating tokens
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if token is expired and refresh if needed
    const expiresAt = profile.google_token_expires_at
      ? new Date(profile.google_token_expires_at)
      : null;

    if (!expiresAt || expiresAt < new Date()) {
      if (!profile.google_refresh_token) {
        // No refresh token - user needs to reconnect
        await adminClient
          .from("profiles")
          .update({
            google_oauth_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq("id", userId);

        return new Response(JSON.stringify({ 
          error: "Google session expired", 
          needsReconnect: true,
          message: "Votre session Google a expiré. Veuillez reconnecter votre compte Google."
        }), { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Refresh the token
      console.log("Refreshing expired Google token...");
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
          refresh_token: profile.google_refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!refreshResponse.ok) {
        const refreshError = await refreshResponse.text();
        console.error("Token refresh failed:", refreshError);

        // Clear invalid tokens - user needs to reconnect
        await adminClient
          .from("profiles")
          .update({
            google_oauth_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq("id", userId);

        return new Response(JSON.stringify({ 
          error: "Google token refresh failed", 
          needsReconnect: true,
          message: "La connexion Google n'est plus valide. Veuillez reconnecter votre compte Google.",
          details: refreshError
        }), { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const tokenData = await refreshResponse.json();
      accessToken = tokenData.access_token;
      tokenRefreshed = true;

      // Update the token in the database
      await adminClient
        .from("profiles")
        .update({
          google_oauth_token: tokenData.access_token,
          google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", userId);

      console.log("Token refreshed successfully");
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const formatDate = (date: Date) => date.toISOString().split("T")[0];

    // Prepare the domain URL for GSC API
    let siteUrl = domain;
    if (!domain.startsWith("http") && !domain.startsWith("sc-domain:")) {
      siteUrl = `sc-domain:${domain}`;
    }

    // Fetch main performance data
    const performanceResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["date"],
          rowLimit: days,
        }),
      }
    );

    if (!performanceResponse.ok) {
      const errorText = await performanceResponse.text();
      console.error("GSC API error:", errorText);

      // Check if it's an auth error - token might be invalid despite not being expired
      if (performanceResponse.status === 401 || performanceResponse.status === 403) {
        // Clear tokens and ask user to reconnect
        await adminClient
          .from("profiles")
          .update({
            google_oauth_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
          })
          .eq("id", userId);

        return new Response(JSON.stringify({ 
          error: "Google authentication failed", 
          needsReconnect: true,
          message: "Les identifiants Google ne sont plus valides. Veuillez reconnecter votre compte Google.",
          details: errorText
        }), { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ error: "Failed to fetch GSC data", details: errorText }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const performanceData = await performanceResponse.json();

    // Fetch top queries
    const queriesResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["query"],
          rowLimit: 50,
        }),
      }
    );

    const queriesData = queriesResponse.ok ? await queriesResponse.json() : { rows: [] };

    // Fetch top pages
    const pagesResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ["page"],
          rowLimit: 20,
        }),
      }
    );

    const pagesData = pagesResponse.ok ? await pagesResponse.json() : { rows: [] };

    // Transform data
    const data = (performanceData.rows || []).map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr * 100,
      position: row.position,
    }));

    const topQueries = (queriesData.rows || []).map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr * 100,
      position: row.position,
    }));

    const topPages = (pagesData.rows || []).map((row: any) => ({
      page: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr * 100,
      position: row.position,
    }));

    return new Response(JSON.stringify({ data, topQueries, topPages, tokenRefreshed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
