import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Target, Users, Zap } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { GlassCard } from "@/components/ui/glass-card";
import { AnimatedLogo } from "@/components/AnimatedLogo";

const aboutStructuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "mainEntity": {
    "@type": "Organization",
    "name": "LovelyAnswers",
    "description": "Pioneering Answer Engine Optimization to help businesses thrive in the AI-first era.",
    "url": "https://lovelyanswers.com",
    "foundingLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Suite 4, Piccadilly House",
        "addressLocality": "Manchester",
        "postalCode": "M1 1AB",
        "addressCountry": "GB"
      }
    },
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "value": "10-50"
    }
  }
};

export default function About() {
  return (
    <>
      <Helmet>
        <title>About LovelyAnswers - AI Answer Engine Optimization Company</title>
        <meta name="description" content="Learn about LovelyAnswers, the pioneering AEO platform helping 500+ businesses get cited by ChatGPT, Gemini, and AI assistants. Based in Manchester, UK." />
        <link rel="canonical" href="https://lovelyanswers.com/about" />
        <meta property="og:title" content="About LovelyAnswers - AI Answer Engine Optimization" />
        <meta property="og:description" content="Pioneering Answer Engine Optimization to help businesses thrive in the AI-first era." />
        <meta property="og:url" content="https://lovelyanswers.com/about" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About LovelyAnswers" />
        <script type="application/ld+json">{JSON.stringify(aboutStructuredData)}</script>
      </Helmet>
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AnimatedLogo size="md" />
            <span className="text-xl font-bold tracking-tight">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Answers</span>
            </span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full blur-[120px] opacity-30" />
        
        <div className="container relative max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-6">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">LovelyAnswers</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Pioneering Answer Engine Optimization to help businesses thrive in the AI-first era.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            <GlassCard className="p-6 text-center">
              <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Our Mission</h3>
              <p className="text-sm text-muted-foreground">
                Make every business discoverable by AI assistants and search engines.
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center">
              <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Our Technology</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered content generation optimized for LLM understanding and citation.
              </p>
            </GlassCard>

            <GlassCard className="p-6 text-center">
              <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Our Clients</h3>
              <p className="text-sm text-muted-foreground">
                500+ businesses trust LovelyAnswers for their AI visibility strategy.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Story</h2>
          <div className="space-y-6 text-muted-foreground">
            <p>
              LovelyAnswers was founded with a simple observation: the way people find information is changing. 
              With the rise of AI assistants like ChatGPT, Gemini, and Perplexity, traditional SEO alone 
              is no longer enough to ensure your business gets discovered.
            </p>
            <p>
              We developed Answer Engine Optimization (AEO) - a new approach that makes your content 
              not just searchable, but citable by AI systems. Our platform helps businesses create 
              structured, authoritative content that AI assistants trust and recommend.
            </p>
            <p>
              Based in Manchester, UK, our team combines expertise in AI, SEO, and content marketing 
              to deliver a comprehensive solution for the AI-first era.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8">
            Join 500+ businesses already using LovelyAnswers to dominate AI search.
          </p>
          <Button className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:opacity-90" size="lg" asChild>
            <Link to="/auth">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-20">
        <div className="container max-w-3xl text-center">
          <h2 className="text-2xl font-bold mb-6">Company Information</h2>
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground">LovelyAnswers Ltd</p>
            <p>Suite 4, Piccadilly House</p>
            <p>Manchester, M1 1AB</p>
            <p>United Kingdom</p>
            <p className="mt-4">
              <a href="mailto:support@lovelyanswers.io" className="text-pink-600 hover:underline">
                support@lovelyanswers.io
              </a>
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
    </>
  );
}
