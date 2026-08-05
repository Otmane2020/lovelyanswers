import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cron Job: Check Planning Completeness
 * Runs every 6 hours to check if each project has 60 items (30 answers + 30 articles) for the next 30 days
 * If not, triggers auto-regeneration directly
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("[check-planning] Starting planning completeness check...");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today.getTime() + 30 * 86400000);

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name, language, brand_name, business_description, user_id")
      .eq("is_active", true);

    if (projectsError) {
      console.error("[check-planning] Error fetching projects:", projectsError);
      throw projectsError;
    }

    console.log(`[check-planning] Found ${projects?.length || 0} active projects`);

    const results: { projectId: string; name: string; status: string; answersCount: number; articlesCount: number; gsoCount: number }[] = [];

    for (const project of projects || []) {
      // Count answers in next 30 days
      const { count: answersCount } = await supabase
        .from("answers")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("scheduled_date", today.toISOString())
        .lt("scheduled_date", endDate.toISOString());

      // Count articles in next 30 days
      const { count: articlesCount } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("scheduled_date", today.toISOString())
        .lt("scheduled_date", endDate.toISOString());

      // Count GSO contents in next 30 days
      const { count: gsoCount } = await supabase
        .from("geo_contents")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("scheduled_date", today.toISOString())
        .lt("scheduled_date", endDate.toISOString());

      const totalAeo = (answersCount || 0) + (articlesCount || 0);
      const expectedAeo = 60; // 30 answers + 30 articles
      const totalGso = gsoCount || 0;
      const expectedGso = 120; // 30 days x 4 content types (geo, seo, aeo, local_aeo)

      console.log(`[check-planning] Project ${project.name}: ${answersCount} answers, ${articlesCount} articles, ${totalGso} GSO (AEO: ${totalAeo}/${expectedAeo}, GSO: ${totalGso}/${expectedGso})`);

      let aeoStatus = "complete";
      let gsoStatus = "complete";

      // === AEO status (reporting only) ===
      // This used to delete every scheduled answer/article for the next 30
      // days and regenerate all 30 from scratch the moment the count dipped
      // even slightly under threshold — guaranteed duplicate AI spend and
      // directly against "never create duplicates, only fill missing days".
      // daily-planning-fill already fills this track incrementally, day by
      // day, on its own schedule; this function no longer duplicates that
      // work, it just reports where the AEO track currently stands.
      if (totalAeo < expectedAeo) {
        console.log(`[check-planning] Project ${project.name} AEO under target (${totalAeo}/${expectedAeo}) — daily-planning-fill will catch up on its own schedule`);
        aeoStatus = "pending";
      }

      // === GSO Regeneration ===
      if (totalGso < expectedGso) {
        console.log(`[check-planning] Project ${project.name} GSO needs regeneration (${totalGso}/${expectedGso})`);
        try {
          // Call the existing generate-30-gso-contents function
          const gsoRes = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-30-gso-contents`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ projectId: project.id }),
            }
          );
          const gsoData = await gsoRes.json();
          console.log(`[check-planning] GSO regeneration for ${project.name}: ${gsoData?.created || 0} items`);
          gsoStatus = "regenerated";
        } catch (gsoErr) {
          console.error(`[check-planning] GSO error for ${project.name}:`, gsoErr);
          gsoStatus = "error";
        }
      }

      results.push({
        projectId: project.id,
        name: project.name,
        status: aeoStatus === "error" || gsoStatus === "error" ? "error" : (aeoStatus === "regenerated" || gsoStatus === "regenerated" ? "regenerated" : "complete"),
        answersCount: answersCount || 0,
        articlesCount: articlesCount || 0,
        gsoCount: totalGso,
      });
    }

    console.log("[check-planning] Completed. Results:", JSON.stringify(results));

    return new Response(
      JSON.stringify({
        success: true,
        checked: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[check-planning] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});