// Shared project context builder.
// project_context is a CACHE only — the sources of truth stay in projects,
// generation_settings, site_pages, keywords, local_businesses, shopping_*.
// Any generation that finds a missing or stale snapshot rebuilds it here.

export interface ProjectContextSnapshot {
  project: {
    id: string;
    name: string | null;
    brand_name: string | null;
    domain: string | null;
    website_url: string | null;
    language: string;
    business_type: string | null;
    business_description: string | null;
    audience: string | null;
  };
  website: {
    pages_count: number;
    pages: Array<{
      url: string;
      page_type: string | null;
      title: string | null;
      meta_description: string | null;
      headings: string[];
      word_count: number | null;
      excerpt: string | null;
    }>;
    detected_language: string | null;
  };
  keywords: Array<{
    keyword: string;
    search_volume: number | null;
    cpc: number | null;
    difficulty: number | null;
    intent: string | null;
    cluster: string | null;
    is_question: boolean | null;
  }>;
  competitors: string[];
  target_audiences: string[];
  locations: Array<{ name: string | null; address: string | null; phone: string | null }>;
  products: Array<{ title: string | null; description: string | null; category: string | null; price: number | null }>;
  tone: string | null;
  built_at: string;
  /** Where each part of the context comes from, and whether it is usable. */
  sources: Record<ContextSourceKey, ContextSource>;
}

/** Provenance of each context block — lets the UI explain what is missing. */
export type ContextSourceKey =
  | "scraping" | "analyze_website" | "dataforseo" | "competitors"
  | "google_business" | "shopping" | "user_input";

export interface ContextSource {
  /** present = usable data, missing = nothing stored, stale = older than 30 days. */
  status: "present" | "missing" | "stale";
  /** How many records back this block. */
  count: number;
  /** Last time this source produced data. */
  last_updated: string | null;
  /** Which context fields this source feeds. */
  feeds: string[];
  /** Human-readable reason when status is not "present". */
  detail?: string;
}

export type Readiness = "ready" | "partial" | "insufficient";

function excerpt(text: string | null, len = 600): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, " ").trim().slice(0, len);
}

const STALE_AFTER_DAYS = 30;

function latest(rows: any[], ...fields: string[]): string | null {
  let max: number | null = null;
  for (const row of rows) {
    for (const f of fields) {
      const v = row?.[f];
      if (!v) continue;
      const t = new Date(v).getTime();
      if (!Number.isNaN(t) && (max === null || t > max)) max = t;
    }
  }
  return max === null ? null : new Date(max).toISOString();
}

function makeSource(
  count: number,
  lastUpdated: string | null,
  feeds: string[],
  missingDetail: string,
): ContextSource {
  if (!count) return { status: "missing", count: 0, last_updated: null, feeds, detail: missingDetail };
  const isStale =
    !!lastUpdated &&
    Date.now() - new Date(lastUpdated).getTime() > STALE_AFTER_DAYS * 86_400_000;
  return {
    status: isStale ? "stale" : "present",
    count,
    last_updated: lastUpdated,
    feeds,
    detail: isStale ? `last refreshed more than ${STALE_AFTER_DAYS} days ago` : undefined,
  };
}

/** Provenance map: which source feeds which block, and is it usable today. */
function buildSources(input: {
  pages: any[]; keywords: any[]; competitors: string[]; locations: any[];
  products: any[]; project: any; settings: any; description: string | null;
}): Record<ContextSourceKey, ContextSource> {
  const { pages, keywords, competitors, locations, products, project, settings, description } = input;

  const dfsKeywords = keywords.filter((k: any) => k.source === "dataforseo" || k.enriched_at);
  const hasBusinessAnalysis = !!(description && description.length > 30);
  const manualFields = [
    settings.tone, settings.brand_name, settings.target_audiences?.length ? "audiences" : null,
    project.audience, project.business_type,
  ].filter(Boolean);

  return {
    scraping: makeSource(
      pages.length,
      latest(pages, "scraped_at", "updated_at"),
      ["website.pages", "website.detected_language"],
      "no page scraped yet — run Refresh project context",
    ),
    analyze_website: makeSource(
      hasBusinessAnalysis ? 1 : 0,
      project.updated_at ?? null,
      ["project.business_description", "project.business_type", "target_audiences"],
      "business analysis never completed",
    ),
    dataforseo: makeSource(
      dfsKeywords.length,
      latest(keywords, "enriched_at", "updated_at"),
      ["keywords.search_volume", "keywords.cpc", "keywords.difficulty", "keywords.intent"],
      "no keyword enriched with real search data (DataForSEO)",
    ),
    competitors: makeSource(
      competitors.length,
      project.updated_at ?? null,
      ["competitors", "keywords (competitor gap)"],
      "no competitor identified",
    ),
    google_business: makeSource(
      locations.length,
      latest(locations, "updated_at"),
      ["locations"],
      "no Google Business location connected",
    ),
    shopping: makeSource(
      products.length,
      latest(products, "updated_at"),
      ["products"],
      "no product imported (Shopify / feed)",
    ),
    user_input: makeSource(
      manualFields.length,
      settings.updated_at ?? null,
      ["tone", "brand_name", "audience", "business_type"],
      "nothing filled manually in settings",
    ),
  };
}

export async function buildProjectContext(
  supabase: any,
  projectId: string,
): Promise<{ context: ProjectContextSnapshot; readiness: Readiness; reasons: string[] }> {
  const [projectRes, settingsRes, pagesRes, keywordsRes] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
    supabase.from("generation_settings").select("*").eq("project_id", projectId).maybeSingle(),
    supabase
      .from("site_pages")
      .select("url, page_type, title, meta_description, headings, word_count, lang, content, scraped_at, updated_at")
      .eq("project_id", projectId)
      .order("word_count", { ascending: false })
      .limit(40),
    supabase
      .from("keywords")
      .select("keyword, search_volume, cpc, difficulty, intent, cluster, is_question, source, enriched_at, updated_at")
      .eq("project_id", projectId)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(150),
  ]);

  const project = projectRes.data;
  if (!project) throw new Error(`Project ${projectId} not found`);
  const settings = settingsRes.data || {};
  const pages = pagesRes.data || [];
  const keywords = keywordsRes.data || [];

  // Optional sources — never block on them.
  let locations: any[] = [];
  let products: any[] = [];
  try {
    const { data } = await supabase
      .from("local_businesses")
      .select("name, address, phone, updated_at")
      .eq("project_id", projectId)
      .limit(10);
    locations = data || [];
  } catch (_e) { /* optional */ }
  try {
    const { data } = await supabase
      .from("shopping_products")
      .select("title, description, category, price, updated_at")
      .eq("project_id", projectId)
      .limit(30);
    products = data || [];
  } catch (_e) { /* optional */ }

  const competitors: string[] = Array.isArray(settings.competitors)
    ? settings.competitors
    : Array.isArray(project.competitors)
      ? project.competitors
      : [];

  const description = project.business_description || settings.business_description || null;

  const context: ProjectContextSnapshot = {
    project: {
      id: project.id,
      name: project.name ?? null,
      brand_name: project.brand_name || settings.brand_name || null,
      domain: project.domain ?? null,
      website_url: project.website_url || settings.website_url || null,
      language: project.language || settings.language || "en",
      business_type: project.business_type ?? null,
      business_description: description,
      audience: project.audience ?? null,
    },
    website: {
      pages_count: pages.length,
      pages: pages.slice(0, 25).map((p: any) => ({
        url: p.url,
        page_type: p.page_type ?? null,
        title: p.title ?? null,
        meta_description: p.meta_description ?? null,
        headings: Array.isArray(p.headings) ? p.headings.slice(0, 12) : [],
        word_count: p.word_count ?? null,
        excerpt: excerpt(p.content),
      })),
      detected_language: pages.find((p: any) => p.lang)?.lang ?? null,
    },
    keywords: keywords.map((k: any) => ({
      keyword: k.keyword,
      search_volume: k.search_volume ?? null,
      cpc: k.cpc ?? null,
      difficulty: k.difficulty ?? null,
      intent: k.intent ?? null,
      cluster: k.cluster ?? null,
      is_question: k.is_question ?? null,
    })),
    competitors,
    target_audiences: Array.isArray(settings.target_audiences) ? settings.target_audiences : [],
    locations,
    products,
    tone: settings.tone ?? null,
    built_at: new Date().toISOString(),
    sources: buildSources({
      pages, keywords, competitors, locations, products, project, settings, description,
    }),
  };

  // Readiness: identity + at least one real context source.
  const reasons: string[] = [];
  const hasIdentity = !!(context.project.brand_name || context.project.domain);
  const hasScraped = pages.length > 0;
  const hasDescription = !!(description && description.length > 30);
  if (!hasIdentity) reasons.push("missing brand_name/domain");
  if (!hasScraped && !hasDescription) reasons.push("no scraped pages and no business description");

  let readiness: Readiness = "insufficient";
  if (hasIdentity && (hasScraped || hasDescription)) {
    readiness = hasScraped && hasDescription && keywords.length > 0 ? "ready" : "partial";
  }
  if (readiness !== "ready") {
    if (!hasScraped) reasons.push("no scraped pages");
    if (keywords.length === 0) reasons.push("no keywords");
  }
  // Surface every source that cannot contribute, so the UI can explain why the
  // context is incomplete instead of just showing "partial".
  for (const [key, src] of Object.entries(context.sources)) {
    if (src.status !== "present") reasons.push(`${key}: ${src.detail || src.status}`);
  }

  return { context, readiness, reasons };
}

export async function saveProjectContext(
  supabase: any,
  projectId: string,
  built: { context: ProjectContextSnapshot; readiness: Readiness },
) {
  const { data: existing } = await supabase
    .from("project_context")
    .select("context_version")
    .eq("project_id", projectId)
    .maybeSingle();

  const version = (existing?.context_version ?? 0) + 1;

  const { error } = await supabase.from("project_context").upsert(
    {
      project_id: projectId,
      context: built.context,
      context_version: version,
      readiness: built.readiness,
      stale: false,
      refreshed_at: new Date().toISOString(),
    },
    { onConflict: "project_id" },
  );
  if (error) throw new Error(`saveProjectContext: ${error.message}`);
  return version;
}

/** Read the snapshot, rebuilding it when missing or stale. */
export async function getProjectContext(
  supabase: any,
  projectId: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<{ context: ProjectContextSnapshot; readiness: Readiness; version: number }> {
  if (!opts.forceRefresh) {
    const { data } = await supabase
      .from("project_context")
      .select("context, readiness, stale, context_version")
      .eq("project_id", projectId)
      .maybeSingle();
    if (data && !data.stale && data.context) {
      return {
        context: data.context as ProjectContextSnapshot,
        readiness: (data.readiness as Readiness) || "partial",
        version: data.context_version ?? 1,
      };
    }
  }

  const built = await buildProjectContext(supabase, projectId);
  const version = await saveProjectContext(supabase, projectId, built);
  return { context: built.context, readiness: built.readiness, version };
}

/** Mark the snapshot stale so the next generation rebuilds it. */
export async function markContextStale(supabase: any, projectId: string) {
  await supabase.from("project_context").update({ stale: true }).eq("project_id", projectId);
}

/** Renders the shared context blocks used by every generation prompt. */
export function renderContextBlocks(
  ctx: ProjectContextSnapshot,
  opts: { includeLocation?: boolean; includeProducts?: boolean; maxKeywords?: number } = {},
): string {
  const kws = ctx.keywords.slice(0, opts.maxKeywords ?? 20);
  const blocks: string[] = [];

  blocks.push(
    `BUSINESS CONTEXT:
- Brand: ${ctx.project.brand_name || ctx.project.domain || "unknown"}
- Website: ${ctx.project.website_url || "n/a"}
- Language: ${ctx.project.language}
- Type: ${ctx.project.business_type || "n/a"}
- Description: ${ctx.project.business_description || "n/a"}
- Audience: ${ctx.project.audience || ctx.target_audiences.join(", ") || "n/a"}
- Tone: ${ctx.tone || "professional"}`,
  );

  if (ctx.website.pages.length) {
    blocks.push(
      `WEBSITE CONTEXT (${ctx.website.pages_count} pages analysed):\n` +
        ctx.website.pages
          .slice(0, 12)
          .map(
            (p) =>
              `- [${p.page_type || "page"}] ${p.title || p.url} (${p.url})${p.meta_description ? ` — ${p.meta_description}` : ""}`,
          )
          .join("\n"),
    );
  }

  if (kws.length) {
    blocks.push(
      `TARGET KEYWORDS:\n` +
        kws
          .map(
            (k) =>
              `- ${k.keyword}${k.search_volume ? ` (vol ${k.search_volume}` : " ("}${k.cpc ? `, cpc ${k.cpc}` : ""}${k.intent ? `, intent ${k.intent}` : ""})`,
          )
          .join("\n"),
    );
    const intents = [...new Set(kws.map((k) => k.intent).filter(Boolean))];
    if (intents.length) blocks.push(`SEARCH INTENT: ${intents.join(", ")}`);
    const questions = kws.filter((k) => k.is_question).map((k) => k.keyword).slice(0, 10);
    if (questions.length) blocks.push(`QUESTIONS:\n` + questions.map((q) => `- ${q}`).join("\n"));
  }

  if (ctx.competitors.length) {
    blocks.push(`COMPETITOR INSIGHTS:\n` + ctx.competitors.slice(0, 8).map((c) => `- ${c}`).join("\n"));
  }

  if (opts.includeLocation && ctx.locations.length) {
    blocks.push(
      `LOCATION:\n` +
        ctx.locations
          .map((l) => `- ${l.name || ""} ${l.address || ""}`.trim())
          .join("\n"),
    );
  }

  if (opts.includeProducts && ctx.products.length) {
    blocks.push(
      `PRODUCT DATA:\n` +
        ctx.products
          .slice(0, 15)
          .map((p) => `- ${p.title || "product"}${p.category ? ` [${p.category}]` : ""}${p.price ? ` — ${p.price}` : ""}`)
          .join("\n"),
    );
  }

  return blocks.join("\n\n");
}

/**
 * Fail-safe context loader for the generation functions.
 *
 * Generation must NEVER be blocked by a missing/erroring provider (DataForSEO
 * in particular). This reads the snapshot, rebuilds it when needed, and falls
 * back to whatever is already stored (scraping, analyze-website, existing
 * keywords, competitors, questions) if anything throws.
 */
export async function loadGenerationContext(
  supabase: any,
  projectId: string,
  opts: { includeLocation?: boolean; includeProducts?: boolean; maxKeywords?: number } = {},
): Promise<{
  context: ProjectContextSnapshot | null;
  blocks: string;
  readiness: Readiness | "unknown";
  degraded: string[];
}> {
  const degraded: string[] = [];
  let context: ProjectContextSnapshot | null = null;
  let readiness: Readiness | "unknown" = "unknown";

  try {
    const res = await getProjectContext(supabase, projectId);
    context = res.context;
    readiness = res.readiness;
  } catch (e) {
    degraded.push(`snapshot unavailable (${(e as Error).message})`);
    try {
      const built = await buildProjectContext(supabase, projectId);
      context = built.context;
      readiness = built.readiness;
    } catch (e2) {
      degraded.push(`context rebuild failed (${(e2 as Error).message})`);
    }
  }

  if (!context) return { context: null, blocks: "", readiness, degraded };

  // Provider degradation is informational only — never a blocker.
  for (const [key, src] of Object.entries(context.sources || {})) {
    if (src.status !== "present") degraded.push(`${key}=${src.status}${src.detail ? ` (${src.detail})` : ""}`);
  }

  let blocks = renderContextBlocks(context, opts);

  const dfs = context.sources?.dataforseo;
  if (!dfs || dfs.status !== "present") {
    blocks +=
      `\n\nDATA NOTE: live search-volume data is unavailable (dataforseo=${dfs?.status ?? "missing"}${dfs?.detail ? `: ${dfs.detail}` : ""}).` +
      ` Use the keywords, website pages, competitors and questions listed above as the source of truth and prioritise by topical relevance instead of volume.`;
  }

  return { context, blocks, readiness, degraded };
}
