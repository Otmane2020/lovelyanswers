import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Refresh Google OAuth token using refresh token
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

// Submit a single URL to the Google Indexing API with retry
async function submitToIndexingAPI(url: string, accessToken: string, retries = 2): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
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
            url,
            type: "URL_UPDATED",
          }),
        }
      );

      const result = await response.json();
      // Google may return urlNotificationMetadata.url without latestUpdate.notifyTime
      const hasNotification = result.urlNotificationMetadata?.url || result.urlNotificationMetadata?.latestUpdate?.notifyTime;

      if (response.ok && hasNotification) {
        return { success: true };
      }

      const errorMessage = result.error?.message || 
        (!hasNotification ? "Google did not accept indexation request" : "Unknown error");
      
      // Don't retry on permission/auth errors
      if (response.status === 403 || response.status === 401) {
        return { success: false, error: errorMessage };
      }

      // Retry on transient errors
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff: 1s, 2s
        console.log(`[index] Retry ${attempt + 1} for ${url} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return { success: false, error: errorMessage };
    } catch (err) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return { success: false, error: err instanceof Error ? err.message : "Network error" };
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("[index-published-articles] Starting cron job...");

  try {
    // Step 1: Reset old failed articles (failed more than 6 hours ago) so they can be retried
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: resetData } = await supabase
      .from("published_articles")
      .update({ gsc_indexed: null, gsc_index_error: null })
      .eq("gsc_indexed", false)
      .lt("updated_at", sixHoursAgo)
      .select("id");
    
    if (resetData && resetData.length > 0) {
      console.log(`[index] Reset ${resetData.length} failed articles for retry`);
    }

    // Step 2: Fetch all unindexed published articles (NO 24h filter)
    const { data: articles, error: articlesError } = await supabase
      .from("published_articles")
      .select("id, slug, title, published_at")
      .is("gsc_indexed", null)
      .order("published_at", { ascending: true })
      .limit(50); // Batch size: 50 per cron run (200/day quota, runs every 30min)

    if (articlesError) {
      throw articlesError;
    }

    console.log(`[index] Found ${articles?.length || 0} articles to index`);

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, indexed: 0, message: "No articles to index" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Get OAuth tokens from the primary account
    // Find the user who owns the autopilotgeo.com project
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .or("domain.eq.autopilotgeo.com,website_url.ilike.%autopilotgeo.com%")
      .limit(1)
      .single();

    if (!project?.user_id) {
      throw new Error("Could not find autopilotgeo.com project owner");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", project.user_id)
      .single();

    if (profileError || !profile?.google_refresh_token) {
      throw new Error("Project owner has no Google OAuth tokens");
    }

    // Step 4: Refresh token if needed
    let accessToken = profile.google_oauth_token;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    
    if (!expiresAt || expiresAt < new Date()) {
      console.log("[index] Refreshing Google OAuth token...");
      const refreshed = await refreshGoogleToken(profile.google_refresh_token);
      accessToken = refreshed.accessToken;
      
      await supabase
        .from("profiles")
        .update({
          google_oauth_token: refreshed.accessToken,
          google_token_expires_at: refreshed.expiresAt.toISOString(),
        })
        .eq("id", project.user_id);
    }

    // Step 5: Submit each article to the Indexing API
    let indexedCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      const publishedUrl = `https://autopilotgeo.com/blog/${article.slug}`;
      console.log(`[index] Submitting: ${publishedUrl}`);

      const result = await submitToIndexingAPI(publishedUrl, accessToken!);

      if (result.success) {
        console.log(`[index] ✓ Indexed: ${publishedUrl}`);
        await supabase
          .from("published_articles")
          .update({
            gsc_indexed: true,
            gsc_indexed_at: new Date().toISOString(),
            gsc_index_error: null,
          })
          .eq("id", article.id);
        indexedCount++;
      } else {
        console.error(`[index] ✗ Failed: ${publishedUrl} - ${result.error}`);
        await supabase
          .from("published_articles")
          .update({
            gsc_indexed: false,
            gsc_index_error: result.error || "Unknown error",
          })
          .eq("id", article.id);
        errorCount++;
      }

      // Rate limit: 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[index] Completed: ${indexedCount} indexed, ${errorCount} errors out of ${articles.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        indexed: indexedCount, 
        errors: errorCount,
        total: articles.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[index-published-articles] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
