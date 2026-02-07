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
    const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY");

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

    // Step 1: Fetch and analyze FULL website content
    console.log("[ANALYZE-WEBSITE] 📄 Fetching full website content...");
    let pageContent = "";
    let allHeadings: string[] = [];
    let allLinks: string[] = [];
    
    try {
      const siteResponse = await fetch(cleanUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
      });
      
      if (siteResponse.ok) {
        const html = await siteResponse.text();
        console.log("[ANALYZE-WEBSITE] 📄 Fetched HTML:", html.length, "chars");
        
        // Extract meta description
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
        if (descMatch) {
          description = descMatch[1].trim();
          console.log("[ANALYZE-WEBSITE] 📝 Found meta description:", description.substring(0, 100) + "...");
        }
        
        // Extract meta keywords (if any)
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
          if (title && !brandName) {
            brandName = title.split(/[-|–]/)[0].trim();
          }
          pageContent += `Titre: ${title}\n`;
        }

        // Extract ALL headings (H1, H2, H3)
        const h1Matches = html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
        for (const match of h1Matches) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text) {
            allHeadings.push(text);
            pageContent += `H1: ${text}\n`;
          }
        }
        
        const h2Matches = html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi);
        for (const match of h2Matches) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text) {
            allHeadings.push(text);
            pageContent += `H2: ${text}\n`;
          }
        }
        
        const h3Matches = html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi);
        for (const match of h3Matches) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text) allHeadings.push(text);
        }
        
        console.log("[ANALYZE-WEBSITE] 📌 Found", allHeadings.length, "headings");

        // Extract paragraphs
        const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
        let paragraphCount = 0;
        for (const match of pMatches) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text && text.length > 20) {
            pageContent += `${text}\n`;
            paragraphCount++;
            if (paragraphCount >= 20) break; // Limit to avoid too much content
          }
        }
        console.log("[ANALYZE-WEBSITE] 📄 Extracted", paragraphCount, "paragraphs");

        // Extract list items
        const liMatches = html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi);
        let liCount = 0;
        for (const match of liMatches) {
          const text = match[1].replace(/<[^>]+>/g, '').trim();
          if (text && text.length > 10) {
            pageContent += `- ${text}\n`;
            liCount++;
            if (liCount >= 30) break;
          }
        }

        // Extract navigation/menu links for context
        const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
        for (const match of linkMatches) {
          const href = match[1];
          const text = match[2].replace(/<[^>]+>/g, '').trim();
          if (text && text.length > 2 && text.length < 50 && !href.startsWith('#') && !href.startsWith('javascript:')) {
            allLinks.push(text);
          }
        }
        console.log("[ANALYZE-WEBSITE] 🔗 Found", allLinks.length, "link texts");
        
        // Add unique link texts to content
        const uniqueLinks = [...new Set(allLinks)].slice(0, 20);
        if (uniqueLinks.length > 0) {
          pageContent += `\nLiens de navigation: ${uniqueLinks.join(", ")}\n`;
        }
      }
    } catch (e) {
      console.error("[ANALYZE-WEBSITE] ⚠️ Error fetching website:", e);
    }

    console.log("[ANALYZE-WEBSITE] 📄 Total page content extracted:", pageContent.length, "chars");

    // Step 2: Use AI to analyze the FULL page content and find competitors + keywords
    if (openrouterApiKey && pageContent.length > 50) {
      try {
        console.log("[ANALYZE-WEBSITE] 🤖 Using AI to analyze full page content...");
        
        // Truncate content if too long
        const contentForAI = pageContent.substring(0, 8000);
        
        const analysisPrompt = `Analyse ce contenu de page d'accueil et extrais les informations suivantes:

CONTENU DU SITE (${domain}):
${contentForAI}

${description ? `META DESCRIPTION: ${description}` : ''}

TÂCHES:
1. CONCURRENTS: Identifie 5 sites web concurrents directs français qui:
   - Offrent des produits/services similaires
   - Ciblent la même audience
   - Sont des acteurs majeurs sur le même marché

2. KEYWORDS: Extrais 15-20 mots-clés SEO pertinents basés sur:
   - Les titres et headings de la page
   - Les services/produits mentionnés
   - Les termes métier utilisés
   - Les questions que les utilisateurs pourraient poser

3. DESCRIPTION: Résume l'activité de ce site en 2-3 phrases.

4. AUDIENCES: Identifie 3 audiences cibles principales.

IMPORTANT:
- Pour les concurrents: retourne UNIQUEMENT des domaines réels (ex: leboncoin.fr, vinted.fr)
- Pour les keywords: focus sur des termes de recherche que les gens utiliseraient vraiment
- NE retourne PAS le site analysé lui-même dans les concurrents

Réponds UNIQUEMENT avec ce JSON (pas d'explication):
{
  "competitors": ["domaine1.fr", "domaine2.com"],
  "keywords": [{"keyword": "mot clé 1", "intent": "informational"}, {"keyword": "mot clé 2", "intent": "transactional"}],
  "description": "Description du site...",
  "audiences": ["audience 1", "audience 2", "audience 3"]
}`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un expert SEO et en analyse de marché. Tu analyses le contenu des sites web pour extraire des informations stratégiques. Tu réponds uniquement avec du JSON valide." },
              { role: "user", content: analysisPrompt }
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content?.trim() || "";
          console.log("[ANALYZE-WEBSITE] 🤖 AI analysis response:", content.substring(0, 500) + "...");
          
          try {
            // Parse JSON response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              // Extract competitors
              if (Array.isArray(parsed.competitors)) {
                competitors = parsed.competitors
                  .filter((c: string) => c && typeof c === "string" && !c.includes(domain))
                  .slice(0, 5);
                console.log("[ANALYZE-WEBSITE] ✅ AI found competitors:", competitors);
              }
              
              // Extract keywords
              if (Array.isArray(parsed.keywords)) {
                keywords = parsed.keywords.map((k: any) => {
                  if (typeof k === 'string') return { keyword: k, intent: 'informational' };
                  return { keyword: k.keyword, intent: k.intent || 'informational' };
                }).slice(0, 20);
                console.log("[ANALYZE-WEBSITE] ✅ AI found", keywords.length, "keywords");
              }
              
              // Extract description if better than meta
              if (parsed.description && (!description || description.length < 50)) {
                description = parsed.description;
                console.log("[ANALYZE-WEBSITE] ✅ AI generated description");
              }
              
              // Extract audiences
              if (Array.isArray(parsed.audiences)) {
                targetAudiences = parsed.audiences.slice(0, 3);
                console.log("[ANALYZE-WEBSITE] ✅ AI found audiences:", targetAudiences);
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

    // Step 2b: Fallback - Use simpler AI call if main analysis failed
    if (competitors.length === 0 && openrouterApiKey && (description || allHeadings.length > 0)) {
      try {
        console.log("[ANALYZE-WEBSITE] 🤖 Fallback: Simple competitor search...");
        
        const prompt = `Trouve 5 concurrents français pour ce site:
Site: ${domain}
${description ? `Description: ${description}` : ''}
${allHeadings.length > 0 ? `Contenu: ${allHeadings.slice(0, 5).join(", ")}` : ''}

Réponds UNIQUEMENT avec un JSON array de domaines:
["concurrent1.com", "concurrent2.fr"]`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Tu es un expert en analyse de marché et en identification de concurrents. Tu réponds uniquement avec du JSON valide." },
              { role: "user", content: prompt }
            ],
            temperature: 0.3,
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

    // Audiences already extracted in main AI call, skip if we have them
    // (legacy fallback removed to avoid duplicate API calls)

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