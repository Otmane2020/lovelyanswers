import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndexingRequest {
  articleId: string;
  publishedUrl: string;
  userId?: string;
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

    console.log(`[gsc-indexing] Requesting indexation for: ${publishedUrl}`);

    // Get the article to find the project
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("project_id")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error("Article not found");
    }

    // Get project owner's Google OAuth tokens
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", article.project_id)
      .single();

    const targetUserId = userId || project?.user_id;

    if (!targetUserId) {
      // No user to get OAuth token from - mark as pending
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "No Google account connected",
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: "No Google account connected" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's Google OAuth token
    const { data: profile } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", targetUserId)
      .single();

    if (!profile?.google_oauth_token) {
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "Google Search Console not connected",
        })
        .eq("id", articleId);

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
        // Refresh the token
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
              .eq("id", targetUserId);
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
          url: publishedUrl,
          type: "URL_UPDATED",
        }),
      }
    );

    const indexingResult = await indexingResponse.json();

    if (!indexingResponse.ok) {
      console.error("[gsc-indexing] API error:", indexingResult);

      const errorMessage = indexingResult.error?.message || "Indexing API error";

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
