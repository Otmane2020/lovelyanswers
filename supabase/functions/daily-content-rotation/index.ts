import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * This cron owns GEO only. It used to rotate through "geo"/"aeo"/"seo"/
 * "local_aeo"/"aeo_shopping" labels and hand whichever one came up to
 * generate-geo-content as its `contentType` — but that function's
 * `contentType` actually only ever meant "article" | "mentions" | "pillar"
 * | "comparison" (GEO-piece variants), so anything other than the "geo"
 * label matched no branch, left the prompt empty, and silently produced a
 * generic GEO article anyway. AEO/SEO/Local AEO/Shopping now go through
 * their own dedicated functions (generate-aeo-answers + generate-aeo-
 * article, generate-articles, generate-local-answer, generate-product-ai)
 * via daily-planning-fill instead, which actually understand those
 * formats — this cron just does what generate-geo-content was actually
 * built for: one GEO piece a day.
 */
const CONTENT_TYPE = "article" as const;

const BRIEF = "Generative Engine Optimization: a citation-ready piece that ChatGPT, Gemini and Perplexity can quote directly. Lead with the answer, keep claims factual and attributable.";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // Optional projectId: the onboarding passes one so the first piece is
    // generated immediately instead of waiting for tomorrow's cron tick.
    let onlyProjectId: string | null = null;
    try {
      const body = await req.json();
      onlyProjectId = body?.projectId ?? null;
    } catch {
      // No body — the cron path, which covers every active project.
    }

    console.log("[ROTATION] Generating GEO content, project:", onlyProjectId ?? "all");

    let query = supabase
      .from("projects")
      .select("id, name, brand_name, website_url, domain, language, business_description")
      .eq("is_active", true);

    if (onlyProjectId) query = query.eq("id", onlyProjectId);

    const { data: projects, error: projectsError } = await query;
    if (projectsError) throw projectsError;

    if (!projects?.length) {
      return new Response(
        JSON.stringify({ success: true, contentType: CONTENT_TYPE, processed: 0, message: "No active projects" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: { projectId: string; ok: boolean; topic?: string; error?: string }[] = [];

    for (const project of projects) {
      try {
        // Highest-volume keyword not yet written about, so the daily piece
        // works through the backlog instead of rewriting the same topic.
        const { data: keywords } = await supabase
          .from("keywords")
          .select("id, keyword, search_volume")
          .eq("project_id", project.id)
          .eq("is_used", false)
          .order("search_volume", { ascending: false, nullsFirst: false })
          .limit(20);

        const nextKeyword = keywords?.[0] ?? null;
        const brand = project.brand_name || project.name;
        const topic = nextKeyword?.keyword || `${brand} — GEO update`;

        const { error: genError } = await supabase.functions.invoke("generate-geo-content", {
          body: {
            projectId: project.id,
            topic,
            brand,
            website: project.website_url,
            language: project.language || "en",
            contentType: CONTENT_TYPE,
            keywords: (keywords ?? []).slice(0, 8).map((k) => k.keyword),
            brief: BRIEF,
          },
        });

        if (genError) throw genError;

        // Only burn the keyword once generation actually succeeded, so a
        // failed run leaves it available for tomorrow.
        if (nextKeyword?.id) {
          await supabase.from("keywords").update({ is_used: true }).eq("id", nextKeyword.id);
        }

        results.push({ projectId: project.id, ok: true, topic });
        console.log("[ROTATION] Generated for", project.id, "-", topic);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[ROTATION] Failed for", project.id, message);
        // One project failing must not stop the rest of the run.
        results.push({ projectId: project.id, ok: false, error: message });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return new Response(
      JSON.stringify({
        success: true,
        contentType: CONTENT_TYPE,
        processed: results.length,
        succeeded,
        failed: results.length - succeeded,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ROTATION] Fatal:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
