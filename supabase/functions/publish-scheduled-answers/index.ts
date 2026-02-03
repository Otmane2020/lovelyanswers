import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Answer {
  id: string;
  project_id: string;
  question: string;
  answer: string;
  slug: string;
  article_id: string | null;
  supporting_content: {
    bullets?: string[];
    faq?: { question?: string; q?: string; answer?: string; a?: string }[];
  };
  scheduled_date: string;
}

interface Article {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  html_content: string | null;
  scheduled_date: string;
  linked_answer_id: string | null;
}

interface LocalAnswer {
  id: string;
  project_id: string;
  business_id: string;
  business_name: string;
  question: string;
  answer: string;
  slug: string;
  scheduled_date: string;
}

interface Integration {
  id: string;
  platform: string;
  config: Record<string, string>;
  is_connected: boolean;
}

interface Project {
  id: string;
  brand_name: string | null;
  name: string;
  website_url: string;
  language: string;
}

interface ProjectSettings {
  project_id: string;
  auto_publish_enabled: boolean;
  publish_hour: string;
  timezone: string | null;
  publish_frequency: string | null;
}

// Convert UTC time to local hour in a specific timezone
function getLocalHour(timezone: string): number {
  try {
    const now = new Date();
    // Use numeric hour to avoid locale issues with "24" vs "00"
    const formatter = new Intl.DateTimeFormat("en-US", { 
      timeZone: timezone, 
      hour: "numeric", 
      hour12: false 
    });
    const parts = formatter.formatToParts(now);
    const hourPart = parts.find(p => p.type === "hour");
    const hour = parseInt(hourPart?.value || "0", 10);
    // Handle midnight: some locales return 24 instead of 0
    return hour === 24 ? 0 : hour;
  } catch (e) {
    console.error(`[publish-scheduled] ⚠️ Invalid timezone: ${timezone}, falling back to UTC`);
    return new Date().getUTCHours();
  }
}

// Check if today matches the frequency schedule
function shouldPublishToday(frequency: string | null): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dayOfMonth = today.getDate();
  
  switch (frequency) {
    case "weekly":
      // Publish only on Mondays (day 1)
      return dayOfWeek === 1;
    case "monthly":
      // Publish only on the 1st of the month
      return dayOfMonth === 1;
    case "daily":
    default:
      // Daily publishing
      return true;
  }
}

function generateAnswerHTML(
  answer: Answer,
  project: Project
): { title: string; body: string } {
  const { question, answer: answerText, supporting_content } = answer;
  const brandName = project.brand_name || project.name;
  const websiteUrl = project.website_url;
  const language = project.language || "fr";

  const bullets = supporting_content?.bullets || [];
  const rawFaq = supporting_content?.faq || [];
  const faq = rawFaq.map(item => ({
    question: item.question || item.q || "",
    answer: item.answer || item.a || ""
  })).filter(item => item.question && item.answer);

  const currentYear = new Date().getFullYear();

  const qaJsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "text": question,
      "dateCreated": new Date().toISOString(),
      "answerCount": 1,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answerText,
        "dateCreated": new Date().toISOString(),
        "author": {
          "@type": "Organization",
          "name": brandName,
          "url": websiteUrl
        }
      }
    }
  };

  const faqJsonLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  const bulletsList = bullets.length > 0 
    ? `<section class="aeo-key-points" style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px;">
        <h2 style="font-size: 18px; margin-bottom: 16px; color: #1a1a1a; font-weight: 600;">${language === 'fr' ? '🎯 Points Clés' : '🎯 Key Points'}</h2>
        <ul style="padding-left: 20px; margin: 0;">
          ${bullets.map(b => `<li style="margin-bottom: 10px; line-height: 1.6;">${b}</li>`).join('')}
        </ul>
       </section>` 
    : '';

  const faqSection = faq.length > 0 
    ? `<section class="aeo-faq" style="margin: 24px 0;">
        <h2 style="font-size: 18px; margin-bottom: 16px; color: #1a1a1a; font-weight: 600;">${language === 'fr' ? '❓ Questions Fréquentes' : '❓ FAQ'}</h2>
        ${faq.map(item => `
          <details style="margin-bottom: 12px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; background: #fff;">
            <summary style="cursor: pointer; font-weight: 500; color: #333;">${item.question}</summary>
            <p style="margin-top: 12px; color: #555; line-height: 1.6;">${item.answer}</p>
          </details>
        `).join('')}
       </section>` 
    : '';

  const body = `
<article class="aeo-article" style="max-width: 800px; margin: 0 auto; padding: 32px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7; color: #1a1a1a;">
  <script type="application/ld+json">${JSON.stringify(qaJsonLd)}</script>
  ${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : ''}
  
  <h1 style="font-size: 28px; margin-bottom: 24px; color: #0a0a0a; font-weight: 700; line-height: 1.3;">${question}</h1>
  
  <div class="aeo-answer-box" style="background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%); border-left: 4px solid #667eea; padding: 24px; margin-bottom: 24px; border-radius: 0 12px 12px 0;">
    <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #2d2d2d;">${answerText}</p>
  </div>
  
  ${bulletsList}
  ${faqSection}
  
  <footer class="aeo-footer" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666;">
    <p style="margin: 0 0 8px 0;"><a href="https://lovelyanswers.com" style="color: #667eea; text-decoration: none; font-weight: 500;" target="_blank">LovelyAnswers</a> – Rank in ChatGPT Gemini & Google with AI Answers</p>
    <p style="margin: 0; font-size: 12px; color: #999;">LovelyAnswers – Rank in ChatGPT</p>
  </footer>
</article>`;

  return { title: question, body };
}

function generateArticleHTML(
  article: Article,
  project: Project
): { title: string; body: string } {
  const brandName = project.brand_name || project.name;
  const websiteUrl = project.website_url;
  const language = project.language || "fr";
  const currentYear = new Date().getFullYear();

  // Use existing HTML content if available
  if (article.html_content) {
    return {
      title: article.title,
      body: `
<article class="aeo-blog-article" style="max-width: 800px; margin: 0 auto; padding: 32px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7;">
  <h1 style="font-size: 32px; margin-bottom: 24px; font-weight: 700;">${article.title}</h1>
  ${article.html_content}
  <footer style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666;">
    <p style="margin: 0 0 8px 0;"><a href="https://lovelyanswers.com" style="color: #667eea;" target="_blank">LovelyAnswers</a> – Rank in ChatGPT Gemini & Google with AI Answers</p>
    <p style="margin: 0; font-size: 12px; color: #999;">LovelyAnswers – Rank in ChatGPT</p>
  </footer>
</article>`
    };
  }

  // Fallback to content
  const content = article.content || "";
  const htmlContent = content
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>');

  return {
    title: article.title,
    body: `
<article class="aeo-blog-article" style="max-width: 800px; margin: 0 auto; padding: 32px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7;">
  <h1 style="font-size: 32px; margin-bottom: 24px; font-weight: 700;">${article.title}</h1>
  <div class="article-content"><p>${htmlContent}</p></div>
  <footer style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666;">
    <p>Source: <a href="${websiteUrl}" style="color: #667eea;">${brandName}</a> • ${currentYear}</p>
  </footer>
</article>`
  };
}

function generateLocalAnswerHTML(
  localAnswer: LocalAnswer,
  project: Project
): { title: string; body: string } {
  const { question, answer, business_name } = localAnswer;
  const brandName = project.brand_name || project.name;
  const websiteUrl = project.website_url;
  const language = project.language || "fr";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": business_name,
    "url": websiteUrl,
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answer
      }
    }
  };

  const body = `
<article class="local-aeo-article" style="max-width: 800px; margin: 0 auto; padding: 32px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.7;">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
    <span style="background: linear-gradient(135deg, #f97316, #ef4444); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">Local AEO</span>
    <span style="color: #666; font-size: 14px;">${business_name}</span>
  </div>
  
  <h1 style="font-size: 28px; margin-bottom: 24px; color: #0a0a0a; font-weight: 700; line-height: 1.3;">${question}</h1>
  
  <div class="local-answer-box" style="background: linear-gradient(135deg, #f9731615 0%, #ef444415 100%); border-left: 4px solid #f97316; padding: 24px; margin-bottom: 24px; border-radius: 0 12px 12px 0;">
    <p style="margin: 0; font-size: 17px; line-height: 1.7; color: #2d2d2d;">${answer}</p>
  </div>
  
  <footer class="aeo-footer" style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 14px; color: #666;">
    <p style="margin: 0 0 8px 0;"><a href="https://lovelyanswers.com" style="color: #f97316; text-decoration: none; font-weight: 500;" target="_blank">LovelyAnswers</a> – Local AEO for AI Search</p>
    <p style="margin: 0; font-size: 12px; color: #999;">LovelyAnswers – Rank in ChatGPT</p>
  </footer>
</article>`;

  return { title: question, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for manual trigger
    let forceToday = false;
    let forceProjectId: string | null = null;
    let targetDate: string | null = null;
    try {
      const body = await req.json();
      forceToday = body?.forceToday === true;
      forceProjectId = body?.projectId || null;
      targetDate = body?.targetDate || null;
    } catch {
      // No body or invalid JSON - that's fine for cron calls
    }

    const today = new Date();
    // Use targetDate if provided (for retroactive publishing), otherwise use today
    const todayStr = targetDate || today.toISOString().split('T')[0];
    const currentUtcHour = today.getUTCHours();
    
    console.log(`[publish-scheduled] 🚀 Starting auto-publish`);
    console.log(`[publish-scheduled] Date: ${todayStr}, UTC Hour: ${currentUtcHour}`);
    console.log(`[publish-scheduled] Manual trigger: forceToday=${forceToday}, projectId=${forceProjectId}, targetDate=${targetDate}`);

    // Get ALL projects with auto-publish enabled (we'll filter by timezone below)
    const { data: projectSettings, error: settingsError } = await supabase
      .from("project_settings")
      .select("project_id, publish_hour, timezone, publish_frequency")
      .eq("auto_publish_enabled", true);

    if (settingsError) {
      console.error("[publish-scheduled] ❌ Error fetching project settings:", settingsError);
      throw settingsError;
    }

    console.log(`[publish-scheduled] 📊 Found ${projectSettings?.length || 0} projects with auto-publish enabled`);

    // Filter projects where the LOCAL hour matches the configured publish_hour
    // OR if forceToday is true and projectId matches
    let projectsToPublish: ProjectSettings[] = [];
    
    if (forceToday || targetDate) {
      // Manual trigger OR retroactive publishing - bypass hour check
      if (forceProjectId) {
        // Specific project
        const matchingProject = (projectSettings || []).find(ps => ps.project_id === forceProjectId);
        if (matchingProject) {
          projectsToPublish.push(matchingProject as ProjectSettings);
          console.log(`[publish-scheduled] 🔧 MANUAL TRIGGER: Publishing for project ${forceProjectId}`);
        } else {
          projectsToPublish.push({
            project_id: forceProjectId,
            publish_hour: "00",
            auto_publish_enabled: true,
            timezone: "UTC",
            publish_frequency: "daily"
          });
          console.log(`[publish-scheduled] 🔧 MANUAL TRIGGER: Force publishing for project ${forceProjectId}`);
        }
      } else {
        // All projects with auto-publish enabled
        for (const ps of projectSettings || []) {
          projectsToPublish.push(ps as ProjectSettings);
        }
        console.log(`[publish-scheduled] 🔧 RETROACTIVE: Publishing for ALL ${projectsToPublish.length} projects for date ${todayStr}`);
      }
    } else {
      // Normal cron behavior - check hour and frequency for each project's timezone
      for (const ps of projectSettings || []) {
        const timezone = ps.timezone || "UTC";
        const localHour = getLocalHour(timezone);
        const configuredHour = parseInt(ps.publish_hour || "10", 10);
        const frequency = (ps as any).publish_frequency || "daily";
        
        console.log(`[publish-scheduled] 🕐 Project ${ps.project_id}: timezone=${timezone}, localHour=${localHour}, publishHour=${configuredHour}, frequency=${frequency}`);
        
        // Check both hour match AND frequency match
        if (localHour === configuredHour && shouldPublishToday(frequency)) {
          projectsToPublish.push(ps as ProjectSettings);
          console.log(`[publish-scheduled] ✅ Project ${ps.project_id} MATCHED for publication`);
        } else if (localHour === configuredHour) {
          console.log(`[publish-scheduled] ⏭️ Project ${ps.project_id} skipped - frequency=${frequency} not matched today`);
        }
      }
    }

    console.log(`[publish-scheduled] 📊 ${projectsToPublish.length} projects to publish`);

    // FALLBACK: If no project_settings exist, find all projects with active integrations
    if (!projectSettings || projectSettings.length === 0) {
      console.log(`[publish-scheduled] ⚠️ No project_settings found, using FALLBACK mode`);
      
      // Only run fallback at 10:00 UTC (default hour)
      if (currentUtcHour === 10) {
        const { data: projectsWithIntegrations } = await supabase
          .from("integrations")
          .select("project_id")
          .eq("is_connected", true);
        
        if (projectsWithIntegrations && projectsWithIntegrations.length > 0) {
          const uniqueProjectIds = [...new Set(projectsWithIntegrations.map(i => i.project_id))];
          projectsToPublish = uniqueProjectIds.map(pid => ({ 
            project_id: pid, 
            publish_hour: "10", 
            auto_publish_enabled: true, 
            timezone: "UTC",
            publish_frequency: "daily"
          }));
          console.log(`[publish-scheduled] 🔄 FALLBACK: Found ${projectsToPublish.length} projects with active integrations`);
        }
      }
    }

    if (projectsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No projects scheduled for current hour (UTC: ${currentUtcHour})`, 
          published: 0,
          currentUtcHour,
          totalProjects: projectSettings?.length || 0,
          fallbackUsed: !projectSettings || projectSettings.length === 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectIds = projectsToPublish.map(ps => ps.project_id);

    // IMPORTANT: Use planning_days as the canonical schedule source (fixed calendar)
    // This prevents future items being published early because of drift in answers/articles.scheduled_date.
    let planningQuery = supabase
      .from("planning_days")
      .select("project_id, scheduled_date, answer_id, article_id")
      .in("project_id", projectIds);

    if (targetDate) {
      // Exact day publishing (retroactive)
      planningQuery = planningQuery.eq("scheduled_date", todayStr);
    } else if (forceToday) {
      // Manual trigger from UI: publish ONLY today
      planningQuery = planningQuery.eq("scheduled_date", todayStr);
    } else {
      // Normal cron: allow catch-up (today or earlier)
      planningQuery = planningQuery.lte("scheduled_date", todayStr);
    }

    const { data: planningRows, error: planningError } = await planningQuery;

    if (planningError) {
      console.error("[publish-scheduled] ❌ Error fetching planning_days:", planningError);
    }

    const answerIds = [...new Set((planningRows || []).map((r: any) => r.answer_id).filter(Boolean))];
    const articleIds = [...new Set((planningRows || []).map((r: any) => r.article_id).filter(Boolean))];

    // Fetch answers/articles by IDs only (no scheduled_date filtering here)
    // Also fetch local_answers directly by scheduled_date (they don't use planning_days)
    const [
      { data: answers, error: answersError }, 
      { data: articles, error: articlesError },
      { data: localAnswers, error: localAnswersError }
    ] = await Promise.all([
      answerIds.length
        ? supabase
            .from("answers")
            .select("*")
            .in("id", answerIds)
            .eq("is_public", false)
        : Promise.resolve({ data: [], error: null }),
      articleIds.length
        ? supabase
            .from("articles")
            .select("*")
            .in("id", articleIds)
            .neq("status", "published")
        : Promise.resolve({ data: [], error: null }),
      // Local answers: fetch by scheduled_date and project_ids directly
      supabase
        .from("local_answers")
        .select("*")
        .in("project_id", projectIds)
        .lte("scheduled_date", todayStr)
        .eq("is_public", false)
    ]);

    if (answersError) {
      console.error("[publish-scheduled] ❌ Error fetching answers:", answersError);
    }
    if (articlesError) {
      console.error("[publish-scheduled] ❌ Error fetching articles:", articlesError);
    }
    if (localAnswersError) {
      console.error("[publish-scheduled] ❌ Error fetching local_answers:", localAnswersError);
    }

    console.log(`[publish-scheduled] 📝 Found ${answers?.length || 0} answers (violet), ${articles?.length || 0} articles (emerald), ${localAnswers?.length || 0} local answers (orange) to publish`);

    const results: { id: string; type: "answer" | "article" | "local-answer"; success: boolean; url?: string; error?: string }[] = [];

    // Process answers (violet items)
    for (const answer of answers || []) {
      try {
        console.log(`[publish-scheduled] 💜 Processing answer: ${answer.question.substring(0, 50)}...`);
        
        // Get project info
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", answer.project_id)
          .single();

        if (!project) {
          results.push({ id: answer.id, type: "answer", success: false, error: "Project not found" });
          continue;
        }

        // Get integration
        const { data: integrations } = await supabase
          .from("integrations")
          .select("*")
          .eq("project_id", answer.project_id)
          .eq("is_connected", true)
          .limit(1);

        if (!integrations || integrations.length === 0) {
          // Just mark as public without CMS publishing
          await supabase
            .from("answers")
            .update({ is_public: true, published_at: new Date().toISOString() })
            .eq("id", answer.id);
          
          console.log(`[publish-scheduled] ✅ Answer marked as public (no CMS): ${answer.id}`);
          results.push({ id: answer.id, type: "answer", success: true, url: "internal" });
          continue;
        }

        const integration = integrations[0] as Integration;
        const { title, body } = generateAnswerHTML(answer, project);

        // Call cms-publish
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            integrationId: integration.id,
            content: { title, body, type: "answer", sourceId: answer.id }
          })
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
          await supabase
            .from("answers")
            .update({
              is_public: true,
              published_url: publishResult.url || null,
              published_at: new Date().toISOString()
            })
            .eq("id", answer.id);

          console.log(`[publish-scheduled] ✅ Answer published: ${publishResult.url || answer.id}`);
          results.push({ id: answer.id, type: "answer", success: true, url: publishResult.url });
        } else {
          console.error(`[publish-scheduled] ❌ Failed to publish answer: ${publishResult.error}`);
          results.push({ id: answer.id, type: "answer", success: false, error: publishResult.error });
        }
      } catch (err) {
        console.error(`[publish-scheduled] ❌ Error processing answer ${answer.id}:`, err);
        results.push({ id: answer.id, type: "answer", success: false, error: String(err) });
      }
    }

    // Process articles (emerald items)
    for (const article of articles || []) {
      try {
        console.log(`[publish-scheduled] 💚 Processing article: ${article.title.substring(0, 50)}...`);
        
        // Get project info
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", article.project_id)
          .single();

        if (!project) {
          results.push({ id: article.id, type: "article", success: false, error: "Project not found" });
          continue;
        }

        // Get integration
        const { data: integrations } = await supabase
          .from("integrations")
          .select("*")
          .eq("project_id", article.project_id)
          .eq("is_connected", true)
          .limit(1);

        if (!integrations || integrations.length === 0) {
          // Just mark as published without CMS
          await supabase
            .from("articles")
            .update({ status: "published" })
            .eq("id", article.id);
          
          console.log(`[publish-scheduled] ✅ Article marked as published (no CMS): ${article.id}`);
          results.push({ id: article.id, type: "article", success: true, url: "internal" });
          continue;
        }

        const integration = integrations[0] as Integration;
        const { title, body } = generateArticleHTML(article, project);

        // Call cms-publish with slug included
        const articleSlug = (article as any).slug || article.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 80);
          
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            integrationId: integration.id,
            content: { title, body, type: "article", sourceId: article.id, slug: articleSlug }
          })
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
          await supabase
            .from("articles")
            .update({ status: "published" })
            .eq("id", article.id);

          console.log(`[publish-scheduled] ✅ Article published: ${publishResult.url || article.id}`);
          results.push({ id: article.id, type: "article", success: true, url: publishResult.url });
        } else {
          console.error(`[publish-scheduled] ❌ Failed to publish article: ${publishResult.error}`);
          results.push({ id: article.id, type: "article", success: false, error: publishResult.error });
        }
      } catch (err) {
        console.error(`[publish-scheduled] ❌ Error processing article ${article.id}:`, err);
        results.push({ id: article.id, type: "article", success: false, error: String(err) });
      }
    }

    // Process local answers (orange items)
    for (const localAnswer of localAnswers || []) {
      try {
        console.log(`[publish-scheduled] 🧡 Processing local answer: ${localAnswer.question.substring(0, 50)}...`);
        
        // Get project info
        const { data: project } = await supabase
          .from("projects")
          .select("*")
          .eq("id", localAnswer.project_id)
          .single();

        if (!project) {
          results.push({ id: localAnswer.id, type: "local-answer", success: false, error: "Project not found" });
          continue;
        }

        // Get integration
        const { data: integrations } = await supabase
          .from("integrations")
          .select("*")
          .eq("project_id", localAnswer.project_id)
          .eq("is_connected", true)
          .limit(1);

        if (!integrations || integrations.length === 0) {
          // Just mark as public without CMS publishing
          await supabase
            .from("local_answers")
            .update({ is_public: true, published_at: new Date().toISOString() })
            .eq("id", localAnswer.id);
          
          console.log(`[publish-scheduled] ✅ Local answer marked as public (no CMS): ${localAnswer.id}`);
          results.push({ id: localAnswer.id, type: "local-answer", success: true, url: "internal" });
          continue;
        }

        const integration = integrations[0] as Integration;
        const { title, body } = generateLocalAnswerHTML(localAnswer as LocalAnswer, project);

        // Call cms-publish
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            integrationId: integration.id,
            content: { title, body, type: "local-answer", sourceId: localAnswer.id }
          })
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
          await supabase
            .from("local_answers")
            .update({
              is_public: true,
              published_url: publishResult.url || null,
              published_at: new Date().toISOString()
            })
            .eq("id", localAnswer.id);

          console.log(`[publish-scheduled] ✅ Local answer published: ${publishResult.url || localAnswer.id}`);
          results.push({ id: localAnswer.id, type: "local-answer", success: true, url: publishResult.url });
        } else {
          console.error(`[publish-scheduled] ❌ Failed to publish local answer: ${publishResult.error}`);
          results.push({ id: localAnswer.id, type: "local-answer", success: false, error: publishResult.error });
        }
      } catch (err) {
        console.error(`[publish-scheduled] ❌ Error processing local answer ${localAnswer.id}:`, err);
        results.push({ id: localAnswer.id, type: "local-answer", success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const answerCount = results.filter(r => r.type === "answer" && r.success).length;
    const articleCount = results.filter(r => r.type === "article" && r.success).length;
    const localAnswerCount = results.filter(r => r.type === "local-answer" && r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[publish-scheduled] 🎉 COMPLETED: ${answerCount} answers (💜), ${articleCount} articles (💚), ${localAnswerCount} local answers (🧡) published`);
    if (failedCount > 0) {
      console.log(`[publish-scheduled] ⚠️ ${failedCount} items failed to publish`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${answerCount} answers, ${articleCount} articles, and ${localAnswerCount} local answers`,
        published: successCount,
        failed: failedCount,
        answers: answerCount,
        articles: articleCount,
        localAnswers: localAnswerCount,
        currentUtcHour,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[publish-scheduled] ❌ Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
