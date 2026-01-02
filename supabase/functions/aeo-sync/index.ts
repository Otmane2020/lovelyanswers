import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-aeo-secret",
};

interface AEOPayload {
  slug: string;
  question: string;
  answer: string;
  bullets?: string[];
  faq?: { q: string; a: string }[];
  brand: string;
  project_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Security: Verify AEO secret
    const aeoSecret = req.headers.get("x-aeo-secret");
    const expectedSecret = Deno.env.get("AEO_SYNC_SECRET");
    
    if (!expectedSecret) {
      console.error("AEO_SYNC_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (aeoSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AEOPayload = await req.json();

    // Validate required fields
    if (!body.slug || !body.question || !body.answer) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: slug, question, answer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare supporting_content from bullets and faq
    const supportingContent = {
      bullets: body.bullets || [],
      faq: body.faq || [],
      brand: body.brand,
    };

    // Check if answer exists
    const { data: existingAnswer } = await supabase
      .from("answers")
      .select("id, project_id")
      .eq("slug", body.slug)
      .single();

    if (existingAnswer) {
      // Update existing answer
      const { error: updateError } = await supabase
        .from("answers")
        .update({
          question: body.question,
          answer: body.answer,
          supporting_content: supportingContent,
          updated_at: new Date().toISOString(),
          is_public: true,
        })
        .eq("id", existingAnswer.id);

      if (updateError) {
        console.error("Update error:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update answer" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, action: "updated", id: existingAnswer.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For new answers, we need a project_id
    if (!body.project_id) {
      return new Response(
        JSON.stringify({ error: "project_id required for new answers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert new answer
    const { data: newAnswer, error: insertError } = await supabase
      .from("answers")
      .insert({
        slug: body.slug,
        question: body.question,
        answer: body.answer,
        project_id: body.project_id,
        supporting_content: supportingContent,
        is_public: true,
        score: 85, // Default high score for external sync
        platforms: ["chatgpt", "perplexity", "gemini"],
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create answer" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, action: "created", id: newAnswer.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AEO Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
