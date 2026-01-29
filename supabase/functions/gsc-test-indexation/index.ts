import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestIndexRequest {
  url: string;
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

    // Get user's OAuth tokens from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("[gsc-test-indexation] Profile error:", profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "User profile not found. Please reconnect your Google account." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.google_oauth_token || !profile.google_refresh_token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Google account not connected. Please connect your Google Search Console account in the Integrations page." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.google_oauth_token;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    
    if (!expiresAt || expiresAt < new Date()) {
      console.log("[gsc-test-indexation] Token expired, refreshing...");
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
          .eq("id", user.id);

        console.log("[gsc-test-indexation] Token refreshed successfully");
      } catch (refreshError) {
        console.error("[gsc-test-indexation] Token refresh failed:", refreshError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Google token expired. Please reconnect your Google account in the Integrations page." 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("[gsc-test-indexation] Using user OAuth token for indexation");

    // Helper function to call Indexing API with retry
    async function callIndexingApiWithRetry(
      token: string, 
      targetUrl: string, 
      maxRetries = 3
    ): Promise<{ response: Response; result: any }> {
      const delays = [2000, 5000, 10000]; // exponential backoff: 2s, 5s, 10s
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(
          "https://indexing.googleapis.com/v3/urlNotifications:publish",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url: targetUrl,
              type: "URL_UPDATED",
            }),
          }
        );

        const result = await response.json();

        // If success or not a transient error, return immediately
        if (response.ok) {
          return { response, result };
        }

        // Check if it's a SERVICE_DISABLED error (might be propagation delay)
        const isServiceDisabled = result.error?.details?.some(
          (d: any) => d.reason === "SERVICE_DISABLED"
        );

        if (isServiceDisabled && attempt < maxRetries - 1) {
          console.log(`[gsc-test-indexation] SERVICE_DISABLED, retrying in ${delays[attempt]}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delays[attempt]));
          continue;
        }

        // For other errors or final attempt, return the result
        return { response, result };
      }

      // Should never reach here, but TypeScript needs it
      throw new Error("Max retries exceeded");
    }

    // Request indexation via Google Indexing API with retry
    const { response: indexingResponse, result: indexingResult } = await callIndexingApiWithRetry(accessToken, url);

    if (!indexingResponse.ok) {
      console.error("[gsc-test-indexation] API error:", indexingResult);
      let errorMessage = indexingResult.error?.message || "Indexing API error";
      
      // Extract detailed error info for better diagnostics
      const errorDetails: any = {
        code: indexingResult.error?.code,
        status: indexingResult.error?.status,
      };

      // Parse error details from Google's response
      if (indexingResult.error?.details) {
        for (const detail of indexingResult.error.details) {
          if (detail.reason) {
            errorDetails.reason = detail.reason;
          }
          if (detail.metadata?.consumer) {
            errorDetails.consumerProject = detail.metadata.consumer;
          }
          if (detail.metadata?.service) {
            errorDetails.service = detail.metadata.service;
          }
        }
      }
      
      // Provide more helpful error messages
      if (errorDetails.reason === "SERVICE_DISABLED") {
        const projectId = errorDetails.consumerProject?.replace("projects/", "") || "unknown";
        errorMessage = `L'API Indexing est désactivée pour le projet ${projectId}. Activez-la dans Google Cloud Console puis réessayez dans 5 minutes.`;
      } else if (errorMessage.includes("Permission denied") || errorMessage.includes("URL ownership")) {
        errorMessage = "Permission denied. Make sure you are the verified owner of this property in Google Search Console.";
      } else if (errorMessage.includes("quota")) {
        errorMessage = "Daily quota exceeded. Google limits indexation requests to 200/day per property.";
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          errorDetails,
          hint: errorDetails.reason === "SERVICE_DISABLED" 
            ? "Utilisez le bouton 'Diagnostic avancé' pour plus de détails." 
            : undefined
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gsc-test-indexation] Response:", indexingResult);

    // Validate that Google actually accepted the indexation request
    const notifyTime = indexingResult.urlNotificationMetadata?.latestUpdate?.notifyTime;

    if (!notifyTime) {
      console.error("[gsc-test-indexation] No notifyTime - indexation not accepted");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Google a reçu la requête mais n'a pas accepté l'indexation. Vérifiez que vous êtes bien propriétaire vérifié de ce domaine dans Google Search Console.",
          errorDetails: {
            reason: "NO_NOTIFY_TIME",
            receivedData: indexingResult.urlNotificationMetadata
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gsc-test-indexation] Success - notifyTime:", notifyTime);

    return new Response(
      JSON.stringify({
        success: true,
        notifyTime,
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
