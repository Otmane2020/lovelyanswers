// Shared DataForSEO client — real search volume / CPC / competition.
// Used by the onboarding pipeline (keyword enrichment) so generation prompts
// get real data instead of AI-estimated numbers.

const DFS = "https://api.dataforseo.com/v3";

/** DataForSEO location codes. */
export const LOCATION_BY_LANG: Record<string, number> = {
  fr: 2250, en: 2840, "en-uk": 2826, "en-gb": 2826, de: 2276, es: 2724, it: 2380,
  nl: 2528, pt: 2620, pl: 2616, sv: 2752, da: 2208, no: 2578, fi: 2246,
};

export interface DfsKeyword {
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  difficulty: number | null;
}

export function dfsCredentials(): { login: string; password: string } | null {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  if (!login || !password) return null;
  return { login, password };
}

async function dfsPost(path: string, payload: unknown[]): Promise<any> {
  const creds = dfsCredentials();
  if (!creds) throw new Error("dataforseo_not_configured");
  const res = await fetch(`${DFS}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${creds.login}:${creds.password}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`DataForSEO ${path} HTTP ${res.status}: ${detail}`);
  }
  const json = await res.json();
  // DFS answers 200 with a task-level error code on quota / access problems.
  const task = json?.tasks?.[0];
  if (task && task.status_code && task.status_code >= 40000) {
    throw new Error(`DataForSEO ${path} task ${task.status_code}: ${task.status_message}`);
  }
  return json;
}

export function locationCode(language: string): number {
  return LOCATION_BY_LANG[(language || "en").toLowerCase()] ?? 2840;
}

export function langCode(language: string): string {
  return (language || "en").toLowerCase().split("-")[0];
}

/** Real monthly volume + CPC for a list of keywords (max 700 per DFS call). */
export async function keywordVolumes(
  keywords: string[],
  language: string,
): Promise<DfsKeyword[]> {
  const unique = [...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))].slice(0, 700);
  if (!unique.length) return [];

  const json = await dfsPost("/keywords_data/google_ads/search_volume/live", [{
    keywords: unique,
    location_code: locationCode(language),
    language_code: langCode(language),
  }]);

  const items = json?.tasks?.[0]?.result ?? [];
  return items.map((i: any) => ({
    keyword: i.keyword,
    search_volume: i.search_volume ?? null,
    cpc: i.cpc ?? null,
    competition: typeof i.competition_index === "number" ? i.competition_index : null,
    difficulty: typeof i.competition_index === "number" ? Math.round(i.competition_index) : null,
  }));
}

/** Keyword ideas around seed terms (long-tail + question discovery). */
export async function keywordIdeas(
  seeds: string[],
  language: string,
  limit = 200,
): Promise<DfsKeyword[]> {
  const cleanSeeds = [...new Set(seeds.map((s) => s.trim()).filter(Boolean))].slice(0, 20);
  if (!cleanSeeds.length) return [];

  const json = await dfsPost("/dataforseo_labs/google/keyword_ideas/live", [{
    keywords: cleanSeeds,
    location_code: locationCode(language),
    language_code: langCode(language),
    limit,
    order_by: ["keyword_info.search_volume,desc"],
  }]);

  const items = json?.tasks?.[0]?.result?.[0]?.items ?? [];
  return items.map((i: any) => ({
    keyword: i.keyword,
    search_volume: i.keyword_info?.search_volume ?? null,
    cpc: i.keyword_info?.cpc ?? null,
    competition: i.keyword_info?.competition_level === "HIGH" ? 80
      : i.keyword_info?.competition_level === "MEDIUM" ? 50
      : i.keyword_info?.competition_level === "LOW" ? 20 : null,
    difficulty: i.keyword_properties?.keyword_difficulty ?? null,
  }));
}

const QUESTION_RE =
  /^(how|what|why|when|where|which|who|is|are|can|do|does|should|best|comment|pourquoi|quoi|quel|quelle|quels|quelles|quand|où|est-ce|combien|qui|cómo|qué|por qué|wie|was|warum)\b/i;

export function isQuestion(keyword: string): boolean {
  return QUESTION_RE.test(keyword.trim()) || keyword.trim().endsWith("?");
}

export function classifyIntent(keyword: string): string {
  const q = keyword.toLowerCase();
  if (/\b(buy|price|cost|cheap|order|shop|acheter|prix|tarif|commander|devis)\b/.test(q)) return "transactional";
  if (/\b(best|top|vs|versus|compare|review|alternative|meilleur|comparatif|avis)\b/.test(q)) return "commercial";
  if (/\b(how|what|why|guide|tutorial|comment|pourquoi|quoi|guide)\b/.test(q) || isQuestion(q)) return "informational";
  return "navigational";
}
