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

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { projectId, question, businessName, location, businessContext } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get project details for additional context
    let projectContext = "";
    let language = "en";
    
    if (projectId) {
      const { data: project } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      const { data: settings } = await supabase
        .from("generation_settings")
        .select("*")
        .eq("project_id", projectId)
        .single();

      projectContext = settings?.business_description || project?.business_description || "";
      language = settings?.language || project?.language || "en";
    }

    // Build rich context from Places API data
    const contextParts = [];
    
    if (businessContext?.rating) {
      contextParts.push(`Rating: ${businessContext.rating}/5 (${businessContext.reviewCount} reviews)`);
    }
    if (businessContext?.types?.length > 0) {
      contextParts.push(`Business Type: ${businessContext.types.slice(0, 3).join(", ")}`);
    }
    if (businessContext?.phone) {
      contextParts.push(`Phone: ${businessContext.phone}`);
    }
    if (businessContext?.website) {
      contextParts.push(`Website: ${businessContext.website}`);
    }
    if (businessContext?.openingHours?.length > 0) {
      contextParts.push(`Hours: ${businessContext.openingHours.join("; ")}`);
    }
    if (businessContext?.reviews?.length > 0) {
      const reviewTexts = businessContext.reviews
        .slice(0, 3)
        .map((r: any) => `"${r.text.substring(0, 100)}..."`)
        .join(" | ");
      contextParts.push(`Customer Feedback: ${reviewTexts}`);
    }

    const prompt = `You are an expert at creating locally-optimized answers for businesses that rank well in AI search results.

Business Name: ${businessName || "Local Business"}
Location: ${location || "Local area"}
${contextParts.length > 0 ? `\nBusiness Details:\n${contextParts.join("\n")}` : ""}
${projectContext ? `\nAdditional Context: ${projectContext}` : ""}

Question: "${question}"

Create a concise, locally-optimized answer in ${language === "fr" ? "French" : "English"} that:
1. Directly answers the question with specific, factual information
2. Includes the business name and location naturally
3. Uses concrete details (hours, contact info, ratings) when relevant to the question
4. Is optimized for AI assistants (ChatGPT, Gemini, Claude, Perplexity)
5. Sounds natural and helpful, not robotic or promotional
6. Is between 80-150 words for optimal citation

Return ONLY the answer text, no additional formatting, labels, or quotes.`;

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({
        answer: answer.trim(),
        question,
        businessName,
        location,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating local answer:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
