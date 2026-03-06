import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Refresh Google OAuth token
async function refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth credentials not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { userId, limit: maxArticles } = body;
    const batchLimit = Math.min(maxArticles || 200, 200); // Cap at 200 (Google daily quota)

    console.log(`[bulk-index] Starting bulk indexing (limit: ${batchLimit})...`);

    // First reset all previously failed articles
    const { data: resetData } = await supabase
      .from("published_articles")
      .update({ gsc_indexed: null, gsc_index_error: null })
      .eq("gsc_indexed", false)
      .select("id");
    
    console.log(`[bulk-index] Reset ${resetData?.length || 0} failed articles`);

    // Fetch all unindexed articles
    const { data: articles, error: articlesError } = await supabase
      .from("published_articles")
      .select("id, slug, title")
      .is("gsc_indexed", null)
      .order("published_at", { ascending: true })
      .limit(batchLimit);

    if (articlesError) throw articlesError;

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, indexed: 0, message: "All articles already indexed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[bulk-index] Found ${articles.length} articles to index`);

    // Get OAuth tokens - either from provided userId or from project owner
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: project } = await supabase
        .from("projects")
        .select("user_id")
        .or("domain.eq.autopilotgeo.com,website_url.ilike.%autopilotgeoom%")
        .limit(1)
        .single();
      
      targetUserId = project?.user_id;
    }

    if (!targetUserId) {
      throw new Error("Could not determine user for OAuth tokens");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", targetUserId)
      .single();

    if (!profile?.google_refresh_token) {
      throw new Error("User has no Google OAuth tokens connected");
    }

    // Refresh token if needed
    let accessToken = profile.google_oauth_token;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    
    if (!expiresAt || expiresAt < new Date()) {
      console.log("[bulk-index] Refreshing Google OAuth token...");
      const refreshed = await refreshGoogleToken(profile.google_refresh_token);
      accessToken = refreshed.accessToken;
      
      await supabase
        .from("profiles")
        .update({
          google_oauth_token: refreshed.accessToken,
          google_token_expires_at: refreshed.expiresAt.toISOString(),
        })
        .eq("id", targetUserId);
    }

    // Submit articles to Google Indexing API
    let indexedCount = 0;
    let errorCount = 0;
    const errors: { slug: string; error: string }[] = [];

    for (const article of articles) {
      const publishedUrl = `https://loautopilotgeoom/blog/${article.slug}`;
      
      try {
        const response = await fetch(
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

        const result = await response.json();
        // Google may return urlNotificationMetadata.url without latestUpdate.notifyTime
        // Both are valid success indicators
        const hasNotification = result.urlNotificationMetadata?.url || result.urlNotificationMetadata?.latestUpdate?.notifyTime;

        console.log(`[bulk-index] Google response for ${article.slug}:`, JSON.stringify(result).slice(0, 500));

        if (response.ok && hasNotification) {
          await supabase
            .from("published_articles")
            .update({
              gsc_indexed: true,
              gsc_indexed_at: new Date().toISOString(),
              gsc_index_error: null,
            })
            .eq("id", article.id);
          indexedCount++;
          console.log(`[bulk-index] ✓ ${indexedCount}/${articles.length}: ${article.slug}`);
        } else {
          const errorMsg = result.error?.message || 
            (result.error?.status ? `${result.error.status}: ${result.error.code}` : null) ||
            "Google did not accept indexation request";
          await supabase
            .from("published_articles")
            .update({
              gsc_indexed: false,
              gsc_index_error: errorMsg,
            })
            .eq("id", article.id);
          errorCount++;
          errors.push({ slug: article.slug, error: errorMsg });
          console.error(`[bulk-index] ✗ ${article.slug}: ${errorMsg} (status: ${response.status})`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        await supabase
          .from("published_articles")
          .update({
            gsc_indexed: false,
            gsc_index_error: errorMsg,
          })
          .eq("id", article.id);
        errorCount++;
        errors.push({ slug: article.slug, error: errorMsg });
      }

      // Rate limit: 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[bulk-index] Completed: ${indexedCount} indexed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        indexed: indexedCount,
        failed: errorCount,
        total: articles.length,
        errors: errors.slice(0, 10), // Only return first 10 errors
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[bulk-index] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
