import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { FileText, Search, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface PublicAnswer {
  id: string;
  question: string;
  answer: string;
  slug: string;
  published_at: string;
  score: number | null;
}

export default function Blog() {
  const [answers, setAnswers] = useState<PublicAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const fetchPublicAnswers = async () => {
      try {
        // Fetch AEO answers with their project info
        const { data: aeoData, error: aeoError } = await supabase
          .from("answers")
          .select(`
            id, question, answer, slug, published_at, score,
            projects!inner(website_url, domain)
          `)
          .eq("is_public", true)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false });

        if (aeoError) throw aeoError;

        // Fetch Local AEO answers with their project info
        const { data: localData, error: localError } = await supabase
          .from("local_answers")
          .select(`
            id, question, answer, slug, published_at, score,
            projects!inner(website_url, domain)
          `)
          .eq("is_public", true)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false });

        if (localError) throw localError;
        
        // Fetch externally published articles
        const { data: publishedData, error: publishedError } = await supabase
          .from("published_articles")
          .select("id, title, body, slug, published_at")
          .order("published_at", { ascending: false });

        if (publishedError) {
          console.warn("Error fetching published articles:", publishedError);
        }
        
        // Transform published articles to match PublicAnswer format
        const publishedAnswers = (publishedData || []).map((article: any) => ({
          id: article.id,
          question: article.title,
          answer: article.body,
          slug: article.slug,
          published_at: article.published_at,
          score: null
        }));
        
        // Combine AEO and Local answers
        const internalAnswers = [...(aeoData || []), ...(localData || [])];
        
        // Only show internal answers from lovelyanswers.com projects
        const lovelyanswersAnswers = internalAnswers.filter((answer: any) => {
          const projectDomain = (answer.projects?.domain || '').toLowerCase();
          const projectUrl = (answer.projects?.website_url || '').toLowerCase();
          
          return projectDomain === 'lovelyanswers.com' || 
                 projectDomain.includes('lovelyanswers') ||
                 projectUrl.includes('lovelyanswers.com');
        });
        
        // Combine internal and external articles
        const allAnswers = [...lovelyanswersAnswers, ...publishedAnswers];
        
        // Sort by published_at descending
        allAnswers.sort((a: any, b: any) => 
          new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        );
        
        setAnswers(allAnswers);
      } catch (error) {
        console.error("Error fetching public answers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicAnswers();
  }, []);

  const filteredAnswers = answers.filter((answer) =>
    answer.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    answer.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + "...";
  };

  const blogStructuredData = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "LovelyAnswers Blog",
    "description": "AI-optimized answers and insights for ChatGPT, Gemini, and Claude visibility",
    "url": "https://lovelyanswers.com/blog",
    "publisher": {
      "@type": "Organization",
      "name": "LovelyAnswers",
      "logo": {
        "@type": "ImageObject",
        "url": "https://lovelyanswers.com/favicon.png"
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog - AI-Optimized Answers | LovelyAnswers</title>
        <meta
          name="description"
          content="Discover AI-optimized answers and insights. Expert content designed for maximum visibility across AI platforms like ChatGPT, Gemini, and Claude."
        />
        <link rel="canonical" href="https://lovelyanswers.com/blog" />
        <meta property="og:title" content="LovelyAnswers Blog - AI-Optimized Content" />
        <meta property="og:description" content="Expert answers optimized for AI search engines and chatbots." />
        <meta property="og:url" content="https://lovelyanswers.com/blog" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(blogStructuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <AnimatedLogo size="sm" />
              <span className="font-bold text-lg">
                Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Pricing</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Optimized Content
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Expert Answers & Insights
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Discover content optimized for AI visibility. Each article is crafted to rank first in AI-powered search engines.
              </p>
              
              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-16">
          <div className="container">
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full mb-4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAnswers.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2">
                  {searchQuery ? "No articles found" : "No articles yet"}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Check back soon for AI-optimized content"}
                </p>
                {searchQuery && (
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <p className="text-muted-foreground">
                    {filteredAnswers.length} article{filteredAnswers.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredAnswers.map((answer) => (
                    <Link key={answer.id} to={`/blog/${answer.slug}`}>
                      <Card className="h-full hover:shadow-lg transition-shadow group cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                              {answer.question}
                            </CardTitle>
                            {answer.score && answer.score >= 80 && (
                              <Badge variant="secondary" className="shrink-0 bg-emerald-100 text-emerald-700">
                                {answer.score}%
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                            {truncateText(answer.answer.replace(/<[^>]*>/g, ""), 150)}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(answer.published_at), "MMM d, yyyy")}
                            </div>
                            <div className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                              Read more
                              <ArrowRight className="h-3 w-3" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Want AI-Optimized Content for Your Business?
              </h2>
              <p className="text-muted-foreground mb-8">
                LovelyAnswers helps you create content that ranks first in AI search engines like ChatGPT, Gemini, and Claude.
              </p>
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
