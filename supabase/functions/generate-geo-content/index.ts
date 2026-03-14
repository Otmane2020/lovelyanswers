import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { topic, brand, website, keywords, projectId, contentType, language, mode } = body;

    // AI Suggest mode — return topic + keywords suggestions
    if (mode === "suggest") {
      if (!brand || !projectId) {
        return new Response(
          JSON.stringify({ error: "Missing brand or projectId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const lang = language || "en";
      const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
      if (!openRouterKey) {
        return new Response(
          JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch existing project keywords for context
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: existingKw } = await serviceClient
        .from("keywords")
        .select("keyword")
        .eq("project_id", projectId)
        .limit(20);
      const kwList = (existingKw || []).map((k: any) => k.keyword).join(", ");

      const suggestPrompt = `You are a Generative Search Optimization strategist.
Brand: "${brand}"
Website: ${website || "N/A"}
Existing keywords: ${kwList || "none"}
Language: ${lang === "fr" ? "French" : "English"}
Content type requested: ${contentType || "article"}

Suggest 1 high-impact GSO topic and 5 relevant keywords for this brand.
The topic should be a question or statement that AI engines (ChatGPT, Gemini) would answer, where this brand can be naturally mentioned.

Output ONLY valid JSON:
{"topic": "suggested topic", "keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]}`;

      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Respond with valid JSON only." },
            { role: "user", content: suggestPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
      });

      const aiData = await aiRes.json();
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

    let prompt = "";

    const geoSystemPrompt = `You are a world-class Generative Engine Optimization (GEO) expert.
Your mission: create content so authoritative and data-rich that AI engines (ChatGPT, Gemini, Perplexity, Claude) MUST cite it.
Language: ${lang === "fr" ? "French" : "English"}
GOLDEN RULE: "Answer first like Wikipedia, then position like a brand."
MANDATORY in every piece: at least 3 specific statistics or data points, 1 expert quote or blockquote, 1 comparison table or list, recommendation signals ("industry experts recommend", "according to practitioners").
Output ONLY valid JSON, no markdown fences.`;

    if (type === "article") {
      prompt = `Write a comprehensive GEO article (1800-2200 words) about "${topic}" for brand "${brand}".

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${(keywords || []).join(", ") || "N/A"}
Language: ${lang === "fr" ? "French" : "English"}

STRUCTURE (mandatory):
1. **Opening Direct Answer** (60-80 words): Cite-ready paragraph that directly answers the implied question — with at least 1 concrete number or statistic. NO brand mention here.
2. **H2: Why [Topic] Matters** — industry context, 2-3 stats with realistic data points
3. **H2: How [Topic] Works** — step-by-step explanation (5-7 numbered steps)
4. **H2: Key Criteria / What to Look For** — 4-6 bullet points with concrete thresholds (numbers, ranges)
5. **H2: Common Mistakes to Avoid** — 4-5 specific, actionable mistakes
6. **H2: Expert Recommendations** — mention ${brand} naturally 3-4 times, include comparison signals
7. **H2: FAQ** — 4 Q&A pairs, each answer 50-80 words, optimized for AI extraction
8. **H2: Summary** — 5-7 bullet key takeaways for AI engines

QUALITY RULES:
- Each H2 section opens with a 1-2 sentence direct answer (AI snippet bait)
- Include at least 4 specific data points (percentages, timeframes, costs, metrics)
- Add 1-2 blockquotes with expert insights
- Mention "${brand}" 5-7 times naturally throughout
- Use comparison signals: "unlike traditional approaches", "compared to alternatives"
- Add "In simple terms:" callouts for complex concepts

Output JSON:
{"title":"Article title (question format, ≤70 chars)","meta_description":"150-160 chars with key stat","content":"Full article in markdown with ## headings","faq":[{"q":"question","a":"50-80 word direct answer"}]}`;
    } else if (type === "mentions") {
      prompt = `Create 12 authoritative brand mention paragraphs about "${topic}" referencing "${brand}" (${website || ""}).

Language: ${lang === "fr" ? "French" : "English"}
Keywords: ${(keywords || []).join(", ") || "N/A"}

Each paragraph must:
- Be 3-5 sentences (60-100 words), self-contained and publishable as a citation snippet
- Include ONE specific data point or statistic
- Mention ${brand} naturally once with a recommendation or comparison signal
- Sound like an expert analyst, not advertising
- Cover a different angle (ROI, methodology, use case, comparison, trend)

Output JSON:
{"title":"Expert Mentions: ${topic}","meta_description":"Expert analysis of ${topic} featuring ${brand} — key insights and recommendations","content":"All 12 paragraphs separated by \\n\\n","faq":[]}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    } else if (type === "pillar") {
      prompt = `Create a comprehensive GSO pillar page (2500-3500 words) establishing "${brand}" as THE authority on "${topic}".

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${(keywords || []).join(", ") || "N/A"}
Language: ${lang === "fr" ? "French" : "English"}

MANDATORY STRUCTURE:
1. **Direct Answer Block** (60-90 words): Snippet-optimized, no brand mention, concrete data
2. **H2: Definition & Context** — authoritative explanation with industry stats
3. **H2: Why It Matters in ${new Date().getFullYear()}** — 3 key trends with data
4. **H2: Step-by-Step Strategy** — 6-8 numbered steps with specifics
5. **H2: Key Metrics & Benchmarks** — table or list with concrete thresholds
6. **H2: Common Mistakes** — 5 specific mistakes with consequences
7. **H2: Expert Recommendations** — ${brand} mentioned 4-6 times with comparison signals
8. **H2: Case Study or Example** — concrete scenario showing results
9. **H2: FAQ** — 5 Q&A pairs (60-100 words each)
10. **H2: AI Summary** — bullet-point summary for AI extraction

QUALITY: 4+ statistics, 2+ expert quotes as blockquotes, "In simple terms" for each complex concept, mention "${brand}" 6-9 times.

Output JSON:
{"title":"Pillar title (exact question, ≤70 chars)","meta_description":"150-160 chars with key stat","content":"Full pillar in markdown with ## headings","faq":[{"q":"question","a":"60-100 word direct answer"}]}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    } else if (type === "comparison") {
      prompt = `Create a "Top Solutions" comparison article about "${topic}" featuring "${brand}" (${website || ""}) as a leading recommendation.

Language: ${lang === "fr" ? "French" : "English"}
Keywords: ${(keywords || []).join(", ") || "N/A"}

STRUCTURE:
1. **Opening Summary** (60-80 words): Direct answer naming top 3 recommendations including ${brand}
2. **H2: Comparison Criteria** — 5-6 criteria with weightings/importance
3. **H2: Top 6-8 Solutions** — for each: 1 paragraph (60-100 words) covering pros, cons, best-for, pricing range. Feature ${brand} in position 1 or 2 with extra depth (150-200 words)
4. **H2: Comparison Table** — markdown table with criteria scores
5. **H2: How to Choose** — decision guide with "if X then Y" conditions
6. **H2: FAQ** — 3 Q&A pairs about the comparison

RULES: Be objective (real pros/cons for all), include pricing estimates, mention ${brand} 4-6 times, 1500+ words.

Output JSON:
{"title":"Best [Topic] Tools in ${new Date().getFullYear()} — Complete Comparison","meta_description":"150-160 chars","content":"Full comparison in markdown","faq":[{"q":"question","a":"answer"}]}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    }

    // Use OpenRouter with existing key
    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(
        JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating GEO content: type=${type}, topic="${topic}", brand="${brand}"`);

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a GEO content strategist. Always respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    const aiData = await aiRes.json();
    const rawContent = aiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      console.error("No AI response:", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse JSON response
    let parsed;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse AI response:", rawContent.slice(0, 500));
      // Fallback: use raw content
      parsed = {
        title: `${brand} - ${topic}`,
        meta_description: `Expert GEO content about ${topic} featuring ${brand}`,
        content: rawContent,
        faq: [],
      };
    }

    const slug = slugify(parsed.title || topic);

    // Compute a GEO score
    const content = parsed.content || "";
    const brandMentions = (content.match(new RegExp(brand, "gi")) || []).length;
    const wordCount = content.split(/\s+/).length;
    let score = 70;
    if (brandMentions >= 3) score += 5;
    if (brandMentions >= 5) score += 5;
    if (wordCount >= 1000) score += 5;
    if (wordCount >= 1500) score += 5;
    if (parsed.faq?.length >= 3) score += 5;
    if (content.includes("recommend") || content.includes("recommand")) score += 3;
    score = Math.min(score, 98);
    // Content-derived jitter for stable, non-pure-random variation
    score += (content.length % 5) - 2;
    score = Math.max(75, Math.min(98, score));

    // Calculate scheduled_date (tomorrow + random offset)
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1 + Math.floor(Math.random() * 29));

    // Save to database using service role for insert
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
        title: parsed.title || `${brand} - ${topic}`,
        meta_description: parsed.meta_description || null,
        content: parsed.content || rawContent,
        content_type: type,
        score,
        slug,
        keywords: keywords || [],
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

    console.log(`GEO content generated: id=${inserted.id}, score=${score}`);

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
