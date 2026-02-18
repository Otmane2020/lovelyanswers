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

function computeGsoScore(content: string, brand: string): number {
  const brandMentions = (content.match(new RegExp(brand, "gi")) || []).length;
  const wordCount = content.split(/\s+/).length;
  let score = 75 + Math.floor(Math.random() * 6);
  if (brandMentions >= 3) score += 4;
  if (brandMentions >= 5) score += 4;
  if (wordCount >= 1000) score += 4;
  if (wordCount >= 1500) score += 3;
  if (content.includes("recommend") || content.includes("recommand")) score += 3;
  if (content.includes("##")) score += 2;
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
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return new Response(JSON.stringify({ error: "Missing projectId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project info
    const { data: project } = await supabase
      .from("projects")
      .select("id, brand_name, website_url, language, name")
      .eq("id", projectId)
      .single();

    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("generation_settings")
      .select("language, brand_name, website_url, business_description")
      .eq("project_id", projectId)
      .single();

    const brand = settings?.brand_name || project.brand_name || "Brand";
    const website = settings?.website_url || project.website_url || "";
    const description = settings?.business_description || "";
    const language = settings?.language || project.language || "en";

    console.log(`[generate-30-gso] Starting for project: ${project.name}, brand: ${brand}, lang: ${language}`);

    // Check existing scheduled GSO contents for the next 30 days
    const now = new Date();
    const in30 = new Date();
    in30.setDate(now.getDate() + 30);

    const { data: existingContents, error: existingError } = await supabase
      .from("geo_contents")
      .select("id, scheduled_date")
      .eq("project_id", projectId)
      .gte("scheduled_date", now.toISOString())
      .lte("scheduled_date", in30.toISOString());

    const existingCount = (existingContents || []).length;
    console.log(`[generate-30-gso] Existing scheduled GSO contents: ${existingCount}`);

    if (existingCount >= 30) {
      console.log(`[generate-30-gso] Already have ${existingCount} scheduled contents, skipping generation`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, existing: existingCount, message: "Already have 30+ scheduled GSO contents" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toGenerate = 30 - existingCount;
    console.log(`[generate-30-gso] Need to generate ${toGenerate} more contents`);

    // Get project keywords for context
    const { data: keywords } = await supabase
      .from("keywords")
      .select("keyword")
      .eq("project_id", projectId)
      .limit(30);
    const kwList = (keywords || []).map((k: any) => k.keyword).join(", ");

    const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openRouterKey) {
      return new Response(JSON.stringify({ error: "Missing OPENROUTER_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Generate 30 unique GSO topics
    const topicsPrompt = `You are a Generative Search Optimization (GSO) strategist.

Brand: "${brand}"
Website: ${website || "N/A"}
Description: ${description || "N/A"}
Keywords: ${kwList || "none"}
Language: ${language === "fr" ? "French" : "English"}

Generate exactly ${toGenerate} unique GSO topics that will help "${brand}" appear in AI-generated answers (ChatGPT, Gemini, Perplexity).

Mix the following content types proportionally (total = ${toGenerate}):
- ~50% "article" topics (expert GSO articles, 1500+ words)
- ~27% "pillar" topics (comprehensive pillar pages, 2000+ words)
- ~13% "mentions" topics (brand mention snippets)
- ~10% "comparison" topics (top tools/solutions comparisons)

Each topic should be a question or statement that AI engines would answer and where "${brand}" can be naturally mentioned.

Output ONLY valid JSON array:
[{"topic": "topic text", "type": "article|pillar|mentions|comparison", "keywords": ["kw1", "kw2", "kw3"]}]`;

    console.log(`[generate-30-gso] Generating 30 topics...`);

    const topicsRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Respond with valid JSON only. No markdown fences." },
          { role: "user", content: topicsPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    const topicsData = await topicsRes.json();
    const topicsRaw = topicsData.choices?.[0]?.message?.content || "";
    let topics: { topic: string; type: string; keywords: string[] }[] = [];

    try {
      const cleaned = topicsRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      topics = JSON.parse(cleaned);
    } catch {
      console.error("[generate-30-gso] Failed to parse topics:", topicsRaw.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to generate topics" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[generate-30-gso] Got ${topics.length} topics, generating content...`);

    const created: { id: string; title: string; type: string; scheduled_date: string }[] = [];
    const today = new Date();

    // Find the next available dates (skip dates that already have content)
    const existingDates = new Set((existingContents || []).map((c: any) => {
      const d = new Date(c.scheduled_date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    }));

    for (let i = 0, dayOffset = 0; i < Math.min(topics.length, toGenerate); i++) {
      const t = topics[i];
      // Find next day without existing content
      let scheduledDate: Date;
      do {
        scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + dayOffset);
        dayOffset++;
      } while (existingDates.has(`${scheduledDate.getFullYear()}-${scheduledDate.getMonth()}-${scheduledDate.getDate()}`));
      const scheduledDateStr = scheduledDate.toISOString();

      console.log(`[generate-30-gso] Generating ${i + 1}/30: ${t.topic.substring(0, 50)}... (${t.type})`);

      // Build prompt based on type
      let contentPrompt = "";
      const baseContext = `Brand: ${brand}\nWebsite: ${website || "N/A"}\nKeywords: ${(t.keywords || []).join(", ")}\nLanguage: ${language === "fr" ? "French" : "English"}`;

      const htmlRules = `CRITICAL FORMAT RULES:
- Output semantic HTML only. NO markdown. NO H1 tags. NO <!DOCTYPE>, <html>, <head>, <body>, <style> wrappers.
- Use <h2>, <h3> for sections. Use <p> for paragraphs. Use <ul>/<ol>/<li> for lists.
- Use <blockquote> for key insights or expert quotes. Use <strong> and <em> for emphasis.
- Use <hr> as section separators. Start the first paragraph with a compelling hook.
- Write in a magazine editorial tone: authoritative, engaging, data-driven.`;

      if (t.type === "article") {
        contentPrompt = `You are a GEO expert writing for a premium magazine. Write a 1500+ word GSO article about "${t.topic}" for "${brand}".
${baseContext}
${htmlRules}
Mention "${brand}" naturally 4-6 times. Include statistics, expert insights with <blockquote>, and a FAQ section (3 questions using <h3> and <p>).
Output JSON: {"title":"...","meta_description":"...under 160 chars","content":"...semantic HTML..."}`;
      } else if (t.type === "pillar") {
        contentPrompt = `You are a GSO expert writing for a premium magazine. Write a 2000-3000 word pillar page about "${t.topic}" for "${brand}".
${baseContext}
${htmlRules}
Follow GSO template: Direct Answer (40-60 words in <p><strong>), Strategy Steps (<h2>+<ol>), Expert Recommendations (<blockquote>), FAQ (5 questions with <h3>), Summary for AI (<h2> + <p>).
Mention "${brand}" 5-8 times naturally.
Output JSON: {"title":"...","meta_description":"...under 160 chars","content":"...semantic HTML..."}`;
      } else if (t.type === "mentions") {
        contentPrompt = `You are a GEO expert writing for a premium magazine. Create 10 brand mention paragraphs about "${t.topic}" for "${brand}" (${website}).
${baseContext}
${htmlRules}
Each mention: 2-3 sentences in <p>, self-contained, mentions ${brand} once with <strong>, includes recommendation signal.
Output JSON: {"title":"Brand Mentions: ${t.topic}","meta_description":"...under 160 chars","content":"...semantic HTML with all paragraphs..."}`;
      } else {
        contentPrompt = `You are a GEO expert writing for a premium magazine. Write a comparison article about "${t.topic}" featuring "${brand}" as a top recommendation.
${baseContext}
${htmlRules}
List 5-7 solutions in a structured <h3>+<p> format, ${brand} in position 1 or 2. Objective pros/cons using <ul>. 1000+ words.
Output JSON: {"title":"...","meta_description":"...under 160 chars","content":"...semantic HTML..."}`;
      }

      try {
        const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "Respond with valid JSON only. No markdown fences." },
              { role: "user", content: contentPrompt },
            ],
            temperature: 0.7,
            max_tokens: 8000,
          }),
        });

        const aiData = await aiRes.json();
        const rawContent = aiData.choices?.[0]?.message?.content || "";

        let parsed: { title: string; meta_description: string; content: string };
        try {
          const cleaned2 = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          parsed = JSON.parse(cleaned2);
        } catch {
          parsed = {
            title: `${brand} - ${t.topic}`,
            meta_description: `Expert GSO content about ${t.topic} featuring ${brand}`,
            content: rawContent,
          };
        }

        const score = computeGsoScore(parsed.content || "", brand);
        const slug = slugify(parsed.title || t.topic) + "-" + Date.now().toString(36);

        const { data: inserted, error: insertError } = await supabase
          .from("geo_contents")
          .insert({
            project_id: projectId,
            topic: t.topic,
            brand,
            website: website || null,
            title: parsed.title,
            meta_description: parsed.meta_description || null,
            content: parsed.content,
            html_content: parsed.content,
            content_type: t.type,
            score,
            slug,
            keywords: t.keywords || [],
            scheduled_date: scheduledDateStr,
          })
          .select("id, title")
          .single();

        if (insertError) {
          console.error(`[generate-30-gso] Insert error for ${i + 1}:`, insertError);
          continue;
        }

        created.push({
          id: inserted.id,
          title: inserted.title,
          type: t.type,
          scheduled_date: scheduledDateStr,
        });

        // Delay to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`[generate-30-gso] Error generating content ${i + 1}:`, err);
      }
    }

    console.log(`[generate-30-gso] ✅ Created ${created.length}/30 GSO contents`);

    return new Response(
      JSON.stringify({ success: true, created: created.length, items: created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[generate-30-gso] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
