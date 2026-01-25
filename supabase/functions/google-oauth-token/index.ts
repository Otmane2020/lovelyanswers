import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isValidRedirectUri(uri: string) {
  try {
    const u = new URL(uri);
    return ["https:", "http:"].includes(u.protocol);
  } catch {
    return false;
  }
}

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
    const body = await req.json();
    const code = body.code;
    // Backward compatibility:
    // older clients sent redirectUri in `state` (incorrectly). New clients send `redirectUri`.
    const redirectUri =
      body.redirectUri || (typeof body.state === "string" && isValidRedirectUri(body.state) ? body.state : null);

    if (!code || !redirectUri) {
      return new Response(
        JSON.stringify({
          error: !code ? "Authorization code is required" : "redirectUri is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Google OAuth not configured" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to exchange code for tokens",
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenResponse.json();

    // Get user's email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    let googleEmail = null;
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      googleEmail = userInfo.email;
    }

    // Store tokens in profile using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const now = new Date().toISOString();

    // Build update payload.
    // Important: Google may omit refresh_token on subsequent authorizations.
    // In that case we MUST NOT overwrite a previously stored refresh token.
    const updatePayload: Record<string, unknown> = {
      google_oauth_token: tokenData.access_token,
      google_token_expires_at: expiresAt,
      google_console_email: googleEmail,
      updated_at: now,
    };
    if (tokenData.refresh_token) {
      updatePayload.google_refresh_token = tokenData.refresh_token;
    }

    // First try to update existing profile
    const { data: updatedRows, error: updateError } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select("id");

    if (updateError) {
      console.error("Profile update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save tokens" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no profile row exists, create it
    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await adminClient
        .from("profiles")
        .insert({
          id: userId,
          google_oauth_token: tokenData.access_token,
          google_refresh_token: tokenData.refresh_token || null,
          google_token_expires_at: expiresAt,
          google_console_email: googleEmail,
          created_at: now,
          updated_at: now,
        });

      if (insertError) {
        console.error("Profile insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to save tokens" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ success: true, email: googleEmail }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
