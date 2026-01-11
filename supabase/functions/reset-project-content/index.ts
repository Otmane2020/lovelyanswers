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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId, newUrl } = await req.json();

    if (!projectId || !newUrl) {
      return new Response(JSON.stringify({ error: "Missing projectId or newUrl" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user owns this project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, name")
      .eq("id", projectId)
      .single();

    if (projectError || !project || project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Project not found or unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[reset-project-content] Resetting content for project ${projectId}, new URL: ${newUrl}`);

    // First, remove article references from answers to avoid FK constraint
    const { error: unlinkError } = await supabase
      .from("answers")
      .update({ article_id: null, has_article: false })
      .eq("project_id", projectId);

    if (unlinkError) {
      console.error("[reset-project-content] Failed to unlink articles from answers:", unlinkError);
    }

    // Delete planning entries first (they reference answers and articles)
    const { error: planningError } = await supabase
      .from("planning")
      .delete()
      .eq("project_id", projectId);

    if (planningError) {
      console.error("[reset-project-content] Failed to delete planning:", planningError);
    }

    // Delete reddit responses (they reference answers)
    const { error: redditError } = await supabase
      .from("reddit_responses")
      .delete()
      .eq("project_id", projectId);

    if (redditError) {
      console.error("[reset-project-content] Failed to delete reddit responses:", redditError);
    }

    // Delete articles
    const { error: articlesError } = await supabase
      .from("articles")
      .delete()
      .eq("project_id", projectId);

    if (articlesError) {
      console.error("[reset-project-content] Failed to delete articles:", articlesError);
    }

    // Delete answers
    const { error: answersError } = await supabase
      .from("answers")
      .delete()
      .eq("project_id", projectId);

    if (answersError) {
      console.error("[reset-project-content] Failed to delete answers:", answersError);
    }

    // Delete keywords
    const { error: keywordsError } = await supabase
      .from("keywords")
      .delete()
      .eq("project_id", projectId);

    if (keywordsError) {
      console.error("[reset-project-content] Failed to delete keywords:", keywordsError);
    }

    // Delete site pages
    const { error: pagesError } = await supabase
      .from("site_pages")
      .delete()
      .eq("project_id", projectId);

    if (pagesError) {
      console.error("[reset-project-content] Failed to delete site pages:", pagesError);
    }

    // Update the project URL
    const { error: updateError } = await supabase
      .from("projects")
      .update({ 
        website_url: newUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("[reset-project-content] Failed to update project:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[reset-project-content] Project content deleted and URL updated`);

    // Now trigger the 30-day content generation
    const generateUrl = `${supabaseUrl}/functions/v1/generate-30-days-content`;
    
    console.log(`[reset-project-content] Calling generate-30-days-content...`);
    
    const generateResponse = await fetch(generateUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId }),
    });

    const generateResult = await generateResponse.json();
    
    if (!generateResponse.ok) {
      console.error("[reset-project-content] Generation failed:", generateResult);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "URL updated but generation failed",
        generationError: generateResult 
      }), {
        status: 200, // Still success because URL was updated
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[reset-project-content] Generation started successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Project reset and 30-day content generation started",
      generation: generateResult
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[reset-project-content] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
