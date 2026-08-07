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
  locations: Array<{ name: string | null; address: string | null; city: string | null }>;
  products: Array<{ title: string | null; description: string | null; category: string | null; price: number | null }>;
  tone: string | null;
  built_at: string;
}

export type Readiness = "ready" | "partial" | "insufficient";

function excerpt(text: string | null, len = 600): string | null {
  if (!text) return null;
  return text.replace(/\s+/g, " ").trim().slice(0, len);
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
      .select("url, page_type, title, meta_description, headings, word_count, lang, content")
      .eq("project_id", projectId)
      .order("word_count", { ascending: false })
      .limit(40),
    supabase
      .from("keywords")
      .select("keyword, search_volume, cpc, difficulty, intent, cluster, is_question")
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
      .select("name, address, city")
      .eq("project_id", projectId)
      .limit(10);
    locations = data || [];
  } catch (_e) { /* optional */ }
  try {
    const { data } = await supabase
      .from("shopping_products")
      .select("title, description, category, price")
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
    keywords: keywords,
    competitors,
    target_audiences: Array.isArray(settings.target_audiences) ? settings.target_audiences : [],
    locations,
    products,
    tone: settings.tone ?? null,
    built_at: new Date().toISOString(),
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
          .map((l) => `- ${l.name || ""} ${l.address || ""} ${l.city || ""}`.trim())
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
