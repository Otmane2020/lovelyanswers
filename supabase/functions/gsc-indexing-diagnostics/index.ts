import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticResult {
  tokenInfo: {
    valid: boolean;
    clientId?: string;
    scopes?: string[];
    expiresIn?: number;
    error?: string;
  };
  indexingApiTest: {
    status: number;
    success: boolean;
    error?: string;
    errorDetails?: {
      code: number;
      message: string;
      status: string;
      reason?: string;
      domain?: string;
      consumerProject?: string;
      service?: string;
    };
    notifyTime?: string;
  };
  recommendations: string[];
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

// Get token info from Google
async function getTokenInfo(accessToken: string): Promise<DiagnosticResult["tokenInfo"]> {
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
    
    if (!response.ok) {
      const error = await response.text();
      return {
        valid: false,
        error: `Token validation failed: ${error}`,
      };
    }

    const data = await response.json();
    
    return {
      valid: true,
      clientId: data.aud,
      scopes: data.scope ? data.scope.split(" ") : [],
      expiresIn: parseInt(data.expires_in, 10),
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Test Indexing API with a sample URL
async function testIndexingApi(accessToken: string, testUrl: string): Promise<DiagnosticResult["indexingApiTest"]> {
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
          url: testUrl,
          type: "URL_UPDATED",
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const errorDetails: DiagnosticResult["indexingApiTest"]["errorDetails"] = {
        code: result.error?.code || response.status,
        message: result.error?.message || "Unknown error",
        status: result.error?.status || "UNKNOWN",
      };

      // Extract detailed info from Google's error response
      if (result.error?.details) {
        for (const detail of result.error.details) {
          if (detail.violations) {
            for (const violation of detail.violations) {
              if (violation.type) {
                errorDetails.reason = violation.type;
              }
            }
          }
          if (detail.reason) {
            errorDetails.reason = detail.reason;
          }
          if (detail.domain) {
            errorDetails.domain = detail.domain;
          }
          if (detail.metadata) {
            if (detail.metadata.consumer) {
              errorDetails.consumerProject = detail.metadata.consumer;
            }
            if (detail.metadata.service) {
              errorDetails.service = detail.metadata.service;
            }
          }
        }
      }

      return {
        status: response.status,
        success: false,
        error: result.error?.message || "Indexing API error",
        errorDetails,
      };
    }

    return {
      status: response.status,
      success: true,
      notifyTime: result.urlNotificationMetadata?.latestUpdate?.notifyTime,
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Generate recommendations based on diagnostic results
function generateRecommendations(result: Omit<DiagnosticResult, "recommendations">): string[] {
  const recommendations: string[] = [];

  // Token issues
  if (!result.tokenInfo.valid) {
    recommendations.push("🔴 Reconnectez votre compte Google dans la page Intégrations.");
    return recommendations;
  }

  // Check for indexing scope
  const hasIndexingScope = result.tokenInfo.scopes?.some(
    s => s.includes("indexing") || s.includes("webmasters")
  );
  if (!hasIndexingScope) {
    recommendations.push(
      "🔴 Le token n'a pas le scope 'indexing'. Déconnectez et reconnectez Google Search Console."
    );
  }

  // Indexing API issues
  if (!result.indexingApiTest.success) {
    const errorDetails = result.indexingApiTest.errorDetails;
    
    if (errorDetails?.status === "PERMISSION_DENIED") {
      if (errorDetails.reason === "SERVICE_DISABLED") {
        const projectId = errorDetails.consumerProject?.replace("projects/", "") || "inconnu";
        recommendations.push(
          `🔴 L'API "Web Search Indexing" est désactivée pour le projet Google Cloud: ${projectId}`
        );
        recommendations.push(
          `➡️ Activez l'API ici: https://console.cloud.google.com/apis/library/indexing.googleapis.com?project=${projectId}`
        );
        recommendations.push(
          "⏳ Après activation, attendez 5-10 minutes puis retestez."
        );
      } else {
        recommendations.push(
          "🔴 Permission refusée. Vérifiez que vous êtes propriétaire vérifié du site dans Search Console."
        );
      }
    } else if (errorDetails?.message?.includes("quota")) {
      recommendations.push(
        "⚠️ Quota dépassé. Google limite à 200 requêtes/jour par propriété."
      );
    } else {
      recommendations.push(
        `🔴 Erreur API: ${errorDetails?.message || result.indexingApiTest.error}`
      );
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Tout fonctionne correctement!");
  }

  return recommendations;
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

    const { testUrl } = await req.json();

    if (!testUrl) {
      throw new Error("testUrl is required");
    }

    console.log(`[gsc-indexing-diagnostics] Running diagnostics for user ${user.id}`);

    // Get user's OAuth tokens from profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("google_oauth_token, google_refresh_token, google_token_expires_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Profil utilisateur introuvable",
          diagnostic: {
            tokenInfo: { valid: false, error: "No profile found" },
            indexingApiTest: { status: 0, success: false, error: "No profile" },
            recommendations: ["🔴 Reconnectez votre compte Google."],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.google_oauth_token || !profile.google_refresh_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Compte Google non connecté",
          diagnostic: {
            tokenInfo: { valid: false, error: "No Google tokens" },
            indexingApiTest: { status: 0, success: false, error: "No tokens" },
            recommendations: ["🔴 Connectez votre compte Google Search Console."],
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Refresh token if expired
    let accessToken = profile.google_oauth_token;
    const expiresAt = profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null;
    
    if (!expiresAt || expiresAt < new Date()) {
      console.log("[gsc-indexing-diagnostics] Token expired, refreshing...");
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
      } catch (refreshError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Token Google expiré",
            diagnostic: {
              tokenInfo: { valid: false, error: "Token refresh failed" },
              indexingApiTest: { status: 0, success: false, error: "Token expired" },
              recommendations: ["🔴 Reconnectez votre compte Google Search Console."],
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Run diagnostics in parallel
    const [tokenInfo, indexingApiTest] = await Promise.all([
      getTokenInfo(accessToken),
      testIndexingApi(accessToken, testUrl),
    ]);

    const diagnostic: DiagnosticResult = {
      tokenInfo,
      indexingApiTest,
      recommendations: generateRecommendations({ tokenInfo, indexingApiTest }),
    };

    console.log("[gsc-indexing-diagnostics] Diagnostic complete:", JSON.stringify(diagnostic, null, 2));

    return new Response(
      JSON.stringify({
        success: indexingApiTest.success,
        diagnostic,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[gsc-indexing-diagnostics] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
