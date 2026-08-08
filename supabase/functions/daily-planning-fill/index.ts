import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This function used to own a second, independent day-by-day AEO
 * answer+article fill (tracked via the `planning` table) that ran on its
 * own schedule — both as a daily cron and client-triggered from
 * GEODashboard.tsx (up to 8x per page load). The 30-day
 * GEO -> SEO -> AEO -> Local AEO -> Shopping calendar is owned by
 * generate-30-gso-contents (one piece per calendar day, type =
 * CONTENT_TYPES[dayOffset % n]), driven hourly by
 * check-planning-completeness. That second rotation here wrote a real AEO
 * answer+article pair into `answers`/`articles` on every single day
 * regardless of what type the actual rotation assigned that day — burying
 * GEO/SEO/Local AEO/Shopping content under a wall of AEO, and burning AI
 * quota on duplicate generation. Removed; this function now only does the
 * one job that isn't already covered by generate-30-gso-contents's own
 * shopping slot: opportunistically enriching one not-yet-touched catalog
 * product per run, independent of the day-rotation.
 */
async function callFn(supabase: any, serviceRoleKey: string, name: string, payload: unknown) {
  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
    headers: { Authorization: "Bearer " + serviceRoleKey },
  });
  if (error) throw new Error(name + " failed: " + error.message);
  if (data?.error) throw new Error(name + " failed: " + data.error);
  return data;
}

/**
 * CRON JOB: Daily Planning Fill
 * Runs daily at 6 AM UTC
 * For each active project with a catalog: enrich one not-yet-touched
 * shopping product. The 30-day content calendar itself is generate-30-gso-
 * contents's job (see the header comment above).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { projectId } = body ?? {};

    console.log("[daily-planning-fill] Starting shopping enrichment pass...", { projectId });

    const projectsQuery = supabase
      .from("projects")
      .select("id, name, language")
      .eq("is_active", true);

    const { data: projects, error: projectsError } = projectId
      ? await projectsQuery.eq("id", projectId)
      : await projectsQuery;

    if (projectsError) throw projectsError;

    console.log("[daily-planning-fill] Found " + (projects?.length || 0) + " active projects");

    const results: { projectId: string; name: string; shoppingProductEnriched: string | null }[] = [];

    for (const project of projects || []) {
      const language = project.language || "en";

      // Shopping content is only meaningful with a real catalog behind it.
      const { count: productCount } = await supabase
        .from("shopping_products")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id);
      const hasProducts = (productCount || 0) > 0;

      let shoppingProductEnriched: string | null = null;
      if (hasProducts) {
        const { data: nextProduct } = await supabase
          .from("shopping_products")
          .select("id")
          .eq("project_id", project.id)
          .eq("status", "imported")
          .limit(1)
          .maybeSingle();
        if (nextProduct) {
          try {
            await callFn(supabase, serviceRoleKey, "generate-product-ai", {
              productId: nextProduct.id,
              projectId: project.id,
              language,
            });
            shoppingProductEnriched = nextProduct.id;
            console.log("[daily-planning-fill] Enriched shopping product " + nextProduct.id + " for " + project.name);
          } catch (e) {
            console.error("[daily-planning-fill] Shopping enrichment failed for " + project.name + ":", e);
          }
        }
      }

      results.push({ projectId: project.id, name: project.name, shoppingProductEnriched });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("[daily-planning-fill] Error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
