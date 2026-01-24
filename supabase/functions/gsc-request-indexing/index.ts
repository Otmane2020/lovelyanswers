import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndexingRequest {
  articleId: string;
  publishedUrl: string;
  userId: string;
}

// Refresh Google OAuth token using refresh token
async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Google token: ${error}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { articleId, publishedUrl, userId }: IndexingRequest = await req.json();

    if (!articleId || !publishedUrl) {
      throw new Error("Article ID and published URL are required");
    }

    if (!userId) {
      console.log("[gsc-indexing] No userId provided, skipping indexation");
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "User ID not provided for OAuth indexation",
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: "User ID required for indexation" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[gsc-indexing] Requesting indexation for: ${publishedUrl} (user: ${userId})`);

    // Get user's OAuth tokens from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("[gsc-indexing] Profile error:", profileError);
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "User profile not found",
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: "User profile not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.google_oauth_token || !profile.google_refresh_token) {
      console.log("[gsc-indexing] No Google OAuth tokens for user");
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "Google account not connected",
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: "Google account not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.google_oauth_token;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    
    if (!expiresAt || expiresAt < new Date()) {
      console.log("[gsc-indexing] Token expired, refreshing...");
      try {
        const refreshed = await refreshGoogleToken(profile.google_refresh_token);
        accessToken = refreshed.accessToken;

        // Update the token in the database
        await supabase
          .from("profiles")
          .update({
            google_oauth_token: refreshed.accessToken,
            google_token_expires_at: refreshed.expiresAt.toISOString(),
          })
          .eq("id", userId);

        console.log("[gsc-indexing] Token refreshed successfully");
      } catch (refreshError) {
        console.error("[gsc-indexing] Token refresh failed:", refreshError);
        await supabase
          .from("articles")
          .update({
            gsc_indexed: false,
            gsc_index_error: "Google token expired - reconnect Google account",
          })
          .eq("id", articleId);

        return new Response(
          JSON.stringify({ success: false, error: "Google token expired" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[gsc-indexing] Using user OAuth token for indexation");

    // Request indexation via Google Indexing API
    const indexingResponse = await fetch(
      "https://indexing.googleapis.com/v3/urlNotifications:publish",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: publishedUrl,
          type: "URL_UPDATED",
        }),
      }
    );

    const indexingResult = await indexingResponse.json();

    if (!indexingResponse.ok) {
      console.error("[gsc-indexing] API error:", indexingResult);

      let errorMessage = indexingResult.error?.message || "Indexing API error";
      
      // Provide more helpful error messages
      if (errorMessage.includes("Permission denied") || errorMessage.includes("URL ownership")) {
        errorMessage = "Permission denied - verify URL ownership in GSC";
      } else if (errorMessage.includes("quota")) {
        errorMessage = "Daily quota exceeded (200/day)";
      }

      await supabase
        .from("articles")
        .update({
          gsc_indexed: false,
          gsc_index_error: errorMessage,
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gsc-indexing] Success:", indexingResult);

    // Update article with successful indexation
    await supabase
      .from("articles")
      .update({
        gsc_indexed: true,
        gsc_indexed_at: new Date().toISOString(),
        gsc_index_error: null,
      })
      .eq("id", articleId);

    return new Response(
      JSON.stringify({
        success: true,
        notifyTime: indexingResult.urlNotificationMetadata?.latestUpdate?.notifyTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[gsc-indexing] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
