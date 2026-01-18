import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the project belongs to the user
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized to modify this project" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-project-content] Deleting content for project: ${projectId}`);

    // First, remove article references from answers to avoid FK constraint
    const { error: unlinkError } = await supabase
      .from("answers")
      .update({ article_id: null, has_article: false })
      .eq("project_id", projectId);

    if (unlinkError) {
      console.error("[delete-project-content] Failed to unlink articles from answers:", unlinkError);
    }

    // Delete planning entries first (they reference answers and articles)
    const { error: planningError } = await supabase
      .from("planning")
      .delete()
      .eq("project_id", projectId);

    if (planningError) {
      console.error("[delete-project-content] Failed to delete planning:", planningError);
    }

    // Delete planning_days entries
    const { error: planningDaysError } = await supabase
      .from("planning_days")
      .delete()
      .eq("project_id", projectId);

    if (planningDaysError) {
      console.error("[delete-project-content] Failed to delete planning_days:", planningDaysError);
    }

    // Delete reddit responses (they reference answers)
    const { error: redditError } = await supabase
      .from("reddit_responses")
      .delete()
      .eq("project_id", projectId);

    if (redditError) {
      console.error("[delete-project-content] Failed to delete reddit responses:", redditError);
    }

    // Delete articles
    const { error: articlesError } = await supabase
      .from("articles")
      .delete()
      .eq("project_id", projectId);

    if (articlesError) {
      console.error("[delete-project-content] Failed to delete articles:", articlesError);
    }

    // Delete answers
    const { error: answersError } = await supabase
      .from("answers")
      .delete()
      .eq("project_id", projectId);

    if (answersError) {
      console.error("[delete-project-content] Failed to delete answers:", answersError);
    }

    // Delete keywords
    const { error: keywordsError } = await supabase
      .from("keywords")
      .delete()
      .eq("project_id", projectId);

    if (keywordsError) {
      console.error("[delete-project-content] Failed to delete keywords:", keywordsError);
    }

    // Delete site pages
    const { error: pagesError } = await supabase
      .from("site_pages")
      .delete()
      .eq("project_id", projectId);

    if (pagesError) {
      console.error("[delete-project-content] Failed to delete site pages:", pagesError);
    }

    // Delete integrations
    const { error: integrationsError } = await supabase
      .from("integrations")
      .delete()
      .eq("project_id", projectId);

    if (integrationsError) {
      console.error("[delete-project-content] Failed to delete integrations:", integrationsError);
    }

    // Delete generation_settings
    const { error: settingsError } = await supabase
      .from("generation_settings")
      .delete()
      .eq("project_id", projectId);

    if (settingsError) {
      console.error("[delete-project-content] Failed to delete generation_settings:", settingsError);
    }

    // Delete project_settings
    const { error: projectSettingsError } = await supabase
      .from("project_settings")
      .delete()
      .eq("project_id", projectId);

    if (projectSettingsError) {
      console.error("[delete-project-content] Failed to delete project_settings:", projectSettingsError);
    }

    // Finally delete the project itself
    const { error: deleteProjectError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (deleteProjectError) {
      console.error("[delete-project-content] Failed to delete project:", deleteProjectError);
      return new Response(JSON.stringify({ error: "Failed to delete project" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[delete-project-content] Project and all content deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Project and all content deleted successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[delete-project-content] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
