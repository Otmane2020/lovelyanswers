import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UNLOCK-ARTICLES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Get the user's active project
    const { data: projects, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (projectError || !projects || projects.length === 0) {
      throw new Error("No project found for user");
    }

    const projectId = projects[0].id;
    logStep("Found project", { projectId });

    // Get all locked articles for this project
    const { data: lockedArticles, error: articlesError } = await supabaseAdmin
      .from("articles")
      .select("id, title")
      .eq("project_id", projectId)
      .eq("status", "locked");

    if (articlesError) throw new Error(`Error fetching articles: ${articlesError.message}`);

    if (!lockedArticles || lockedArticles.length === 0) {
      logStep("No locked articles found");
      return new Response(JSON.stringify({ unlocked: 0, message: "No locked articles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Found locked articles", { count: lockedArticles.length });

    // Update all locked articles to "scheduled" status so daily-planning-fill and generate functions can pick them up
    const articleIds = lockedArticles.map(a => a.id);
    const { error: updateError } = await supabaseAdmin
      .from("articles")
      .update({ status: "scheduled" })
      .in("id", articleIds);

    if (updateError) throw new Error(`Error updating articles: ${updateError.message}`);

    logStep("Articles unlocked to scheduled", { count: articleIds.length });

    // Trigger generation for each article by calling generate-aeo-article
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    let generated = 0;
    let errors = 0;

    for (const article of lockedArticles) {
      try {
        logStep("Generating content for article", { articleId: article.id, title: article.title });
        
        const response = await fetch(`${supabaseUrl}/functions/v1/generate-aeo-article`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ articleId: article.id }),
        });

        if (response.ok) {
          generated++;
          logStep("Article generated successfully", { articleId: article.id });
        } else {
          const errText = await response.text();
          logStep("Article generation failed", { articleId: article.id, error: errText });
          errors++;
        }
      } catch (err) {
        logStep("Article generation error", { articleId: article.id, error: String(err) });
        errors++;
      }
    }

    logStep("Unlock complete", { total: lockedArticles.length, generated, errors });

    return new Response(JSON.stringify({ 
      unlocked: lockedArticles.length,
      generated,
      errors,
      message: `${lockedArticles.length} articles unlocked, ${generated} generated`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
