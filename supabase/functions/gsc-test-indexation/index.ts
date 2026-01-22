import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestIndexRequest {
  url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization required");
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    const { url }: TestIndexRequest = await req.json();

    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`[gsc-test-indexation] User ${user.id} requesting indexation for: ${url}`);

    // Get user's Google OAuth token
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", user.id)
      .single();

    if (!profile?.google_oauth_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Search Console not connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken = profile.google_oauth_token;

    // Check if token is expired and refresh if needed
    if (profile.google_token_expires_at) {
      const expiresAt = new Date(profile.google_token_expires_at);
      if (expiresAt <= new Date() && profile.google_refresh_token) {
        const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
        const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

        if (clientId && clientSecret) {
          const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: profile.google_refresh_token,
              grant_type: "refresh_token",
            }),
          });

          if (refreshResponse.ok) {
            const tokenData = await refreshResponse.json();
            accessToken = tokenData.access_token;

            // Update stored token
            await supabase
              .from("profiles")
              .update({
                google_oauth_token: accessToken,
                google_token_expires_at: new Date(
                  Date.now() + tokenData.expires_in * 1000
                ).toISOString(),
              })
              .eq("id", user.id);
          }
        }
      }
    }

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
          url: url,
          type: "URL_UPDATED",
        }),
      }
    );

    const indexingResult = await indexingResponse.json();

    if (!indexingResponse.ok) {
      console.error("[gsc-test-indexation] API error:", indexingResult);
      const errorMessage = indexingResult.error?.message || "Indexing API error";

      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gsc-test-indexation] Success:", indexingResult);

    return new Response(
      JSON.stringify({
        success: true,
        notifyTime: indexingResult.urlNotificationMetadata?.latestUpdate?.notifyTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[gsc-test-indexation] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
