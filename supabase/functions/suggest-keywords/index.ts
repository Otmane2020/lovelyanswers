import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface KeywordSuggestion {
  keyword: string;
  intent: "informational" | "transactional" | "navigational" | "commercial";
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
      .select("name, business_description, website_url, audience")
      .eq("id", projectId)
      .single();

    const { data: genSettings } = await supabase
      .from("generation_settings")
      .select("business_description, target_audiences, language")
      .eq("project_id", projectId)
      .single();

    const businessContext = genSettings?.business_description || project?.business_description || "";
    const audiences = genSettings?.target_audiences || [];
    const language = genSettings?.language || "en";

    const prompt = `You are an SEO expert. Suggest 8-12 long-tail keywords for this business.

Business: ${project?.name || "Unknown"}
Website: ${project?.website_url || ""}
Description: ${businessContext}
Target Audiences: ${audiences.join(", ") || "General"}
Content Language: ${language}

${existingKeywords?.length > 0 ? `Already have these keywords (do NOT repeat): ${existingKeywords.slice(0, 30).join(", ")}` : ""}

For each keyword, determine its search intent:
- informational: User wants to learn (how to, what is, guide)
- transactional: User wants to buy/sign up (buy, price, discount)
- commercial: User is researching options (best, vs, review, comparison)
- navigational: User looking for specific page/brand

Return ONLY a JSON array of objects with "keyword" and "intent" properties.
Keywords should be in ${language === "fr" ? "French" : language === "en" ? "English" : language}.
Focus on long-tail keywords (3-6 words) with clear search intent.

Example format:
[
  {"keyword": "how to improve website SEO", "intent": "informational"},
  {"keyword": "best SEO tools for small business", "intent": "commercial"}
]

Return ONLY the JSON array.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an SEO keyword research expert. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
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
