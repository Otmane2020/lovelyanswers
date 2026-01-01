import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const dataforseoLogin = Deno.env.get("DATAFORSEO_LOGIN");
    const dataforseoPassword = Deno.env.get("DATAFORSEO_PASSWORD");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[ANALYZE-WEBSITE] 🔍 Analyzing URL:", url);

    // Clean URL
    let cleanUrl = url.trim().toLowerCase();
    if (!cleanUrl.startsWith("http")) {
      cleanUrl = `https://${cleanUrl}`;
    }
    
    let domain: string;
    try {
      domain = new URL(cleanUrl).hostname.replace("www.", "");
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let competitors: string[] = [];
    let description = "";
    let brandName = domain.split(".")[0];
    let targetAudiences: string[] = [];

    // Try DataForSEO for competitors
    if (dataforseoLogin && dataforseoPassword) {
      try {
        console.log("[ANALYZE-WEBSITE] 📊 Fetching competitors from DataForSEO...");
        
        const auth = btoa(`${dataforseoLogin}:${dataforseoPassword}`);
        
        const serpResponse = await fetch("https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{
            target: domain,
            location_code: 2250,
            language_code: "fr",
            limit: 5,
          }]),
        });

        if (serpResponse.ok) {
          const serpData = await serpResponse.json();
          if (serpData?.tasks?.[0]?.result?.[0]?.items) {
            competitors = serpData.tasks[0].result[0].items
              .slice(0, 5)
              .map((item: any) => item.domain)
              .filter((d: string) => d !== domain);
            console.log("[ANALYZE-WEBSITE] ✅ Found competitors:", competitors);
          }
        }
      } catch (e) {
        console.error("[ANALYZE-WEBSITE] ⚠️ DataForSEO error:", e);
      }
    }

    // Create basic description
    if (!description) {
      description = `${brandName} est une entreprise offrant des produits et services de qualité.`;
    }

    console.log("[ANALYZE-WEBSITE] ✅ Analysis complete:", {
      domain,
      brandName,
      competitorsCount: competitors.length,
      hasDescription: !!description,
    });

    return new Response(
      JSON.stringify({
        success: true,
        domain,
        brandName,
        description,
        competitors,
        targetAudiences,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ANALYZE-WEBSITE] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
