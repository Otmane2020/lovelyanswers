import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Share2,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

interface ArticleTemplateProps {
  title: string;
  htmlContent: string;
  metaDescription?: string | null;
  publishedAt?: string | null;
  slug: string;
  author?: string | null;
}

function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const regex = /<h([2-3])[^>]*>(.*?)<\/h\1>/gi;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    headings.push({ id, text, level: parseInt(match[1]) });
  }
  return headings;
}

function extractExcerpt(html: string, maxLen = 180): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).replace(/\s\S*$/, "") + "…";
}

function injectHeadingIds(html: string): string {
  return html.replace(/<h([2-3])([^>]*)>(.*?)<\/h\1>/gi, (_, level, attrs, inner) => {
    const text = inner.replace(/<[^>]*>/g, "").trim();
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
  });
}

export default function ArticleTemplate({
  title,
  htmlContent,
  metaDescription,
  publishedAt,
  slug,
  author,
}: ArticleTemplateProps) {
  const brand = "AutoPilot Geo";
  const brandUrl = "https://autopilotgeo.com";

  const readingTime = useMemo(() => estimateReadingTime(htmlContent), [htmlContent]);
  const headings = useMemo(() => extractHeadings(htmlContent), [htmlContent]);
  const excerpt = useMemo(
    () => metaDescription || extractExcerpt(htmlContent),
    [metaDescription, htmlContent]
  );
  const processedHtml = useMemo(() => injectHeadingIds(htmlContent), [htmlContent]);

  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const shareArticle = async () => {
    const url = `${brandUrl}/blog/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: excerpt,
    datePublished: publishedAt,
    url: `${brandUrl}/blog/${slug}`,
    publisher: {
      "@type": "Organization",
      name: brand,
      url: brandUrl,
      logo: { "@type": "ImageObject", url: `${brandUrl}/favicon.png` },
    },
    author: {
      "@type": "Organization",
      name: author || brand,
      url: brandUrl,
    },
  };

  return (
    <>
      <Helmet>
        <title>{title} | {brand}</title>
        <meta name="description" content={excerpt} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${brandUrl}/blog/${slug}`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`${brandUrl}/blog/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(articleStructuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* ─── Topbar ─── */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 flex h-14 items-center justify-between">
            <Link to="/" className="flex items-center">
              <AnimatedLogo size="sm" />
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/blog">
                <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
                  <ArrowLeft className="h-4 w-4" /> Blog
                </Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shareArticle}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section className="editorial-hero">
          <div className="max-w-3xl mx-auto px-4 pt-16 pb-10 md:pt-24 md:pb-14 text-center">
            <Badge variant="secondary" className="mb-5 text-xs tracking-widest uppercase font-medium">
              <BookOpen className="h-3 w-3 mr-1.5" />
              Editorial
            </Badge>

            <h1 className="editorial-title">{title}</h1>

            <p className="editorial-subtitle">{excerpt}</p>

            {/* Byline */}
            <div className="editorial-byline">
              <div className="editorial-byline-avatar">
                <span className="text-primary-foreground font-bold text-xs">AG</span>
              </div>
              <div className="flex flex-col items-start text-sm">
                <span className="font-semibold text-foreground">{author || brand}</span>
                <div className="flex items-center gap-3 text-muted-foreground text-xs">
                  {formattedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDate}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {readingTime} min read
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="editorial-hero-rule" />
        </section>

        {/* ─── Body ─── */}
        <div className="max-w-5xl mx-auto px-4 py-10 md:py-14 flex gap-10">
          {/* Sidebar TOC (desktop) */}
          {headings.length > 2 && (
            <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start">
              <nav className="editorial-toc">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Table of Contents
                </h4>
                <ul className="space-y-2">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block text-sm leading-snug text-muted-foreground hover:text-foreground transition-colors ${
                          h.level === 3 ? "pl-3 border-l border-border" : "font-medium"
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}

          {/* Article content */}
          <article
            className="editorial-prose flex-1 min-w-0"
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        </div>

        {/* ─── CTA ─── */}
        <section className="border-t border-border bg-muted/30">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              Want AI-Optimized Content Like This?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              AutoPilot Geo helps you rank first in ChatGPT, Gemini, and Google with automatically
              generated, SEO-optimized articles.
            </p>
            <a href={`${brandUrl}/auth?mode=signup`}>
              <Button size="lg" className="gap-2 gradient-bg text-primary-foreground hover:opacity-90">
                Get Started Free
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
