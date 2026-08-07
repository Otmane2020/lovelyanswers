// enrich-keywords — Phase 3: real DataForSEO data on the keywords table.
//
// Reuses what already exists:
//  - analyze-competitors already pulls competitor ranked keywords (called by the pipeline)
//  - keywords rows created by the wizard / crawl-site-keywords stay in place
// This function only ADDS the missing piece: real search volume, CPC, difficulty,
// intent, question flag — plus long-tail ideas seeded from the scraped site.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateCaller } from "../_shared/internal-auth.ts";
import {
  classifyIntent, dfsCredentials, isQuestion, keywordIdeas, keywordVolumes,
} from "../_shared/dataforseo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await authenticateCaller(req);
  if (!caller.ok) return json({ error: caller.error || "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { projectId, language: langOverride, discover = true } = await req.json();
    if (!projectId) return json({ error: "projectId is required" }, 400);

    if (!dfsCredentials()) {
      console.warn("[enrich-keywords] DataForSEO not configured");
      return json({
        success: false,
        reason: "dataforseo_not_configured",
        enriched: 0,
        inserted: 0,
      });
    }

    const [{ data: project }, { data: settings }] = await Promise.all([
      supabase.from("projects").select("id, language, brand_name, domain, business_type").eq("id", projectId).maybeSingle(),
      supabase.from("generation_settings").select("language").eq("project_id", projectId).maybeSingle(),
    ]);
    if (!project) return json({ error: "Project not found" }, 404);

    const language = (langOverride || project.language || settings?.language || "en").toLowerCase();

    // Surfaced in the response so the provenance card can explain a failure.
    let dfsError: string | null = null;

    // ---- 1. Discover long-tail ideas seeded from real site content ---------
    let discovered: Awaited<ReturnType<typeof keywordIdeas>> = [];
    if (discover) {
      const { data: pages } = await supabase
        .from("site_pages")
        .select("title, page_type")
        .eq("project_id", projectId)
        .limit(25);

      const seeds = [
        ...(pages || [])
          .filter((p: any) => p.title)
          .map((p: any) => String(p.title).split(/[|\-–—:]/)[0].trim())
          .filter((t: string) => t.length > 3 && t.split(" ").length <= 6),
        project.brand_name,
        project.business_type,
      ].filter(Boolean) as string[];

      if (seeds.length) {
        try {
          discovered = await keywordIdeas(seeds, language, 200);
          console.log(`[enrich-keywords] ${discovered.length} ideas from ${seeds.length} seeds`);
        } catch (e) {
          dfsError = e instanceof Error ? e.message : String(e);
          console.error("[enrich-keywords] ideas failed", e);
        }
      }
    }

    // ---- 2. Enrich the keywords already stored ----------------------------
    const { data: existing } = await supabase
      .from("keywords")
      .select("id, keyword, search_volume, cpc, enriched_at")
      .eq("project_id", projectId);

    const existingRows = existing || [];
    const byKeyword = new Map<string, any>(existingRows.map((k: any) => [k.keyword.toLowerCase(), k]));

    const needsVolume = existingRows
      .filter((k: any) => k.search_volume === null || k.cpc === null || !k.enriched_at)
      .map((k: any) => k.keyword)
      .slice(0, 700);

    let volumes: Awaited<ReturnType<typeof keywordVolumes>> = [];
    if (needsVolume.length) {
      try {
        volumes = await keywordVolumes(needsVolume, language);
      } catch (e) {
        dfsError = e instanceof Error ? e.message : String(e);
        console.error("[enrich-keywords] volumes failed", e);
      }
    }

    let enriched = 0;
    for (const v of volumes) {
      const row = byKeyword.get(v.keyword.toLowerCase());
      if (!row) continue;
      const { error } = await supabase
        .from("keywords")
        .update({
          search_volume: v.search_volume,
          cpc: v.cpc,
          difficulty: v.difficulty,
          intent: classifyIntent(v.keyword),
          is_question: isQuestion(v.keyword),
          source: "dataforseo",
          enriched_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (!error) enriched++;
    }

    // ---- 3. Insert the new discovered keywords ----------------------------
    const newRows = discovered
      .filter((k) => k.keyword && !byKeyword.has(k.keyword.toLowerCase()))
      .filter((k) => (k.search_volume ?? 0) > 0)
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
      .slice(0, 150)
      .map((k) => ({
        project_id: projectId,
        keyword: k.keyword,
        search_volume: k.search_volume,
        cpc: k.cpc,
        difficulty: k.difficulty,
        intent: classifyIntent(k.keyword),
        is_question: isQuestion(k.keyword),
        source: "dataforseo",
        enriched_at: new Date().toISOString(),
        is_used: false,
      }));

    let inserted = 0;
    if (newRows.length) {
      const { error } = await supabase.from("keywords").insert(newRows);
      if (error) console.error("[enrich-keywords] insert failed", error.message);
      else inserted = newRows.length;
    }

    // The snapshot must be rebuilt now that keyword data changed.
    if (enriched || inserted) {
      await supabase.from("project_context").update({ stale: true }).eq("project_id", projectId);
    }

    console.log(`[enrich-keywords] project=${projectId} enriched=${enriched} inserted=${inserted}`);
    return json({
      success: !dfsError || enriched > 0 || inserted > 0,
      enriched,
      inserted,
      discovered: discovered.length,
      language,
      dataforseoError: dfsError,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[enrich-keywords] fatal", message);
    return json({ success: false, error: message }, 500);
  }
});
