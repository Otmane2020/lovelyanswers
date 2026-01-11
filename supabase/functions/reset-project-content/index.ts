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

    // Update the project URL - this will trigger the on_project_url_change trigger
    // which automatically deletes planning, articles, answers, keywords, reddit_responses
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

    console.log(`[reset-project-content] Project URL updated, trigger should have cleaned content`);

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
