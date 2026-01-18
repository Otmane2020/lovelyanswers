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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

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
    let keywords: string[] = [];

    // Step 1: Fetch website content to extract description and keywords
    console.log("[ANALYZE-WEBSITE] 📄 Fetching website content...");
    try {
      const siteResponse = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; AEOBot/1.0)",
        },
      });
      
      if (siteResponse.ok) {
        const html = await siteResponse.text();
        
        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        if (descMatch) {
          description = descMatch[1].trim();
          console.log("[ANALYZE-WEBSITE] 📝 Found meta description:", description.substring(0, 100) + "...");
        }
        
        // Extract meta keywords
        const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i) ||
                             html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']keywords["']/i);
        if (keywordsMatch) {
          keywords = keywordsMatch[1].split(",").map(k => k.trim()).filter(k => k.length > 0);
          console.log("[ANALYZE-WEBSITE] 🏷️ Found meta keywords:", keywords);
        }
        
        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          const title = titleMatch[1].trim();
          console.log("[ANALYZE-WEBSITE] 📌 Found title:", title);
          // Use title to enhance brand name if needed
          if (title && !brandName) {
            brandName = title.split(/[-|–]/)[0].trim();
          }
        }

        // Extract H1 for additional context
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) {
          console.log("[ANALYZE-WEBSITE] 📌 Found H1:", h1Match[1].trim());
        }
      }
    } catch (e) {
      console.error("[ANALYZE-WEBSITE] ⚠️ Error fetching website:", e);
    }

    // Step 2: Use AI to analyze the site and find competitors based on description/keywords
    if (openaiApiKey && (description || keywords.length > 0)) {
      try {
        console.log("[ANALYZE-WEBSITE] 🤖 Using AI to find competitors based on content...");
        
        const prompt = `Analyse ce site web et trouve ses 5 principaux concurrents directs.

Site: ${domain}
${description ? `Description: ${description}` : ''}
${keywords.length > 0 ? `Mots-clés: ${keywords.join(", ")}` : ''}

Basé sur ces informations, identifie les 5 principaux sites web concurrents qui:
1. Offrent des produits/services similaires
2. Ciblent la même audience
3. Opèrent sur le même marché

IMPORTANT: 
- Retourne UNIQUEMENT les noms de domaine (ex: amazon.fr, cdiscount.com)
- Ne retourne PAS le site analysé lui-même
- Concentre-toi sur des concurrents réels et existants
- Privilégie les concurrents français si le site est français

Réponds UNIQUEMENT avec un JSON array de domaines, sans explication:
["concurrent1.com", "concurrent2.fr", "concurrent3.com"]`;

        const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Tu es un expert en analyse de marché et en identification de concurrents. Tu réponds uniquement avec du JSON valide." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content?.trim() || "";
          console.log("[ANALYZE-WEBSITE] 🤖 AI response:", content);
          
          try {
            // Parse JSON response
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const parsedCompetitors = JSON.parse(jsonMatch[0]);
              if (Array.isArray(parsedCompetitors)) {
                competitors = parsedCompetitors
                  .filter((c: string) => c && typeof c === "string" && !c.includes(domain))
                  .slice(0, 5);
                console.log("[ANALYZE-WEBSITE] ✅ AI found competitors:", competitors);
              }
            }
          } catch (parseError) {
            console.error("[ANALYZE-WEBSITE] ⚠️ Error parsing AI response:", parseError);
          }
        }
      } catch (e) {
        console.error("[ANALYZE-WEBSITE] ⚠️ AI analysis error:", e);
      }
    }

    // Step 3: Fallback to DataForSEO if AI didn't find competitors
    if (competitors.length === 0 && dataforseoLogin && dataforseoPassword) {
      try {
        console.log("[ANALYZE-WEBSITE] 📊 Fallback: Fetching competitors from DataForSEO...");
        
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
            console.log("[ANALYZE-WEBSITE] ✅ DataForSEO found competitors:", competitors);
          }
        }
      } catch (e) {
        console.error("[ANALYZE-WEBSITE] ⚠️ DataForSEO error:", e);
      }
    }

    // Create description if still empty
    if (!description) {
      description = `${brandName} est une entreprise offrant des produits et services de qualité.`;
    }

    // Try to infer target audiences from description and keywords
    if (targetAudiences.length === 0 && openaiApiKey && description) {
      try {
        const audiencePrompt = `Basé sur cette description de site web, identifie 3 audiences cibles principales (en français, maximum 5 mots chacune):

Description: ${description}
${keywords.length > 0 ? `Mots-clés: ${keywords.join(", ")}` : ''}

Réponds UNIQUEMENT avec un JSON array:
["audience1", "audience2", "audience3"]`;

        const audienceResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Tu identifies les audiences cibles. Réponds uniquement avec du JSON valide." },
              { role: "user", content: audiencePrompt }
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        });

        if (audienceResponse.ok) {
          const audienceData = await audienceResponse.json();
          const audienceContent = audienceData.choices?.[0]?.message?.content?.trim() || "";
          const jsonMatch = audienceContent.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsedAudiences = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsedAudiences)) {
              targetAudiences = parsedAudiences.slice(0, 3);
              console.log("[ANALYZE-WEBSITE] ✅ Found target audiences:", targetAudiences);
            }
          }
        }
      } catch (e) {
        console.error("[ANALYZE-WEBSITE] ⚠️ Error finding audiences:", e);
      }
    }

    console.log("[ANALYZE-WEBSITE] ✅ Analysis complete:", {
      domain,
      brandName,
      competitorsCount: competitors.length,
      hasDescription: !!description,
      keywordsCount: keywords.length,
      audiencesCount: targetAudiences.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        domain,
        brandName,
        description,
        competitors,
        targetAudiences,
        keywords,
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