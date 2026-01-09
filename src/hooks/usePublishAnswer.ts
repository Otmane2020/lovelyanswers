import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublishAnswerParams {
  answerId: string;
  projectId: string;
}

export function usePublishAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answerId, projectId }: PublishAnswerParams) => {
      // Get active integration for project
      const { data: integrations, error: intError } = await supabase
        .from("integrations")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_connected", true)
        .limit(1);

      if (intError) throw intError;
      if (!integrations || integrations.length === 0) {
        throw new Error("No CMS integration connected. Please configure an integration first.");
      }

      const integration = integrations[0];

      // Get answer data
      const { data: answer, error: answerError } = await supabase
        .from("answers")
        .select("*")
        .eq("id", answerId)
        .single();

      if (answerError) throw answerError;

      // Get generation settings for brand info
      const { data: settings } = await supabase
        .from("generation_settings")
        .select("brand_name, website_url, language")
        .eq("project_id", projectId)
        .single();

      const brandName = settings?.brand_name || "Brand";
      const websiteUrl = settings?.website_url || "";
      const language = settings?.language || "en";

      // Generate article HTML
      const articleHTML = generateArticleHTML(answer, { brandName, websiteUrl, language });

      // Call cms-publish
      const { data, error } = await supabase.functions.invoke("cms-publish", {
        body: {
          integrationId: integration.id,
          content: {
            title: answer.question,
            body: articleHTML,
            type: "answer",
            sourceId: answerId
          }
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Publication failed");

      // Update answer as published
      await supabase
        .from("answers")
        .update({
          is_public: true,
          published_url: data.url || null,
          published_at: new Date().toISOString()
        })
        .eq("id", answerId);

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["answers"] });
      toast.success("Answer published to CMS successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

function generateArticleHTML(
  answer: any,
  settings: { brandName: string; websiteUrl: string; language: string }
): string {
  const { question, answer: answerText, supporting_content } = answer;
  const { brandName, websiteUrl, language } = settings;

  // Safely extract bullets - handle different structures
  const rawBullets = (supporting_content as any)?.bullets || [];
  const bullets = rawBullets.filter((b: any) => b && typeof b === 'string' && b.trim());

  // Safely extract FAQ - filter out empty/invalid items
  const rawFaq = (supporting_content as any)?.faq || [];
  const faq = rawFaq.filter((item: any) => 
    item && 
    typeof item === 'object' && 
    item.question && 
    item.answer && 
    item.question.trim() && 
    item.answer.trim()
  );

  const qaJsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    "mainEntity": {
      "@type": "Question",
      "name": question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": answerText,
        "author": websiteUrl ? {
          "@type": "Organization",
          "name": brandName,
          "url": websiteUrl
        } : {
          "@type": "Organization",
          "name": brandName
        }
      }
    }
  };

  // Only create FAQ JSON-LD if we have valid FAQ items
  const faqJsonLd = faq.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.map((item: any) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": { "@type": "Answer", "text": item.answer }
    }))
  } : null;

  const bulletsList = bullets.length > 0 
    ? `<section class="key-points"><h2>${language === 'fr' ? 'Points Clés' : 'Key Points'}</h2><ul>${bullets.map((b: string) => `<li>${b}</li>`).join('')}</ul></section>` 
    : '';

  const faqSection = faq.length > 0 
    ? `<section class="faq-section"><h2>${language === 'fr' ? 'Questions Fréquentes' : 'FAQ'}</h2>${faq.map((item: any) => `<details><summary>${item.question}</summary><p>${item.answer}</p></details>`).join('')}</section>` 
    : '';

  // Only show footer if we have brand info
  const footer = brandName && brandName !== 'Brand' 
    ? `<footer class="source"><p>${language === 'fr' ? 'Source' : 'Source'}: ${websiteUrl ? `<a href="${websiteUrl}" rel="author">${brandName}</a>` : brandName}</p></footer>`
    : '';

  return `
<article class="aeo-article">
  <script type="application/ld+json">${JSON.stringify(qaJsonLd)}</script>
  ${faqJsonLd ? `<script type="application/ld+json">${JSON.stringify(faqJsonLd)}</script>` : ''}
  <h1>${question}</h1>
  <div class="answer-box"><p>${answerText}</p></div>
  ${bulletsList}
  ${faqSection}
  ${footer}
</article>`;
}
