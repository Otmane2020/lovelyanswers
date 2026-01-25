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

    // Admin client for updating tokens
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's Google OAuth tokens from profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile?.google_oauth_token) {
      return new Response(JSON.stringify({ error: "Google not connected", sites: [] }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    let accessToken = profile.google_oauth_token;

    // Check if token is expired and refresh if needed
    const expiresAt = profile.google_token_expires_at
      ? new Date(profile.google_token_expires_at)
      : null;

    if (!expiresAt || expiresAt < new Date()) {
      if (!profile.google_refresh_token) {
        // No refresh token - clear tokens and return
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
          sites: [] 
        }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

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

        // Clear invalid tokens
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
          sites: [],
          details: refreshError
        }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      const tokenData = await refreshResponse.json();
      accessToken = tokenData.access_token;

      await adminClient
        .from("profiles")
        .update({
          google_oauth_token: tokenData.access_token,
          google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        })
        .eq("id", userId);

      console.log("Token refreshed successfully");
    }

    // Fetch sites from GSC API
    const response = await fetch(
      "https://www.googleapis.com/webmasters/v3/sites",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GSC API error:", errorText);

      // Check if it's an auth error
      if (response.status === 401 || response.status === 403) {
        // Clear tokens
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
          sites: [],
          details: errorText
        }), { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ error: "Failed to fetch sites", sites: [] }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const data = await response.json();
    const sites = (data.siteEntry || []).map((site: any) => ({
      siteUrl: site.siteUrl,
      permissionLevel: site.permissionLevel,
    }));

    return new Response(JSON.stringify({ sites }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error", sites: [] }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
