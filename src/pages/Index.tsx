import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Zap,
  ArrowRight,
  Check,
  Sparkles,
  Globe,
  FileText,
  Target,
  Bot,
  ChevronRight,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AEO Answer Generator",
    description: "Generate AI-ready, citable answers optimized for LLM understanding",
  },
  {
    icon: Globe,
    title: "Public Answer Hub",
    description: "Indexable answer pages that AI assistants can discover and cite",
  },
  {
    icon: Target,
    title: "AI Platform Targeting",
    description: "Optimize for ChatGPT, Gemini, Claude, Perplexity & Copilot",
  },
  {
    icon: FileText,
    title: "LLMs.txt Generation",
    description: "Auto-generate machine-readable files for AI crawlers",
  },
];

const platforms = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Copilot"];

const comparisons = [
  { feature: "Focus", seo: "Search rankings", aeo: "AI citations" },
  { feature: "Content", seo: "Keywords & backlinks", aeo: "Answers & structure" },
  { feature: "Goal", seo: "Google traffic", aeo: "LLM recommendations" },
  { feature: "Format", seo: "Long-form pages", aeo: "Citable answers" },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/dashboard">Login</Link>
            </Button>
            <Button className="gap-2 gradient-bg text-primary-foreground shadow-glow-sm" asChild>
              <Link to="/onboarding">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] opacity-30" />
        
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Bot className="mr-1 h-3 w-3" />
              Answer Engine Optimization
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Be cited by{" "}
              <span className="gradient-text">ChatGPT, Gemini</span>
              {" "}& AI assistants
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate AI-ready answers that LLMs trust and cite. Turn your website into a trusted source for the next generation of search.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2 gradient-bg text-primary-foreground shadow-glow text-lg px-8" asChild>
                <Link to="/onboarding">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                Watch Demo
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              <span className="text-sm text-muted-foreground">Optimized for:</span>
              {platforms.map((platform) => (
                <Badge key={platform} variant="secondary" className="text-sm">
                  {platform}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEO vs AEO */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">SEO vs AEO</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Answer Engine Optimization is the future. While SEO focuses on search rankings, AEO ensures AI assistants cite your content.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <GlassCard className="overflow-hidden">
              <div className="grid grid-cols-3 text-center font-semibold border-b border-border p-4">
                <div></div>
                <div className="text-muted-foreground">Traditional SEO</div>
                <div className="gradient-text">AEO (Aeoreply)</div>
              </div>
              {comparisons.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 text-center p-4 ${i !== comparisons.length - 1 ? "border-b border-border" : ""}`}>
                  <div className="font-medium">{row.feature}</div>
                  <div className="text-muted-foreground">{row.seo}</div>
                  <div className="text-primary font-medium">{row.aeo}</div>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How Aeoreply Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform to make your content AI-citable
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <GlassCard key={feature.title} hover gradient className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl gradient-bg shadow-glow-sm">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Credit-Based Pricing</h2>
            <p className="text-muted-foreground">No hidden fees. Cancel anytime.</p>
          </div>

          <div className="max-w-md mx-auto">
            <GlassCard gradient className="p-8 text-center">
              <Badge className="mb-4 gradient-bg text-primary-foreground border-0">Most Popular</Badge>
              <h3 className="text-2xl font-bold">AEO Pro</h3>
              <div className="mt-4 mb-6">
                <span className="text-5xl font-bold">€79</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 text-left mb-8">
                {[
                  "100 credits per month",
                  "Public answer pages",
                  "All AI platforms",
                  "LLMs.txt generation",
                  "Sitemap automation",
                  "3-day free trial",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full gap-2 gradient-bg text-primary-foreground shadow-glow" size="lg" asChild>
                <Link to="/onboarding">
                  Start Free Trial
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 text-xs text-muted-foreground">
                1 credit = 1 AEO Answer • 2 credits = 1 AEO Article
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <GlassCard className="p-12 text-center gradient-bg text-primary-foreground overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4">
                Become an AI-cited source today
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Join businesses optimizing for the AI-first future. Start generating citable answers in minutes.
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" asChild>
                <Link to="/onboarding">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-bg">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Aeoreply</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Aeoreply. Answer Engine Optimization platform.
          </p>
        </div>
      </footer>
    </div>
  );
}
