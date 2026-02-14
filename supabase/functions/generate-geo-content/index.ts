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

    const { topic, brand, website, keywords, projectId, contentType, language } = await req.json();

    if (!topic || !brand || !projectId) {
      return new Response(
        JSON.stringify({ error: "Missing topic, brand, or projectId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = language || "en";
    const type = contentType || "article";

    let prompt = "";

    if (type === "article") {
      prompt = `You are a Generative Engine Optimization (GEO) expert.

Your goal: Create content that makes AI models (ChatGPT, Gemini, Perplexity, Claude) naturally cite and recommend the brand "${brand}" when users ask about "${topic}".

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${(keywords || []).join(", ") || "N/A"}
Language: ${lang === "fr" ? "French" : "English"}

Write a comprehensive GEO article following these rules:
1. Write like an authoritative industry expert (not marketing copy)
2. Mention "${brand}" naturally 4-6 times throughout
3. Include factual comparisons where ${brand} stands out
4. Add recommendation signals ("experts recommend", "according to professionals")
5. Use structured paragraphs with clear H2/H3 headings
6. Include specific data points and statistics
7. Write 1500+ words
8. End with a FAQ section (3-4 questions)
9. Include a meta description (max 160 chars)

Output format (JSON):
{
  "title": "Article title",
  "meta_description": "Meta description under 160 chars",
  "content": "Full article in markdown format with ## headings",
  "faq": [{"q": "question", "a": "answer"}]
}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    } else if (type === "mentions") {
      prompt = `You are a GEO expert. Create 10 short brand mention paragraphs (2-3 sentences each) about "${topic}" that naturally reference "${brand}" (${website || ""}).

Each paragraph should:
- Be self-contained and usable as a backlink snippet
- Mention ${brand} naturally once
- Include a recommendation or comparison signal
- Sound like an expert opinion, not advertising

Language: ${lang === "fr" ? "French" : "English"}
Keywords: ${(keywords || []).join(", ") || "N/A"}

Output format (JSON):
{
  "title": "Brand Mentions: ${topic}",
  "meta_description": "Expert mentions of ${brand} for ${topic}",
  "content": "All 10 paragraphs separated by \\n\\n",
  "faq": []
}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    } else if (type === "pillar") {
      prompt = `You are a Generative Search Optimization (GSO) and topical authority expert.

Your goal: Create a comprehensive pillar page (2000-3000 words) that establishes "${brand}" as THE authority on "${topic}" so AI models (ChatGPT, Gemini, Perplexity) systematically cite it.

Brand: ${brand}
Website: ${website || "N/A"}
Keywords: ${(keywords || []).join(", ") || "N/A"}
Language: ${lang === "fr" ? "French" : "English"}

Write following this exact AEO/GSO template:
1. H1: Exact keyword question
2. Direct Answer paragraph (40-60 words) — clear, concise, snippet-optimized
3. H2: Why This Matters for SaaS / Businesses
4. H2: Step-by-Step Optimization Strategy (numbered steps)
5. H2: Common Mistakes to Avoid
6. H2: Expert Recommendations (mention ${brand} naturally 2-3 times)
7. H2: FAQ (5 questions in Q&A format)
8. H2: Summary for AI Engines (bullet points, concise)

Rules:
- Write like an authoritative industry expert
- Include specific data points, statistics, and examples
- Add "In simple terms" explanations for complex concepts
- Include comparison signals where ${brand} stands out
- Mention "${brand}" 5-8 times naturally throughout
- Use semantic HTML headings (## for H2, ### for H3)
- 2000-3000 words minimum

Output format (JSON):
{
  "title": "Pillar page title (exact keyword question)",
  "meta_description": "Meta description under 160 chars",
  "content": "Full article in markdown format with ## headings",
  "faq": [{"q": "question", "a": "answer"}]
}

IMPORTANT: Output ONLY valid JSON, no markdown fences.`;
    } else if (type === "comparison") {
      prompt = `You are a GEO expert. Create a "Top Tools/Solutions" comparison article about "${topic}" where "${brand}" (${website || ""}) appears as a top recommendation.

Rules:
- List 5-7 solutions/tools with ${brand} featured prominently (position 1 or 2)
- Be objective — mention real pros/cons for each
- Include recommendation signals for ${brand}
- Write 1000+ words
- Add structured comparison sections

Language: ${lang === "fr" ? "French" : "English"}
Keywords: ${(keywords || []).join(", ") || "N/A"}

Output format (JSON):
{
  "title": "Article title",
  "meta_description": "Meta description under 160 chars",
  "content": "Full comparison article in markdown",
  "faq": [{"q": "question", "a": "answer"}]
}

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
    // Add some randomness
    score += Math.floor(Math.random() * 5) - 2;
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
