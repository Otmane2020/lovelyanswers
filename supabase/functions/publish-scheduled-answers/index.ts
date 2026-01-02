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
  supporting_content: {
    bullets?: string[];
    faq?: { question: string; answer: string }[];
  };
  scheduled_date: string;
}

interface Integration {
  id: string;
  platform: string;
  config: Record<string, string>;
  is_connected: boolean;
}

interface GenerationSettings {
  brand_name: string;
  website_url: string;
  language: string;
}

function generateArticleHTML(
  answer: Answer,
  settings: GenerationSettings
): { title: string; body: string } {
  const { question, answer: answerText, supporting_content } = answer;
  const { brand_name, website_url, language } = settings;

  const bullets = supporting_content?.bullets || [];
  const faq = supporting_content?.faq || [];

  // Generate FAQ JSON-LD
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

  // Generate QAPage JSON-LD
  const qaJsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "text": question,
      "answerCount": 1,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answerText,
        "author": {
          "@type": "Organization",
          "name": brand_name,
          "url": website_url
        }
      }
    }
  };

  const bulletsList = bullets.length > 0 
    ? `<section class="key-points">
        <h2>${language === 'fr' ? 'Points Clés' : 'Key Points'}</h2>
        <ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
       </section>` 
    : '';

  const faqSection = faq.length > 0 
    ? `<section class="faq-section">
        <h2>${language === 'fr' ? 'Questions Fréquentes' : 'Frequently Asked Questions'}</h2>
        ${faq.map(item => `
          <details>
            <summary>${item.question}</summary>
            <p>${item.answer}</p>
          </details>
        `).join('')}
       </section>` 
    : '';

  const body = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${question} | ${brand_name}</title>
  <meta name="description" content="${answerText.substring(0, 155)}...">
  <script type="application/ld+json">${JSON.stringify(qaJsonLd)}</script>
  ${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : ''}
  <style>
    .aeo-article { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: system-ui, sans-serif; line-height: 1.6; }
    .aeo-article h1 { font-size: 2rem; margin-bottom: 1.5rem; color: #1a1a1a; }
    .aeo-article .answer-box { background: #f8f9fa; border-left: 4px solid #0066cc; padding: 1.5rem; margin-bottom: 2rem; border-radius: 0 8px 8px 0; }
    .aeo-article .key-points { margin: 2rem 0; }
    .aeo-article .key-points h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    .aeo-article .key-points ul { padding-left: 1.5rem; }
    .aeo-article .key-points li { margin-bottom: 0.5rem; }
    .aeo-article .faq-section { margin: 2rem 0; }
    .aeo-article .faq-section h2 { font-size: 1.25rem; margin-bottom: 1rem; }
    .aeo-article details { margin-bottom: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
    .aeo-article summary { cursor: pointer; font-weight: 500; }
    .aeo-article details p { margin-top: 0.75rem; color: #444; }
    .aeo-article .source { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; font-size: 0.875rem; color: #666; }
    .aeo-article .source a { color: #0066cc; text-decoration: none; }
  </style>
</head>
<body>
  <article class="aeo-article">
    <h1>${question}</h1>
    <div class="answer-box">
      <p>${answerText}</p>
    </div>
    ${bulletsList}
    ${faqSection}
    <footer class="source">
      <p>${language === 'fr' ? 'Source' : 'Source'}: <a href="${website_url}" rel="author">${brand_name}</a></p>
    </footer>
  </article>
</body>
</html>`;

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

    const today = new Date().toISOString().split('T')[0];
    console.log(`[publish-scheduled-answers] Running for date: ${today}`);

    // Fetch answers scheduled for today or earlier that haven't been published
    const { data: answers, error: answersError } = await supabase
      .from("answers")
      .select("*")
      .lte("scheduled_date", today)
      .eq("is_public", false)
      .not("scheduled_date", "is", null);

    if (answersError) {
      console.error("Error fetching answers:", answersError);
      throw answersError;
    }

    if (!answers || answers.length === 0) {
      console.log("No scheduled answers to publish");
      return new Response(
        JSON.stringify({ success: true, message: "No answers to publish", published: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${answers.length} answers to publish`);

    const results: { answerId: string; success: boolean; url?: string; error?: string }[] = [];

    for (const answer of answers) {
      try {
        // Get project integration
        const { data: integrations, error: intError } = await supabase
          .from("integrations")
          .select("*")
          .eq("project_id", answer.project_id)
          .eq("is_connected", true)
          .limit(1);

        if (intError || !integrations || integrations.length === 0) {
          console.log(`No active integration for project ${answer.project_id}`);
          results.push({ answerId: answer.id, success: false, error: "No active CMS integration" });
          continue;
        }

        const integration = integrations[0] as Integration;

        // Get generation settings for brand info
        const { data: settings } = await supabase
          .from("generation_settings")
          .select("brand_name, website_url, language")
          .eq("project_id", answer.project_id)
          .single();

        const genSettings: GenerationSettings = {
          brand_name: settings?.brand_name || "Brand",
          website_url: settings?.website_url || "",
          language: settings?.language || "en"
        };

        // Generate article HTML
        const { title, body } = generateArticleHTML(answer, genSettings);

        // Call cms-publish function
        const publishResponse = await fetch(`${supabaseUrl}/functions/v1/cms-publish`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            integrationId: integration.id,
            content: {
              title,
              body,
              type: "answer",
              sourceId: answer.id
            }
          })
        });

        const publishResult = await publishResponse.json();

        if (publishResult.success) {
          // Update answer as published
          await supabase
            .from("answers")
            .update({
              is_public: true,
              published_url: publishResult.url || null,
              published_at: new Date().toISOString()
            })
            .eq("id", answer.id);

          console.log(`Published answer ${answer.id} to ${integration.platform}`);
          results.push({ answerId: answer.id, success: true, url: publishResult.url });
        } else {
          console.error(`Failed to publish answer ${answer.id}:`, publishResult.error);
          results.push({ answerId: answer.id, success: false, error: publishResult.error });
        }
      } catch (err) {
        console.error(`Error processing answer ${answer.id}:`, err);
        results.push({ answerId: answer.id, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Published ${successCount}/${answers.length} answers`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Published ${successCount} answers`,
        published: successCount,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in publish-scheduled-answers:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
