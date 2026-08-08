import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId } = await req.json();

    // Get GMB integration for this project
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("*")
      .eq("project_id", projectId)
      .eq("platform", "google_business")
      .single();

    if (intError || !integration?.config?.access_token) {
      return new Response(
        JSON.stringify({ error: "GMB not connected", business: null, locations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unlike get-search-console-data / list-search-console-sites, this
    // function used to send integration.config.access_token straight to
    // Google with no expiry check — any token older than ~1h just 401'd
    // with a generic "Failed to fetch GMB accounts" instead of refreshing.
    let accessToken = integration.config.access_token as string;
    const expiresAt = integration.config.token_expires_at
      ? new Date(integration.config.token_expires_at).getTime()
      : 0;
    const refreshToken = integration.config.refresh_token as string | undefined;

    if (expiresAt && expiresAt < Date.now() + 60_000) {
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ error: "GMB token expired and no refresh token stored", needsReconnect: true, business: null, locations: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
      const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
      const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId ?? "",
          client_secret: clientSecret ?? "",
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      if (!refreshRes.ok) {
        console.error("GMB token refresh failed:", await refreshRes.text());
        await supabase.from("integrations").update({ is_connected: false }).eq("id", integration.id);
        return new Response(
          JSON.stringify({ error: "GMB token refresh failed", needsReconnect: true, business: null, locations: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const refreshed = await refreshRes.json();
      accessToken = refreshed.access_token;
      await supabase
        .from("integrations")
        .update({
          config: {
            ...integration.config,
            access_token: accessToken,
            token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", integration.id);
    }

    // Fetch accounts from Google Business Profile API
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      console.error("GMB accounts error:", errorText);
      throw new Error("Failed to fetch GMB accounts");
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    if (accounts.length === 0) {
      return new Response(
        JSON.stringify({ business: null, locations: [], error: "No GMB account found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch locations from ALL accounts
    const allLocations: any[] = [];

    for (const account of accounts) {
      try {
        const locationsResponse = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          if (locationsData.locations) {
            allLocations.push(...locationsData.locations);
          }
        }
      } catch (err) {
        console.error(`Error fetching locations for ${account.name}:`, err);
      }
    }

    if (allLocations.length === 0) {
      return new Response(
        JSON.stringify({ business: null, locations: [], error: "No business location found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format ALL locations
    const locations = allLocations.map((location) => ({
      id: location.name,
      name: location.title || location.locationName,
      address: formatAddress(location.address),
      phone: location.phoneNumbers?.primaryPhone || "",
      website: location.websiteUri || "",
      rating: location.metadata?.rating || 0,
      reviewCount: location.metadata?.reviewCount || 0,
    }));

    // Return first location as "business" for backward compat, plus all locations
    const selectedIds: string[] = integration.config.selected_locations || [];

    return new Response(
      JSON.stringify({ 
        business: locations[0], 
        locations,
        selectedLocationIds: selectedIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching business:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatAddress(address: any): string {
  if (!address) return "";
  const parts = [
    address.addressLines?.join(", "),
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.regionCode,
  ].filter(Boolean);
  return parts.join(", ");
}
