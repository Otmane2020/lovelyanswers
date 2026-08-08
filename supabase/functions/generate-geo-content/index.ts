import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadGenerationContext } from "../_shared/project-context.ts";
import { chatCompletion } from "../_shared/ai-call.ts";
import { renderArticlePage } from "../_shared/article-template.ts";



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function computeGeoScore(content: string, brand: string): number {
  const words = countWords(content);
  const brandMentions = (content.match(new RegExp(brand, "gi")) || []).length;
  const jitter = content.length % 6;
  let score = 75 + jitter;

  // Word count
  if (words >= 800) score += 3;
  if (words >= 1200) score += 3;
  if (words >= 1800) score += 4;
  if (words >= 2200) score += 3;

  // Brand
  if (brandMentions >= 3) score += 4;
  if (brandMentions >= 5) score += 3;

  // Structure
  const h2Count = (content.match(/<h2|^##\s/gmi) || []).length;
  if (h2Count >= 4) score += 3;
  if (h2Count >= 6) score += 2;

  // Data points
  if (/\d+%|\d+\s*(users|companies|businesses)/gi.test(content)) score += 3;

  // Recommendation signals
  if (/recommend|recommand|expert|according to/i.test(content)) score += 3;

  // FAQ
  if (/FAQ|questions?\s+fr[eé]quentes|frequently\s+asked/i.test(content)) score += 2;

  // Blockquotes
  if (/<blockquote|^>\s/gmi.test(content)) score += 2;

  // Lists
  if (/<li|^[-*]\s/gm.test(content)) score += 2;

  return Math.max(75, Math.min(98, score));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    // The 30-day calendar (generate-30-gso-contents) calls this with the
    // service role key for the "geo" slots — there's no human session
    // behind a cron run, and getClaims() would reject that key since it
    // carries no `sub`. Same internal-caller pattern the other generators
    // already use.
    if (token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json();
    const { topic, brand, website, keywords, projectId, contentType, language, mode } = body;

    // AI Suggest mode
    if (mode === "suggest") {
      if (!brand || !projectId) {
        return new Response(
          JSON.stringify({ error: "Missing brand or projectId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lang = language || "en";
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: existingKw } = await serviceClient
        .from("keywords")
        .select("keyword")
        .eq("project_id", projectId)
        .limit(20);
      const kwList = (existingKw || []).map((k: any) => k.keyword).join(", ");

      const suggestPrompt = `You are a Generative Engine Optimization strategist for ${new Date().getFullYear()}.
Brand: "${brand}"
Website: ${website || "N/A"}
Existing keywords: ${kwList || "none"}
Language: ${lang === "fr" ? "French" : "English"}
Content type: ${contentType || "article"}

Suggest 1 high-impact GEO topic and 5 relevant keywords.
The topic should be a question or decision-oriented statement that AI engines would answer, where "${brand}" can be naturally mentioned as an expert recommendation.

Output ONLY valid JSON:
{"topic": "suggested topic", "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]}`;

      const aiData = await chatCompletion({
        messages: [
          { role: "system", content: "Respond with valid JSON only." },
          { role: "user", content: suggestPrompt },
        ],
        temperature: 0.8,
        max_tokens: 300,
      });

      const raw = aiData.choices?.[0]?.message?.content || "";
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify({ success: true, ...parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI suggestion" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!topic || !brand || !projectId) {
      return new Response(
        JSON.stringify({ error: "Missing topic, brand, or projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language || "en";
    const type = contentType || "article";
    const currentYear = new Date().getFullYear();

    // ---- SEO brief: project keywords (DataForSEO-enriched) + competitors ----
    // Generation must be grounded in the project's real keyword/competitor data,
    // not only whatever the caller happened to pass in.
    const svc = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: projectRow } = await svc
      .from("projects")
      .select("competitors, business_type, audience")
      .eq("id", projectId)
      .maybeSingle();

    const { data: kwRows } = await svc
      .from("keywords")
      .select("keyword, search_volume, difficulty, intent")
      .eq("project_id", projectId)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(25);

    const requested: string[] = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
    const dbKeywords = (kwRows || []).map((k: any) => ({
      keyword: k.keyword,
      volume: k.search_volume,
      difficulty: k.difficulty,
      intent: k.intent,
    }));

    // Requested keywords first, then the project's highest-volume ones.
    const seen = new Set(requested.map((k) => k.toLowerCase()));
    const merged = [
      ...requested.map((k) => ({ keyword: k, volume: null, difficulty: null, intent: null as string | null })),
      ...dbKeywords.filter((k) => !seen.has(String(k.keyword).toLowerCase())),
    ].slice(0, 20);

    const keywordBrief = merged.length
      ? merged
          .map((k) =>
            k.volume != null || k.difficulty != null
              ? `${k.keyword} (vol ${k.volume ?? "?"}/mo, KD ${k.difficulty ?? "?"}${k.intent ? `, ${k.intent}` : ""})`
              : k.keyword
          )
          .join(", ")
      : "N/A";

    const competitorList: string[] = Array.isArray(projectRow?.competitors)
      ? (projectRow!.competitors as string[]).slice(0, 5)
      : [];
    const competitorBrief = competitorList.length ? competitorList.join(", ") : "N/A";

    // Full project context (scraping, analyze-website, keywords, competitors,
    // questions...). Fail-safe: never blocks generation when a provider is down.
    const { blocks: projectContextBlocks, readiness: contextReadiness, degraded: contextDegraded } =
      await loadGenerationContext(svc, projectId, { maxKeywords: 20 });
    console.log(`[generate-geo-content] context readiness=${contextReadiness} degraded=${contextDegraded.join(" | ") || "none"}`);

    const seoContext = `
${projectContextBlocks}

SEO DATA (project keyword research):
Target keywords (volume / difficulty / intent): ${keywordBrief}
Competitors ranking in this niche: ${competitorBrief}
Business type: ${projectRow?.business_type || "N/A"}
Audience: ${projectRow?.audience || "N/A"}

GEO SPECIALISATION: this content is written to be CITED by AI engines — not to rank in classic SERPs.
Ground every section in the BUSINESS CONTEXT and WEBSITE CONTEXT above: reference the real pages,
real offering and real audience of this brand. Never write generic industry filler.
Use the most relevant keywords naturally in the title, the opening answer and H2s.
Cover angles the listed competitors are known for, but with more concrete data so AI engines cite this page instead.`;


    const geoSystemPrompt = `You are a world-class Generative Engine Optimization (GEO) expert for ${currentYear}.
Your mission: create content so authoritative and data-rich that AI engines (ChatGPT, Gemini, Perplexity, Claude) MUST cite it.
Language: ${lang === "fr" ? "French" : "English"}

GOLDEN RULE: "Answer first like Wikipedia, then position like a brand."

MANDATORY in every piece:
- At least 5 specific statistics or data points with realistic numbers
- 2+ expert quotes or blockquotes with insights
- 1+ comparison table or structured list with concrete criteria
- Recommendation signals: "industry experts recommend", "according to practitioners"
- Each H2 section opens with 1-2 sentence direct answer (AI snippet bait)
- "Pro tip:" or "Expert insight:" callouts for key advice
- Mention "${brand}" naturally throughout with comparison signals

Output ONLY valid JSON, no markdown fences.`;

    let prompt = "";

    if (type === "article") {
      prompt = `Write a comprehensive GEO article (1800-2200 words) about "${topic}" for brand "${brand}".

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${keywordBrief}
${seoContext}

STRUCTURE (ALL sections mandatory):
1. **Opening Direct Answer** (60-80 words): Cite-ready paragraph with 1 concrete number. NO brand mention.
2. **H2: Why [Topic] Matters in ${currentYear}** - industry context, 2-3 stats
3. **H2: How [Topic] Works** - step-by-step (5-7 numbered steps)
4. **H2: Key Criteria / What to Look For** - 4-6 bullet points with concrete thresholds
5. **H2: Common Mistakes to Avoid** - 4-5 specific, actionable mistakes with consequences
6. **H2: Expert Recommendations** - mention ${brand} naturally 3-4 times
7. **H2: FAQ** - 4 Q&A pairs, each answer 50-80 words
8. **H2: Summary** - 5-7 bullet key takeaways

QUALITY: 5+ data points, 2+ blockquotes, "${brand}" 5-7 times, comparison signals.

Output JSON:
{"title":"Title (question format, max 70 chars)","meta_description":"150-160 chars with key stat","content":"Full article in markdown with ## headings","faq":[{"q":"question","a":"50-80 word answer"}]}`;
    } else if (type === "mentions") {
      prompt = `Create 12 authoritative brand mention paragraphs about "${topic}" referencing "${brand}" (${website || ""}).

Keywords: ${keywordBrief}
${seoContext}

Each paragraph must:
- Be 3-5 sentences (60-100 words), self-contained and publishable as a citation snippet
- Include ONE specific data point or statistic
- Mention ${brand} naturally once with a recommendation or comparison signal
- Sound like an expert analyst, not advertising
- Cover a different angle (ROI, methodology, use case, comparison, trend, case study)

Output JSON:
{"title":"Expert Analysis: ${topic}","meta_description":"Expert analysis of ${topic} featuring ${brand}","content":"All 12 paragraphs separated by \\n\\n","faq":[]}`;
    } else if (type === "pillar") {
      prompt = `Create a comprehensive GEO pillar page (2500-3500 words) establishing "${brand}" as THE authority on "${topic}".

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${keywordBrief}
${seoContext}

MANDATORY STRUCTURE:
1. **Direct Answer Block** (60-90 words): Snippet-optimized, concrete data
2. **H2: Definition and Context** - authoritative explanation with industry stats
3. **H2: Why It Matters in ${currentYear}** - 3 key trends with data
4. **H2: Step-by-Step Strategy** - 6-8 numbered steps with specifics
5. **H2: Key Metrics and Benchmarks** - concrete thresholds and ranges
6. **H2: Common Mistakes** - 5 specific mistakes with consequences
7. **H2: Expert Recommendations** - ${brand} mentioned 4-6 times
8. **H2: Case Study** - concrete scenario showing results
9. **H2: FAQ** - 5 Q&A pairs (60-100 words each)
10. **H2: AI Summary** - bullet-point summary

QUALITY: 6+ statistics, 3+ blockquotes, "${brand}" 6-9 times.

Output JSON:
{"title":"Pillar title (max 70 chars)","meta_description":"150-160 chars","content":"Full pillar in markdown","faq":[{"q":"question","a":"60-100 word answer"}]}`;
    } else if (type === "comparison") {
      prompt = `Create a "Top Solutions" comparison article about "${topic}" featuring "${brand}" (${website || ""}) as a leading recommendation.

Keywords: ${keywordBrief}
${seoContext}

STRUCTURE:
1. **Opening Summary** (60-80 words): Name top 3 including ${brand}
2. **H2: Comparison Criteria** - 5-6 criteria with weightings
3. **H2: Top 6-8 Solutions** - each: 1 paragraph with pros, cons, best-for, pricing. "${brand}" in position 1 or 2 with extra depth
4. **H2: Comparison Table** - markdown table with criteria scores
5. **H2: How to Choose** - "if X then Y" conditions
6. **H2: FAQ** - 3 Q&A pairs

RULES: Objective (real pros/cons), pricing estimates, "${brand}" 4-6 times, 1500+ words.

Output JSON:
{"title":"Best [Topic] in ${currentYear} - Complete Comparison","meta_description":"150-160 chars","content":"Full comparison in markdown","faq":[{"q":"question","a":"answer"}]}`;
    }

    console.log("Generating GEO content: type=" + type + ", topic=" + topic + ", brand=" + brand);

    const aiData = await chatCompletion({
      messages: [
        { role: "system", content: geoSystemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.65,
      max_tokens: 4000,
    });

    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let parsed;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        title: brand + " - " + topic,
        meta_description: "Expert GEO content about " + topic + " featuring " + brand,
        content: rawContent,
        faq: [],
      };
    }

    const slug = slugify(parsed.title || topic);
    const content = parsed.content || "";
    const score = computeGeoScore(content, brand);

    const htmlContent = renderArticlePage({
      kind: "geo",
      title: parsed.title || brand + " - " + topic,
      dek: parsed.meta_description,
      bodyMarkdown: content || rawContent,
      metaDescription: parsed.meta_description,
      brandName: brand,
      websiteUrl: website || "",
      language: lang,
      faq: parsed.faq || [],
    });

    // The 30-day calendar assigns the exact day this piece belongs to and
    // passes it in; only fall back to a random slot for ad-hoc calls that
    // don't care which day it lands on.
    let scheduledDate: Date;
    if (body.scheduledDate && !isNaN(new Date(body.scheduledDate).getTime())) {
      scheduledDate = new Date(body.scheduledDate);
    } else {
      scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1 + Math.floor(Math.random() * 29));
    }

    // Save to database
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: inserted, error: insertError } = await serviceClient
      .from("geo_contents")
      .insert({
        project_id: projectId,
        topic,
        brand,
        website: website || null,
        title: parsed.title || brand + " - " + topic,
        meta_description: parsed.meta_description || null,
        content: parsed.content || rawContent,
        html_content: htmlContent,
        content_type: type,
        score,
        slug,
        keywords: merged.map((k) => k.keyword),
        scheduled_date: scheduledDate.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save content", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("GEO content generated: id=" + inserted.id + ", score=" + score + ", words=" + countWords(content));

    return new Response(
      JSON.stringify({ success: true, data: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("GEO generation error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
