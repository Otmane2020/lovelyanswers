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

  useEffect(() => {
    if (slug) {
      fetchAnswer();
    }
  }, [slug]);

  const fetchAnswer = async () => {
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .eq('slug', slug)
        .eq('is_public', true)
        .single();

      if (error) throw error;
      
      // Parse supporting_content safely
      const supportingContent = data.supporting_content as SupportingContent | null;
      setAnswer({
        ...data,
        supporting_content: supportingContent
      });
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
    toast.success("Réponse copiée !");
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
        toast.success("Lien copié !");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Réponse non trouvée</h1>
          <p className="text-muted-foreground mb-6">Cette réponse AEO n'existe pas ou n'est plus disponible.</p>
          <Link to="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const bullets = answer.supporting_content?.bullets || [];
  const faq = answer.supporting_content?.faq || [];
  const brand = answer.supporting_content?.brand || "AEOReply";

  // JSON-LD structured data for AEO - Enhanced for AI citation
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
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
            "url": window.location.origin
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
      "url": window.location.origin,
      "logo": {
        "@type": "ImageObject",
        "url": `${window.location.origin}/favicon.ico`
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
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="font-semibold">AEO</span>
            </Link>
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
              <h2 className="text-xl font-semibold mb-4">Points clés</h2>
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
              <h2 className="text-xl font-semibold mb-4">Questions fréquentes</h2>
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
              Source: <strong>{brand}</strong>
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Publié le {new Date(answer.created_at).toLocaleDateString('fr-FR', { 
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
              Optimisez votre visibilité sur les assistants IA
            </p>
            <Link to="/auth?mode=signup">
              <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600">
                Créer vos réponses AEO
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </footer>
      </div>
    </>
  );
}