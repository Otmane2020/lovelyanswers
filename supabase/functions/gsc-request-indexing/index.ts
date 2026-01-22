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

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Create a JWT signed with the service account's private key
async function createServiceAccountJWT(
  serviceAccount: ServiceAccountKey,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600; // 1 hour expiry

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: exp,
  };

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key and sign
  const privateKey = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${unsignedToken}.${signatureB64}`;
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers and decode
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

// Get access token using service account JWT
async function getServiceAccountAccessToken(
  serviceAccount: ServiceAccountKey
): Promise<string> {
  const jwt = await createServiceAccountJWT(serviceAccount, [
    "https://www.googleapis.com/auth/indexing",
  ]);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { articleId, publishedUrl }: IndexingRequest = await req.json();

    if (!articleId || !publishedUrl) {
      throw new Error("Article ID and published URL are required");
    }

    console.log(`[gsc-indexing] Requesting indexation for: ${publishedUrl}`);

    // Get the service account key from secrets
    const serviceAccountKeyJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    
    if (!serviceAccountKeyJson) {
      await supabase
        .from("articles")
        .update({
          gsc_indexed: null,
          gsc_index_error: "Google Service Account not configured",
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: "Google Service Account not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let serviceAccount: ServiceAccountKey;
    try {
      serviceAccount = JSON.parse(serviceAccountKeyJson);
    } catch (parseError) {
      console.error("[gsc-indexing] JSON parse error:", parseError);
      console.error("[gsc-indexing] Key length:", serviceAccountKeyJson?.length);
      
      const errorMsg = `Invalid service account key format: ${parseError instanceof Error ? parseError.message : 'JSON parse failed'}`;
      
      await supabase
        .from("articles")
        .update({
          gsc_indexed: false,
          gsc_index_error: errorMsg,
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate required fields
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error("[gsc-indexing] Missing required fields:", {
        hasClientEmail: !!serviceAccount.client_email,
        hasPrivateKey: !!serviceAccount.private_key,
      });
      
      const errorMsg = `Service account key missing required fields. Has client_email: ${!!serviceAccount.client_email}, Has private_key: ${!!serviceAccount.private_key}`;
      
      await supabase
        .from("articles")
        .update({
          gsc_indexed: false,
          gsc_index_error: errorMsg,
        })
        .eq("id", articleId);

      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gsc-indexing] Service account parsed successfully:", serviceAccount.client_email);

    // Get access token using service account
    const accessToken = await getServiceAccountAccessToken(serviceAccount);

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
