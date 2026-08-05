import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DFS = "https://api.dataforseo.com/v3";

/** DataForSEO location codes. 2250 = France, 2840 = United States. */
const LOCATION_BY_LANG: Record<string, number> = {
  fr: 2250, en: 2840, "en-uk": 2826, de: 2276, es: 2724, it: 2380,
  nl: 2528, pt: 2620, pl: 2616, sv: 2752, da: 2208, no: 2578, fi: 2246,
};

interface RankedKeyword {
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  source_url: string | null;
}

/** Map a DataForSEO search-intent label onto our own vocabulary. */
function normalizeIntent(keyword: string): string {
  const q = keyword.toLowerCase();
  if (/\b(buy|price|cost|cheap|acheter|prix|tarif)\b/.test(q)) return "transactional";
  if (/\b(best|top|vs|versus|compare|meilleur|comparatif)\b/.test(q)) return "commercial";
  if (/\b(how|what|why|guide|comment|pourquoi|quoi)\b/.test(q)) return "informational";
  return "informational";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { projectId, competitors, language } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Without credentials there is nothing to analyze — say so plainly rather
    // than silently returning an empty result that looks like "no competitors".
    if (!login || !password) {
      console.warn("[COMPETITORS] DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not configured");
      return new Response(
        JSON.stringify({
          success: false,
          reason: "dataforseo_not_configured",
          message: "DataForSEO credentials are missing; competitor keywords were not fetched.",
          keywordsInserted: 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, domain, website_url, language, competitors")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    const lang = (language || project.language || "en").toLowerCase();
    const locationCode = LOCATION_BY_LANG[lang] ?? 2840;
    const langCode = lang.split("-")[0];

    // Competitors from the request, else the ones analyze-website already stored.
    const targets: string[] = (competitors?.length ? competitors : project.competitors) ?? [];
    if (!targets.length) {
      return new Response(
        JSON.stringify({ success: true, keywordsInserted: 0, message: "No competitors to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${login}:${password}`);
    const collected = new Map<string, RankedKeyword>();
    // Kept alongside `collected` (which dedupes globally for storage) so the
    // onboarding review screen can still show what each competitor specifically
    // ranks for — the input the generator is actually targeting per rival.
    const perCompetitor: { domain: string; keywords: string[] }[] = [];

    // What each competitor already ranks for is the best available proxy for
    // "what wins in this niche" — that's the brief the generator needs.
    for (const target of targets.slice(0, 5)) {
      const domain = String(target).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
      try {
        const res = await fetch(`${DFS}/dataforseo_labs/google/ranked_keywords/live`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify([{
            target: domain,
            location_code: locationCode,
            language_code: langCode,
            limit: 50,
            order_by: ["keyword_data.keyword_info.search_volume,desc"],
          }]),
        });

        if (!res.ok) {
          console.error("[COMPETITORS] DataForSEO HTTP", res.status, "for", domain);
          continue;
        }

        const json = await res.json();
        const items = json?.tasks?.[0]?.result?.[0]?.items ?? [];
        console.log("[COMPETITORS]", domain, "→", items.length, "ranked keywords");

        const thisDomainKeywords: string[] = [];
        for (const item of items) {
          const kw = item?.keyword_data?.keyword;
          if (!kw) continue;
          if (thisDomainKeywords.length < 6) thisDomainKeywords.push(kw);
          if (collected.has(kw.toLowerCase())) continue;
          collected.set(kw.toLowerCase(), {
            keyword: kw,
            search_volume: item?.keyword_data?.keyword_info?.search_volume ?? null,
            difficulty: item?.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
            source_url: `https://${domain}`,
          });
        }
        if (thisDomainKeywords.length) perCompetitor.push({ domain, keywords: thisDomainKeywords });
      } catch (e) {
        console.error("[COMPETITORS] Failed for", domain, e);
        // A single competitor failing shouldn't lose the others' keywords.
      }
    }

    if (!collected.size) {
      return new Response(
        JSON.stringify({ success: true, keywordsInserted: 0, message: "No keywords returned", perCompetitor }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // There is no unique index on (project_id, keyword), so ON CONFLICT is not
    // available — dedupe against what the project already has before inserting.
    const { data: existing } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId);

    const alreadyStored = new Set(
      (existing ?? []).map((k: { keyword: string }) => k.keyword.toLowerCase())
    );

    // Keep the highest-volume ones.
    const rows = [...collected.values()]
      .filter((k) => !alreadyStored.has(k.keyword.toLowerCase()))
      .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
      .slice(0, 120)
      .map((k) => ({
        project_id: projectId,
        keyword: k.keyword,
        search_volume: k.search_volume,
        difficulty: k.difficulty,
        intent: normalizeIntent(k.keyword),
        source_url: k.source_url,
        is_used: false,
      }));

    if (!rows.length) {
      return new Response(
        JSON.stringify({ success: true, keywordsInserted: 0, message: "All keywords already stored", perCompetitor }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: insertError } = await supabase.from("keywords").insert(rows);
    if (insertError) throw insertError;

    console.log("[COMPETITORS] Inserted", rows.length, "keywords for project", projectId);

    return new Response(
      JSON.stringify({
        success: true,
        competitorsAnalyzed: targets.slice(0, 5).length,
        keywordsInserted: rows.length,
        topKeywords: rows.slice(0, 10).map((r) => r.keyword),
        perCompetitor,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[COMPETITORS] Fatal:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
