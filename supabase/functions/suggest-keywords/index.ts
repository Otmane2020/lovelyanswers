import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface KeywordSuggestion {
  keyword: string;
  intent: "informational" | "transactional" | "navigational" | "commercial";
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    console.log("[suggest-keywords] Fetching website content:", url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) return "";

    const html = await res.text();
    let content = "";

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) content += `Titre: ${titleMatch[1].trim()}\n`;

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (descMatch) content += `Description: ${descMatch[1].trim()}\n`;

    // Extract headings
    const headingRegexes = [
      /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
      /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
      /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
    ];
    for (const regex of headingRegexes) {
      const matches = html.matchAll(regex);
      for (const match of matches) {
        const text = match[1].replace(/<[^>]+>/g, "").trim();
        if (text && text.length > 2) content += `${text}\n`;
      }
    }

    // Extract paragraphs
    const pMatches = html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    let pCount = 0;
    for (const match of pMatches) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text && text.length > 20) {
        content += `${text}\n`;
        pCount++;
        if (pCount >= 15) break;
      }
    }

    // Extract nav links text
    const linkTexts: string[] = [];
    const linkMatches = html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi);
    for (const match of linkMatches) {
      const text = match[1].replace(/<[^>]+>/g, "").trim();
      if (text && text.length > 2 && text.length < 40) linkTexts.push(text);
    }
    const uniqueLinks = [...new Set(linkTexts)].slice(0, 20);
    if (uniqueLinks.length > 0) content += `\nNavigation: ${uniqueLinks.join(", ")}\n`;

    console.log("[suggest-keywords] Scraped", content.length, "chars from website");
    return content.substring(0, 6000);
  } catch (e) {
    console.error("[suggest-keywords] Error fetching website:", e);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, existingKeywords } = await req.json();

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get project context
    const { data: project } = await supabase
      .from("projects")
      .select("name, business_description, website_url, audience, language")
      .eq("id", projectId)
      .single();

    const { data: genSettings } = await supabase
      .from("generation_settings")
      .select("business_description, target_audiences, language")
      .eq("project_id", projectId)
      .single();

    const businessContext = genSettings?.business_description || project?.business_description || "";
    const audiences = genSettings?.target_audiences || [];
    const language = genSettings?.language || project?.language || "en";
    const websiteUrl = project?.website_url || "";

    // Fetch actual website content for better context
    let websiteContent = "";
    if (websiteUrl) {
      websiteContent = await fetchWebsiteContent(websiteUrl);
    }

    const prompt = `Tu es un expert SEO. Suggère 10-15 mots-clés longue traîne pertinents pour ce site.

Site: ${project?.name || "Unknown"}
URL: ${websiteUrl}
Description: ${businessContext}
Audiences cibles: ${audiences.join(", ") || "Général"}
Langue du contenu: ${language}

${websiteContent ? `CONTENU RÉEL DU SITE WEB:
${websiteContent}` : ""}

${existingKeywords?.length > 0 ? `Mots-clés déjà existants (NE PAS répéter): ${existingKeywords.slice(0, 30).join(", ")}` : ""}

INSTRUCTIONS:
- Génère des mots-clés basés sur le CONTENU RÉEL du site web ci-dessus
- Focus sur les produits, services et catégories réellement présents sur le site
- Mots-clés en ${language === "fr" ? "français" : language === "en" ? "anglais" : language}
- Focus sur des mots-clés longue traîne (3-6 mots) avec une intention de recherche claire
- Inclus des questions que les utilisateurs poseraient réellement

Pour chaque mot-clé, détermine l'intention:
- informational: L'utilisateur veut apprendre (comment, qu'est-ce que, guide)
- transactional: L'utilisateur veut acheter/s'inscrire (acheter, prix, pas cher)
- commercial: L'utilisateur compare les options (meilleur, vs, avis, comparatif)
- navigational: L'utilisateur cherche une page/marque spécifique

Retourne UNIQUEMENT un JSON array:
[
  {"keyword": "mot clé pertinent", "intent": "informational"},
  {"keyword": "autre mot clé", "intent": "transactional"}
]`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un expert en recherche de mots-clés SEO. Tu analyses le contenu réel des sites web pour proposer des mots-clés pertinents. Retourne uniquement du JSON valide." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[suggest-keywords] AI error:", errorText);
      throw new Error("AI service error");
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";

    // Parse JSON from response
    let suggestions: KeywordSuggestion[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("[suggest-keywords] JSON parse error:", e);
      suggestions = [];
    }

    // Filter out existing keywords
    const existingLower = (existingKeywords || []).map((k: string) => k.toLowerCase());
    const newSuggestions = suggestions.filter(
      (s) => !existingLower.includes(s.keyword.toLowerCase())
    );

    console.log(`[suggest-keywords] Returning ${newSuggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions: newSuggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[suggest-keywords] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
