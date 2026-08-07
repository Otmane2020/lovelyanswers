import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * One piece a day, cycling through the five angles so a project never gets
 * five articles of the same shape in a row:
 *   day 0 → GEO, day 1 → AEO, day 2 → SEO, day 3 → Local AEO, day 4 → AEO Shopping, then repeat.
 */
const ROTATION = ["geo", "aeo", "seo", "local_aeo", "aeo_shopping"] as const;
type ContentType = typeof ROTATION[number];

/** Days since epoch — stable across timezones, so the cycle never skips or repeats a day. */
function dayIndex(date = new Date()): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
}

export function typeForDay(date = new Date()): ContentType {
  return ROTATION[dayIndex(date) % ROTATION.length];
}

/** Angle-specific brief handed to the generator alongside the keywords. */
const BRIEF: Record<ContentType, string> = {
  geo: "Generative Engine Optimization: a citation-ready piece that ChatGPT, Gemini and Perplexity can quote directly. Lead with the answer, keep claims factual and attributable.",
  seo: "Classic SEO article: search-intent driven, structured with clear H2s, targeting the keyword's organic ranking.",
  aeo: "Answer Engine Optimization: a direct question-and-answer piece, one clear question answered in the first two sentences, then the supporting detail.",
  local_aeo: "Local AEO: answer the question as it would be asked about this specific area — mention the city/region, opening hours, delivery zone and other local specifics.",
  aeo_shopping: "AEO Shopping: answer a buying-decision question the way an AI assistant would when a shopper asks for a product recommendation — price range, what to look for, and why this business is a solid pick.",
};

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

    const contentType = typeForDay();
    console.log("[ROTATION] Content type for today:", contentType, "project:", onlyProjectId ?? "all");

    let query = supabase
      .from("projects")
      .select("id, name, brand_name, website_url, domain, language, business_description")
      .eq("is_active", true);

    if (onlyProjectId) query = query.eq("id", onlyProjectId);

    const { data: projects, error: projectsError } = await query;
    if (projectsError) throw projectsError;

    if (!projects?.length) {
      return new Response(
        JSON.stringify({ success: true, contentType, processed: 0, message: "No active projects" }),
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
        const topic = nextKeyword?.keyword || `${brand} — ${contentType.replace("_", " ")} update`;

        const { error: genError } = await supabase.functions.invoke("generate-geo-content", {
          body: {
            projectId: project.id,
            topic,
            brand,
            website: project.website_url,
            language: project.language || "en",
            contentType,
            keywords: (keywords ?? []).slice(0, 8).map((k) => k.keyword),
            brief: BRIEF[contentType],
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
        contentType,
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
