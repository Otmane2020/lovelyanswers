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
  auto_publish_enabled: boolean;
  publish_hour: string;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentHour = today.getUTCHours().toString().padStart(2, '0');
    
    console.log(`[publish-scheduled] 🚀 Starting auto-publish cron`);
    console.log(`[publish-scheduled] Date: ${todayStr}, Hour: ${currentHour} UTC`);

    // Get projects with auto-publish enabled for current hour
    const { data: projectSettings, error: settingsError } = await supabase
      .from("project_settings")
      .select("project_id, publish_hour")
      .eq("auto_publish_enabled", true);

    if (settingsError) {
      console.error("[publish-scheduled] ❌ Error fetching project settings:", settingsError);
      throw settingsError;
    }

    // Filter projects for current hour
    let projectsToPublish = projectSettings?.filter(
      ps => ps.publish_hour === currentHour
    ) || [];

    console.log(`[publish-scheduled] 📊 Found ${projectsToPublish.length} projects with settings for ${currentHour}:00 UTC`);

    // FALLBACK: If no project_settings exist, find all projects with active integrations
    if (!projectSettings || projectSettings.length === 0) {
      console.log(`[publish-scheduled] ⚠️ No project_settings found, using FALLBACK mode`);
      
      // Only run fallback at 10:00 UTC (default hour)
      if (currentHour === "10") {
        const { data: projectsWithIntegrations } = await supabase
          .from("integrations")
          .select("project_id")
          .eq("is_connected", true);
        
        if (projectsWithIntegrations && projectsWithIntegrations.length > 0) {
          const uniqueProjectIds = [...new Set(projectsWithIntegrations.map(i => i.project_id))];
          projectsToPublish = uniqueProjectIds.map(pid => ({ project_id: pid, publish_hour: "10" }));
          console.log(`[publish-scheduled] 🔄 FALLBACK: Found ${projectsToPublish.length} projects with active integrations`);
        }
      }
    }

    if (projectsToPublish.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `No projects scheduled for ${currentHour}:00 UTC`, 
          published: 0,
          currentHour,
          totalProjects: projectSettings?.length || 0,
          fallbackUsed: !projectSettings || projectSettings.length === 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const projectIds = projectsToPublish.map(ps => ps.project_id);
    
    // Fetch answers scheduled for today or earlier (catch up on missed)
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("*")
      .in("project_id", projectIds)
      .lte("scheduled_date", todayStr + "T23:59:59Z")
      .eq("is_public", false)
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true });

    if (answersError) {
      console.error("[publish-scheduled] ❌ Error fetching answers:", answersError);
    }

    // Fetch articles scheduled for today or earlier (catch up on missed)
    const { data: articles, error: articlesError } = await supabase
      .from("articles")
      .select("*")
      .in("project_id", projectIds)
      .lte("scheduled_date", todayStr + "T23:59:59Z")
      .neq("status", "published")
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true });

    if (articlesError) {
      console.error("[publish-scheduled] ❌ Error fetching articles:", articlesError);
    }

    console.log(`[publish-scheduled] 📝 Found ${answers?.length || 0} answers (violet) and ${articles?.length || 0} articles (emerald) to publish`);

    const results: { id: string; type: "answer" | "article"; success: boolean; url?: string; error?: string }[] = [];

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

        // Call cms-publish
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            integrationId: integration.id,
            content: { title, body, type: "article", sourceId: article.id }
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

    const successCount = results.filter(r => r.success).length;
    const answerCount = results.filter(r => r.type === "answer" && r.success).length;
    const articleCount = results.filter(r => r.type === "article" && r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[publish-scheduled] 🎉 COMPLETED: ${answerCount} answers (💜) and ${articleCount} articles (💚) published`);
    if (failedCount > 0) {
      console.log(`[publish-scheduled] ⚠️ ${failedCount} items failed to publish`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${answerCount} answers and ${articleCount} articles`,
        published: successCount,
        failed: failedCount,
        answers: answerCount,
        articles: articleCount,
        currentHour,
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
