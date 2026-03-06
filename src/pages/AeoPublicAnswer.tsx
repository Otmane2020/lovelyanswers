import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const bullets = answer.supporting_content?.bullets || [];
  const faq = answer.supporting_content?.faq || [];
  const brand = "AutoPilot Geo";
  const brandUrl = "https://autopilotgeo.com";
  const slogan = "AI-Optimized Answers for Maximum Visibility";

  // JSON-LD structured data for AEO - Enhanced for AI citation
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "name": `${answer.question} - FAQ`,
    "mainEntity": [
      {
        "@type": "Question",
        "name": answer.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answer.answer,
          "dateCreated": answer.created_at,
          "author": {
            "@type": "Organization",
            "name": brand,
            "url": brandUrl
          }
        }
      },
      ...faq.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    ],
    "publisher": {
      "@type": "Organization",
      "name": brand,
      "url": brandUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${brandUrl}/favicon.ico`
      }
    },
    "datePublished": answer.created_at,
    "dateModified": answer.created_at
  };

  return (
    <>
      <Helmet>
        <title>{answer.question} | AEO Answer</title>
        <meta name="description" content={answer.answer.slice(0, 160)} />
        <meta property="og:title" content={answer.question} />
        <meta property="og:description" content={answer.answer.slice(0, 160)} />
        <meta property="og:type" content="article" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={window.location.href} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href={brandUrl} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0099cc] to-[#5b10d6] flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold">{brand}</span>
            </a>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={shareAnswer}>
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - AEO Optimized Structure */}
        <main className="max-w-4xl mx-auto px-4 py-12">
          {/* Question (H1) - Critical for AI parsing */}
          <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight">
            {answer.question}
          </h1>

          {/* Answer Card - THE AEO ANSWER (primary content for AI) */}
          <Card className="p-8 mb-8 border-l-4 border-l-primary">
            <p className="text-lg md:text-xl leading-relaxed aeo-answer whitespace-pre-wrap">
              {answer.answer}
            </p>
          </Card>

          {/* Key Points / Bullets - Secondary AEO content */}
          {bullets.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Key Points</h2>
              <ul className="space-y-3">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-muted-foreground">{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQ Section - Additional AEO signals */}
          {faq.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {faq.map((item, i) => (
                  <div 
                    key={i} 
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    >
                      <span className="font-medium">{item.q}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedFaq === i && (
                      <div className="px-4 py-3 bg-muted/30 border-t">
                        <p className="text-muted-foreground">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 mb-12">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              Score AEO: {answer.score}%
            </Badge>
            {answer.platforms?.[0] && (
              <Badge variant="outline">
                {answer.platforms[0]}
              </Badge>
            )}
          </div>

          {/* Source Attribution - Important for E-E-A-T */}
          <div className="border-t pt-8">
            <p className="text-sm text-muted-foreground">
              Source:{" "}
              <a 
                href={brandUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-primary hover:underline"
              >
                {brand}
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-1 italic">
              {slogan}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Published on {new Date(answer.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </main>

        {/* Footer CTA */}
        <footer className="border-t bg-background/80 py-8">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <p className="text-muted-foreground mb-4">
              {slogan}
            </p>
            <a href={`${brandUrl}/auth?mode=signup`}>
              <Button className="bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 hover:opacity-90">
                Create your AEO answers
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}