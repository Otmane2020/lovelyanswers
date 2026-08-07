// onboarding-pipeline — idempotent orchestrator.
// It creates NO new scraping/AI logic: it sequences existing functions
// (scrape-site-pages → analyze-website) and builds the project_context cache.
// Modes: "full" (onboarding) | "refresh" (re-run on demand).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildProjectContext, saveProjectContext } from "../_shared/project-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Status =
  | "pending" | "scraping" | "analysing_business" | "building_context"
  | "completed" | "partial" | "failed";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let projectId: string | undefined;

  const setStatus = async (status: Status, progress: number, error?: string | null) => {
    if (!projectId) return;
    await supabase
      .from("projects")
      .update({
        onboarding_status: status,
        onboarding_progress: progress,
        onboarding_last_error: error ?? null,
        onboarding_updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);
  };

  try {
    const body = await req.json();
    projectId = body.projectId;
    const mode: "full" | "refresh" = body.mode === "refresh" ? "refresh" : "full";
    const rescrape: boolean = body.rescrape !== false;
    const authHeader = req.headers.get("Authorization") || "";

    if (!projectId) {
      return new Response(JSON.stringify({ success: false, error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, website_url, domain, brand_name, business_description, language")
      .eq("id", projectId)
      .maybeSingle();

    if (projectError || !project) throw new Error("Project not found");

    const websiteUrl = project.website_url || (project.domain ? `https://${project.domain}` : null);
    const steps: Record<string, unknown> = {};

    // ---- Step 1: strategic scraping ------------------------------------
    await setStatus("scraping", 10);
    if (websiteUrl && rescrape) {
      try {
        const { data, error } = await supabase.functions.invoke("scrape-site-pages", {
          body: { projectId, websiteUrl, limit: 30 },
        });
        if (error) throw error;
        steps.scraping = data;
      } catch (e) {
        steps.scraping = { success: false, error: e instanceof Error ? e.message : "scrape failed" };
        console.error("[onboarding-pipeline] scraping failed", e);
      }
    } else {
      steps.scraping = { skipped: true };
    }

    // ---- Step 2: business analysis (existing analyze-website) ----------
    await setStatus("analysing_business", 45);
    if (websiteUrl) {
      try {
        const { data, error } = await supabase.functions.invoke("analyze-website", {
          body: { url: websiteUrl },
          headers: authHeader ? { Authorization: authHeader } : undefined,
        });
        if (error) throw error;
        if (data?.success) {
          const updates: Record<string, unknown> = {};
          if (data.brandName && !project.brand_name) updates.brand_name = data.brandName;
          if (data.description) updates.business_description = data.description;
          if (Array.isArray(data.competitors) && data.competitors.length) updates.competitors = data.competitors;
          if (data.language && !project.language) updates.language = data.language;
          if (Object.keys(updates).length) {
            await supabase.from("projects").update(updates).eq("id", projectId);
          }

          const settingsUpdate: Record<string, unknown> = {
            project_id: projectId,
            website_url: websiteUrl,
          };
          if (data.description) settingsUpdate.business_description = data.description;
          if (Array.isArray(data.competitors) && data.competitors.length) settingsUpdate.competitors = data.competitors;
          if (Array.isArray(data.targetAudiences) && data.targetAudiences.length) {
            settingsUpdate.target_audiences = data.targetAudiences;
          }
          if (data.brandName) settingsUpdate.brand_name = data.brandName;
          if (data.language) settingsUpdate.language = data.language;
          await supabase.from("generation_settings").upsert(settingsUpdate, { onConflict: "project_id" });

          steps.business = {
            success: true,
            brandName: data.brandName,
            competitors: data.competitors?.length || 0,
            audiences: data.targetAudiences?.length || 0,
          };
        } else {
          steps.business = { success: false, error: data?.error || "analyze-website returned no data" };
        }
      } catch (e) {
        steps.business = { success: false, error: e instanceof Error ? e.message : "analysis failed" };
        console.error("[onboarding-pipeline] business analysis failed", e);
      }
    } else {
      steps.business = { skipped: true, reason: "no website url" };
    }

    // ---- Step 3: build the context snapshot ----------------------------
    await setStatus("building_context", 80);
    const built = await buildProjectContext(supabase, projectId);
    const version = await saveProjectContext(supabase, projectId, built);
    steps.context = {
      readiness: built.readiness,
      version,
      pages: built.context.website.pages_count,
      keywords: built.context.keywords.length,
      competitors: built.context.competitors.length,
      reasons: built.reasons,
    };

    // ---- Finalise -------------------------------------------------------
    const finalStatus: Status =
      built.readiness === "insufficient" ? "failed" : built.readiness === "partial" ? "partial" : "completed";
    await setStatus(
      finalStatus,
      finalStatus === "completed" ? 100 : 90,
      built.readiness === "insufficient" ? built.reasons.join("; ") : null,
    );

    if (finalStatus !== "failed") {
      await supabase.from("projects").update({ needs_onboarding: false }).eq("id", projectId);
      await supabase
        .from("generation_settings")
        .update({ onboarding_completed: true })
        .eq("project_id", projectId);
    }

    console.log(`[onboarding-pipeline] project=${projectId} mode=${mode} status=${finalStatus}`, steps);

    return new Response(
      JSON.stringify({
        success: finalStatus !== "failed",
        status: finalStatus,
        readiness: built.readiness,
        contextVersion: version,
        steps,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("[onboarding-pipeline] fatal", error);
    await setStatus("failed", 0, message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
