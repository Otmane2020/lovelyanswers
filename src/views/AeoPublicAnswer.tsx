"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { 
  MessageSquare, TrendingUp, ArrowLeft, 
  ExternalLink, Share2, Copy, Check,
  ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";
import ArticleTemplate from "@/components/blog/ArticleTemplate";

interface SupportingContent {
  bullets?: string[];
  faq?: { q: string; a: string }[];
  brand?: string;
}

interface AeoAnswerData {
  id: string;
  question: string;
  answer: string;
  platforms: string[];
  score: number;
  slug: string;
  created_at: string;
  supporting_content: SupportingContent | null;
}

export default function AeoPublicAnswer() {
  const { slug } = useParams<{ slug: string }>();
  const [answer, setAnswer] = useState<AeoAnswerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  // Track if showing a published_article (HTML article vs Q&A answer)
  const [isPublishedArticle, setIsPublishedArticle] = useState(false);
  const [articleHtml, setArticleHtml] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [articleMeta, setArticleMeta] = useState<string | null>(null);
  const [articleDate, setArticleDate] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    if (slug) {
      fetchAnswer();
    }
  }, [slug]);

  const fetchAnswer = async () => {
    try {
      // First try: fetch from answers table (Q&A content)
      const { data, error } = await supabase
        .from('answers')
        .select(`
          *,
          projects!inner(website_url, domain)
        `)
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (!error && data) {
        // Strict filter: ONLY show if it's an autopilotgeo.com project
        const projectUrl = ((data as any).projects?.website_url || '').toLowerCase();
        const projectDomain = ((data as any).projects?.domain || '').toLowerCase();
        
        const isAutoPilotProject = 
          projectUrl.includes('autopilotgeo.com') || 
          projectDomain === 'autopilotgeo.com';
        
        if (isAutoPilotProject) {
          const supportingContent = data.supporting_content as SupportingContent | null;
          setAnswer({
            ...data,
            supporting_content: supportingContent
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: try published_articles table (blog articles)
      const { data: articleData, error: articleError } = await supabase
        .from('published_articles')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!articleError && articleData) {
        setIsPublishedArticle(true);
        setArticleHtml(articleData.body);
        setArticleTitle(articleData.title);
        setArticleMeta(articleData.meta_description);
        setArticleDate(articleData.published_at);
        setLoading(false);
        return;
      }

      // Nothing found
      console.error('No content found for slug:', slug);
    } catch (error) {
      console.error('Error fetching answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!answer) return;
    await navigator.clipboard.writeText(answer.answer);
    setCopied(true);
    toast.success("Answer copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareAnswer = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: answer?.question,
          text: answer?.answer,
          url
        });
      } catch (error) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render published article (HTML blog article from published_articles table)
  if (isPublishedArticle && articleHtml) {
    return (
      <ArticleTemplate
        title={articleTitle || ""}
        htmlContent={articleHtml}
        metaDescription={articleMeta}
        publishedAt={articleDate}
        slug={slug || ""}
      />
    );
  }

  if (!answer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Answer not found</h1>
          <p className="text-muted-foreground mb-6">This AEO answer does not exist or is no longer available.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Build editorial HTML from Q&A answer data
  const bullets = answer.supporting_content?.bullets || [];
  const faq = answer.supporting_content?.faq || [];

  const bulletsHtml = bullets.length > 0
    ? `<h2>Key Points</h2><ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>`
    : '';

  const faqHtml = faq.length > 0
    ? `<h2>Frequently Asked Questions</h2>${faq.map(f => `<details><summary>${f.q}</summary><p>${f.a}</p></details>`).join('')}`
    : '';

  const answerEditorialHtml = `
    <div class="aeo-answer-box" style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-left:4px solid hsl(var(--primary));padding:1.5rem;margin:1.5rem 0;border-radius:0 8px 8px 0;">
      <p style="font-size:1.1rem;margin:0;">${answer.answer}</p>
    </div>
    ${bulletsHtml}
    ${faqHtml}
  `;

  return (
    <ArticleTemplate
      title={answer.question}
      htmlContent={answerEditorialHtml}
      metaDescription={answer.answer.slice(0, 160)}
      publishedAt={answer.created_at}
      slug={slug || ""}
    />
  );
}