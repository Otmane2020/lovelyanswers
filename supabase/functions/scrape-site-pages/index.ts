// scrape-site-pages — orchestrator only.
// Discovers strategic URLs (sitemap first, home-page links as fallback),
// classifies them, then reuses the existing `internal-scraper` function to
// extract content. Upserts into site_pages on (project_id, url).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_TYPE_RULES: Array<[RegExp, string]> = [
  [/\/(about|a-propos|qui-sommes-nous|notre-histoire|company)/i, "about"],
  [/\/(service|services|prestations|solutions)/i, "services"],
  [/\/(product|produit|shop|boutique|store)/i, "product"],
  [/\/(collection|category|categorie|categories|rayon)/i, "category"],
  [/\/(faq|questions|aide|help|support)/i, "faq"],
  [/\/(contact|nous-contacter)/i, "contact"],
  [/\/(pricing|tarifs|prix|plans)/i, "pricing"],
  [/\/(blog|article|actualites|news|guide|ressources)/i, "editorial"],
];

const EXCLUDE = /\/(cart|panier|checkout|login|signin|signup|account|compte|cgv|cgu|mentions-legales|privacy|politique|terms|wp-admin|tag\/|author\/|\?|#)/i;

const PRIORITY: Record<string, number> = {
  home: 0, about: 1, services: 2, category: 3, product: 4,
  pricing: 5, faq: 6, contact: 7, editorial: 8, page: 9,
};

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "");
    if (path === "") path = "/";
    return `${u.protocol}//${u.hostname.replace(/^www\./, "")}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

function classify(url: string, homeNormalized: string): string {
  const normalized = normalizeUrl(url);
  if (normalized === homeNormalized) return "home";
  for (const [re, type] of PAGE_TYPE_RULES) if (re.test(url)) return type;
  return "page";
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AutopilotGEO-Bot/1.0" },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function urlsFromSitemap(sitemapUrl: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const xml = await fetchText(sitemapUrl);
  if (!xml) return [];
  const nested = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((m) => m[1].trim());
  if (nested.length) {
    const out: string[] = [];
    for (const s of nested.slice(0, 5)) out.push(...(await urlsFromSitemap(s, depth + 1)));
    return out;
  }
  return [...xml.matchAll(/<url>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/url>/gi)]
    .map((m) => m[1].trim())
    .filter((u) => u && !u.endsWith(".xml"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { projectId, websiteUrl, limit = 30 } = await req.json();
    if (!projectId || !websiteUrl) {
      return new Response(JSON.stringify({ success: false, error: "projectId and websiteUrl are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let base = String(websiteUrl).trim();
    if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
    const origin = new URL(base).origin;
    const homeNormalized = normalizeUrl(origin)!;

    // 1. Discovery
    const candidates = new Set<string>([origin]);

    const { data: project } = await supabase
      .from("projects")
      .select("sitemap_url")
      .eq("id", projectId)
      .maybeSingle();

    const sitemapCandidates = [
      project?.sitemap_url,
      `${origin}/sitemap.xml`,
      `${origin}/sitemap_index.xml`,
    ].filter(Boolean) as string[];

    for (const sm of sitemapCandidates) {
      const urls = await urlsFromSitemap(sm);
      if (urls.length) {
        urls.forEach((u) => candidates.add(u));
        console.log(`[scrape-site-pages] sitemap ${sm} → ${urls.length} urls`);
        break;
      }
    }

    // Fallback: internal links from the homepage
    if (candidates.size <= 1) {
      const html = await fetchText(origin, 12000);
      if (html) {
        for (const m of html.matchAll(/href=["']([^"']+)["']/gi)) {
          try {
            const abs = new URL(m[1], origin);
            if (abs.origin === origin) candidates.add(abs.href);
          } catch { /* ignore */ }
        }
      }
      console.log(`[scrape-site-pages] homepage fallback → ${candidates.size} urls`);
    }

    // 2. Prioritised selection
    const seen = new Set<string>();
    const selected: Array<{ url: string; normalized: string; page_type: string }> = [];
    for (const url of candidates) {
      if (EXCLUDE.test(url)) continue;
      const normalized = normalizeUrl(url);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      selected.push({ url, normalized, page_type: classify(url, homeNormalized) });
    }
    selected.sort((a, b) => (PRIORITY[a.page_type] ?? 9) - (PRIORITY[b.page_type] ?? 9));
    const toScrape = selected.slice(0, Math.min(limit, 40));

    // 3. Scrape through the existing internal-scraper function
    let stored = 0;
    const failures: string[] = [];
    for (const page of toScrape) {
      try {
        const { data, error } = await supabase.functions.invoke("internal-scraper", {
          body: { url: page.url, timeout: 12000 },
        });
        if (error || !data?.success) {
          failures.push(page.url);
          continue;
        }
        const d = data.data;
        const { error: upsertError } = await supabase.from("site_pages").upsert(
          {
            project_id: projectId,
            url: page.url,
            normalized_url: page.normalized,
            page_type: page.page_type,
            title: d.title || null,
            meta_description: d.metaDescription || null,
            content: (d.markdown || "").slice(0, 20000) || null,
            headings: Array.isArray(d.headings) ? d.headings.slice(0, 30) : [],
            word_count: d.wordCount ?? null,
            lang: d.language || null,
            scraped_at: new Date().toISOString(),
            last_crawled_at: new Date().toISOString(),
          },
          { onConflict: "project_id,url" },
        );
        if (upsertError) {
          console.error(`[scrape-site-pages] upsert error ${page.url}: ${upsertError.message}`);
          failures.push(page.url);
        } else {
          stored++;
        }
      } catch (e) {
        console.error(`[scrape-site-pages] scrape error ${page.url}`, e);
        failures.push(page.url);
      }
    }

    console.log(`[scrape-site-pages] project=${projectId} discovered=${selected.length} scraped=${stored} failed=${failures.length}`);

    return new Response(
      JSON.stringify({
        success: stored > 0,
        discovered: selected.length,
        scraped: stored,
        failed: failures.length,
        types: toScrape.reduce((acc: Record<string, number>, p) => {
          acc[p.page_type] = (acc[p.page_type] || 0) + 1;
          return acc;
        }, {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[scrape-site-pages] fatal", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
