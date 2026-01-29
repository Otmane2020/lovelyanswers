import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("[index-published-articles] Starting cron job...");

  try {
    // Find articles published in the last 24h that haven't been indexed yet
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select(`
        id,
        slug,
        status,
        gsc_indexed,
        created_at,
        project_id,
        projects (
          user_id,
          website_url,
          domain
        )
      `)
      .eq("status", "published")
      .is("gsc_indexed", null)
      .gte("created_at", yesterday)
      .limit(50);

    if (articlesError) {
      throw articlesError;
    }

    console.log(`[index-published-articles] Found ${articles?.length || 0} articles to index`);

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ success: true, indexed: 0, message: "No articles to index" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let indexedCount = 0;
    let errorCount = 0;

    for (const article of articles) {
      try {
        // Handle the projects relationship - Supabase returns object for single FK
        const projectData = article.projects as unknown as { user_id: string; website_url: string; domain: string | null } | null;
        
        if (!projectData?.user_id) {
          console.log(`[index-published-articles] Article ${article.id}: No project owner found`);
          continue;
        }

        // Build the published URL from project domain and slug
        let publishedUrl: string | null = null;
        
        if (article.slug && projectData.website_url) {
          try {
            const baseUrl = new URL(projectData.website_url);
            publishedUrl = `${baseUrl.origin}/blog/${article.slug}`;
          } catch {
            publishedUrl = `https://${projectData.domain || projectData.website_url}/blog/${article.slug}`;
          }
        }

        if (!publishedUrl) {
          console.log(`[index-published-articles] Article ${article.id}: Cannot build URL (no slug or website_url)`);
          continue;
        }

        // Get user's OAuth tokens
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("google_oauth_token, google_refresh_token, google_token_expires_at")
          .eq("id", projectData.user_id)
          .single();

        if (profileError || !profile?.google_refresh_token) {
          console.log(`[index-published-articles] Article ${article.id}: User has no Google OAuth tokens`);
          await supabase
            .from("articles")
            .update({ gsc_index_error: "User has no Google account connected" })
            .eq("id", article.id);
          continue;
        }

        // Refresh token if needed
        let accessToken = profile.google_oauth_token;
        const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
        
        if (!expiresAt || expiresAt < new Date()) {
          console.log(`[index-published-articles] Refreshing token for user ${projectData.user_id}`);
          try {
            const refreshed = await refreshGoogleToken(profile.google_refresh_token);
            accessToken = refreshed.accessToken;
            
            await supabase
              .from("profiles")
              .update({
                google_oauth_token: refreshed.accessToken,
                google_token_expires_at: refreshed.expiresAt.toISOString(),
              })
              .eq("id", projectData.user_id);
          } catch (refreshError) {
            console.error(`[index-published-articles] Token refresh failed:`, refreshError);
            await supabase
              .from("articles")
              .update({ gsc_index_error: "Google token expired" })
              .eq("id", article.id);
            errorCount++;
            continue;
          }
        }

        // Request indexation
        console.log(`[index-published-articles] Indexing: ${publishedUrl}`);
        
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
        
        // Check for valid notifyTime (real indexation acceptance)
        const notifyTime = indexingResult.urlNotificationMetadata?.latestUpdate?.notifyTime;

        if (indexingResponse.ok && notifyTime) {
          console.log(`[index-published-articles] ✓ Indexed: ${publishedUrl}`);
          await supabase
            .from("articles")
            .update({
              gsc_indexed: true,
              gsc_indexed_at: new Date().toISOString(),
              gsc_index_error: null,
            })
            .eq("id", article.id);
          indexedCount++;
        } else {
          const errorMessage = indexingResult.error?.message || 
            (!notifyTime ? "Google did not accept indexation request" : "Unknown error");
          
          console.error(`[index-published-articles] ✗ Failed: ${publishedUrl} - ${errorMessage}`);
          await supabase
            .from("articles")
            .update({
              gsc_indexed: false,
              gsc_index_error: errorMessage,
            })
            .eq("id", article.id);
          errorCount++;
        }

        // Rate limit: wait 500ms between requests
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (articleError) {
        console.error(`[index-published-articles] Error processing article ${article.id}:`, articleError);
        errorCount++;
      }
    }

    console.log(`[index-published-articles] Completed: ${indexedCount} indexed, ${errorCount} errors`);

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
