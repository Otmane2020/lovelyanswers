import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import {
  Heart,
  ArrowRight,
  Check,
  Sparkles,
  Globe,
  FileText,
  Target,
  Bot,
  Star,
  Quote,
  TrendingUp,
  Search,
  BarChart3,
  X,
  Zap,
  Users,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";

// Integration logos
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import boltLogo from "@/assets/bolt-logo.png";
import lovableLogo from "@/assets/lovable-logo.svg";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";

// AI Platform logos
import chatgptLogo from "@/assets/chatgpt-logo.png";
import geminiLogo from "@/assets/gemini-logo.png";
import claudeLogo from "@/assets/claude-logo.png";
import perplexityLogo from "@/assets/perplexity-logo.png";

// Company logos for testimonials
import companyTechflow from "@/assets/company-techflow.png";
import companyGrowthlab from "@/assets/company-growthlab.png";
import companyNexus from "@/assets/company-nexus.png";
import companyNordic from "@/assets/company-nordic.png";

const stats = [
  { value: "216%", label: "Avg Traffic Increase" },
  { value: "527+", label: "Businesses Growing" },
  { value: "Zero", label: "Technical Skills Needed" },
];

const testimonialsTweets = [
  {
    name: "Mike",
    handle: "@MikeRoofingDFW",
    role: "Roofing Company Owner",
    date: "Oct 28, 2025",
    text: "Honestly thought \"another SEO tool that won't deliver.\" Started in June anyway. Impressions up 180%, clicks up 90% in 3 months. Now I sell it to my own clients as a managed service. If you run a local service biz, try this. You'll stop wasting time on content.",
  },
  {
    name: "David",
    handle: "@davidmakees",
    role: "SaaS Founder",
    date: "Sep 15, 2025",
    text: "I'm bootstrapping, so it's nice knowing the blog and SEO aren't neglected. The articles are great and totally in context!",
  },
  {
    name: "Amanda",
    handle: "@AmandaEcomLife",
    role: "Online Store Owner",
    date: "Aug 3, 2025",
    text: "Was scared AI content would tank my rankings. Opposite happened. Went from page 3 to page 1 for 12+ keywords in 8 weeks. The keyword research is genuinely smart - finds gaps competitors miss. Any e-commerce owner: this beats hiring writers. Your SEO will thank you.",
  },
  {
    name: "Ryan",
    handle: "@RyanGrowthCo",
    role: "Agency Owner",
    date: "Jul 12, 2025",
    text: "Burned through $1,200/mo on Jasper + Surfer + SEMrush. Results were meh. Tried this expecting nothing. Canceled all 3 tools, now paying $29/week and getting better rankings. Saved $13,800 this year.",
  },
  {
    name: "Jessica",
    handle: "@JessicaWrites_",
    role: "Blogger",
    date: "Jun 21, 2025",
    text: "Went from 0 to 24 DA in just 3 months. Absolutely amazing results! ⚡",
  },
  {
    name: "Tom",
    handle: "@TomLocalBiz",
    role: "Local Business Owner",
    date: "May 17, 2025",
    text: "Set it up once with the WordPress plugin, and now articles just appear on my site every day. Like having a full-time content team for $29/week.",
  },
];

const comparisonWithout = [
  "Your business: Not mentioned",
  "AI doesn't know you exist",
  "Lost customer to competitor",
  "They click on someone else",
];

const comparisonWith = [
  "Your business: Top recommendation",
  "AI knows you're the expert",
  "Customer clicks to YOUR site",
  "They trust AI's top pick",
];

const aiStats = [
  { value: "67%", label: "of people now start with AI search", source: "Gartner Research 2024" },
  { value: "3x", label: "more clicks than position #2 on Google", source: "AI recommendations convert better" },
  { value: "319%+", label: "traffic gains for first movers", source: "Early adopters winning big" },
];

const steps = [
  {
    number: "1",
    title: "Deep Research on YOUR Business",
    description: "Our AI studies your business, customers, and competitors",
    example: "For 'Dallas Electrician': We discover people search 'smart thermostat installation' NOT just 'electrician near me'",
    badge: "Analyzes 500+ competitor keywords",
  },
  {
    number: "2",
    title: "Write 1 Expert Article Daily",
    description: "High-quality content that solves real customer problems",
    example: "Not fluff. Articles like '5 Signs Your Circuit Breaker is Dangerous' that build trust",
    badge: "1,500-2,500 words avg",
  },
  {
    number: "3",
    title: "Get 100 Domain Authority worth of Backlinks Monthly (Autopilot)",
    description: "Other trusted sites mention and link to your articles",
    example: "Like getting public votes of confidence",
    badge: "Strict ZERO spam policy",
  },
  {
    number: "4",
    title: "Watch Traffic Explode",
    description: "AI chatbots recommend you. Google ranks you higher.",
    example: "More customers find you organically = $0 ad spend",
    badge: "216% avg traffic increase",
  },
];

const pricingFeatures = [
  "30 SEO-optimized articles",
  "100 Domain Authority worth of high-authority backlinks",
  "Keyword research & competitor analysis",
  "WordPress auto-publishing",
  "Custom images & infographics",
];

const faqs = [
  {
    question: "Can I really cancel anytime?",
    answer: "Yes, 1-click cancellation. No questions asked, no hidden fees.",
  },
  {
    question: "Do I need technical skills?",
    answer: "No, we handle everything. Just enter your website URL and we do the rest.",
  },
  {
    question: "Will this work for my industry?",
    answer: "Yes, proven in 50+ industries including healthcare, legal, e-commerce, SaaS, and local services.",
  },
  {
    question: "Is the content actually good, or just AI spam?",
    answer: "We're anti-robot. Our motto: \"If you wouldn't share it on LinkedIn, it's not good enough.\" Every article: 1,500+ words, expert-level, with sources and infographics.",
  },
  {
    question: "I've been burned by SEO agencies before.",
    answer: "Unlike agencies that keep you in the dark: See every article before it publishes, track every backlink we build, dashboard updates in real-time. You're in control, we do the work.",
  },
  {
    question: "Will AI content hurt my Google rankings?",
    answer: "Google cares about quality, not who wrote it. Our AI-assisted content follows E-E-A-T guidelines and is reviewed for accuracy. Many clients see rankings improve within weeks.",
  },
];

const integrationLogos = [
  { name: "WordPress", logo: wordpressLogo, invert: true },
  { name: "Shopify", logo: shopifyLogo, invert: false },
  { name: "Wix", logo: wixLogo, invert: true },
  { name: "Framer", logo: framerLogo, invert: true },
  { name: "Bolt", logo: boltLogo, invert: false },
  { name: "Lovable", logo: lovableLogo, invert: false },
  { name: "BigCommerce", logo: bigcommerceLogo, invert: true },
];

export default function Index() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Navigate to onboarding with URL pre-filled
    navigate(`/onboarding?url=${encodeURIComponent(websiteUrl)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg">
              <Heart className="h-4 w-4 md:h-5 md:w-5 text-white fill-white" />
            </div>
            <span className="text-lg md:text-xl font-bold tracking-tight">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg hover:opacity-90" asChild>
              <Link to="/auth?mode=signup">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="flex md:hidden items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section with URL Input */}
      <section className="relative overflow-hidden pt-24 md:pt-32 pb-12 md:pb-20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5" />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-500/20 to-primary/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container relative px-4">
          <div className="mx-auto max-w-4xl text-center">
            {/* Urgency Badge */}
            <Badge className="mb-4 md:mb-6 bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Clock className="mr-1 h-3 w-3" />
              ⏰ You're 2.5 years behind competitors who do SEO
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6">
              Get Found & Recommended by{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500">
                ChatGPT, Perplexity
              </span>
              {" "}AND Google
            </h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 px-4">
              📚 We catch you up with 1 expert article daily + building trust (backlinks).
              <br className="hidden md:block" />
              Get more customers from ChatGPT & Google on autopilot 👇
            </p>

            {/* URL Input Section */}
            <div className="max-w-xl mx-auto mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="pl-12 h-14 text-base md:text-lg border-2 border-primary/20 focus:border-primary"
                  />
                </div>
                <Button 
                  size="lg" 
                  className="h-14 px-6 md:px-8 gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base md:text-lg whitespace-nowrap"
                  onClick={handleGetStarted}
                >
                  Get 3 Articles + 30-Day Plan
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stats Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-8 md:mb-12">
              {stats.map((stat) => (
                <div key={stat.label} className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-muted/50 border border-border/50">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm md:text-base">
                    <span className="font-bold text-foreground">{stat.value}</span>
                    <span className="text-muted-foreground ml-1">{stat.label}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Example Article Card */}
      <section className="py-8 md:py-16 relative">
        <div className="container px-4">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-4 md:p-8 bg-gradient-to-br from-background to-muted/30 overflow-hidden">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                  <FileText className="h-3 w-3" />
                  Example Article
                </div>
                <Badge variant="secondary" className="text-xs">Private home care provider</Badge>
              </div>
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Keyword: dementia • 1,564 words + custom infographic</p>
                  <h3 className="text-lg md:text-xl font-bold">Dementia Home Care: A Comprehensive Guide to Navigating Symptoms and Stages</h3>
                </div>
              </div>
              
              <p className="text-sm md:text-base text-muted-foreground mb-4 line-clamp-3">
                When a loved one's behavior begins to change and forgetfulness becomes a daily reality, it's natural to feel worried and uncertain. A dementia diagnosis can be shocking, but with the right knowledge and support, you can provide dignified and loving care...
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Created: Jan 16, 2026</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                    "Your Money Your Life"-Compliant
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  Read Example
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Testimonials - Tweet Style */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Real Businesses. Real Growth. Real Fast.</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              We used to grow enterprises like Vodafone (+62% conversion). Now we help small businesses grow.
              <br />
              Same $10,000/month expertise for <span className="line-through">$400</span> <span className="text-primary font-bold">$29/week</span>.
            </p>
          </div>

          {/* Company Logos */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 mb-8 md:mb-12 opacity-60">
            {integrationLogos.slice(0, 5).map((logo) => (
              <img 
                key={logo.name}
                src={logo.logo} 
                alt={logo.name}
                className={`h-6 md:h-8 w-auto object-contain grayscale ${logo.invert ? 'dark:invert' : ''}`}
              />
            ))}
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {testimonialsTweets.map((tweet, index) => (
              <GlassCard key={index} className="p-4 md:p-6 bg-gradient-to-br from-background to-muted/30">
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white font-bold">
                    {tweet.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{tweet.name}</span>
                      <span className="text-xs text-muted-foreground">{tweet.handle}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tweet.role}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{tweet.date}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{tweet.text}</p>
              </GlassCard>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground mb-4">Join 527+ businesses growing on autopilot</p>
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white" asChild>
              <Link to="/auth?mode=signup">
                Start Growing Like They Did
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* AI Comparison Section */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-background to-emerald-500/5" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">While You Read This, AI is Recommending Your Competitors</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
            {/* Without LovelyAnswers */}
            <GlassCard className="p-6 border-red-500/20 bg-gradient-to-br from-red-500/5 to-background">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">ChatGPT</h3>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-2">What's the best roofing company in Dallas?</p>
                <p className="text-sm text-muted-foreground mb-2">Based on customer reviews and industry reputation, here are the top roofing companies in Dallas:</p>
                <ol className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="font-bold">1.</span>
                    <span>CompetitorRoof Pro - Highly rated, 20+ years experience</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">2.</span>
                    <span>RivalRoofing Solutions - Excellent warranty options</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">3.</span>
                    <span>OtherCompany Roofing - Fast response times</span>
                  </li>
                </ol>
              </div>
              <Badge variant="destructive" className="mb-3">WITHOUT LovelyAnswers</Badge>
              <ul className="space-y-2">
                {comparisonWithout.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* With LovelyAnswers */}
            <GlassCard className="p-6 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-background">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">ChatGPT</h3>
                  <p className="text-xs text-muted-foreground">AI Assistant</p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium mb-2">What's the best roofing company in Dallas?</p>
                <p className="text-sm text-muted-foreground mb-2">Based on customer reviews and industry reputation, here are the top roofing companies in Dallas:</p>
                <ol className="text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span className="font-semibold text-primary">YOUR BUSINESS - Top-rated service, expert team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">2.</span>
                    <span>CompetitorRoof Pro - Also well reviewed</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-bold">3.</span>
                    <span>RivalRoofing Solutions - Good local option</span>
                  </li>
                </ol>
              </div>
              <Badge className="mb-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">WITH LovelyAnswers</Badge>
              <ul className="space-y-2">
                {comparisonWith.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* AI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {aiStats.map((stat) => (
              <GlassCard key={stat.label} className="p-6 text-center">
                <p className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500 mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground/70">{stat.source}</p>
              </GlassCard>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl" asChild>
              <Link to="/auth?mode=signup">
                Start Getting AI Traffic
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-2">Every day you wait, your competitors get further ahead.</p>
          </div>
        </div>
      </section>

      {/* How It Works - 4 Steps */}
      <section className="py-12 md:py-20 relative">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Your Growth Engine: From Research to Revenue in 4 Simple Steps</h2>
          </div>

          <div className="grid gap-6 md:gap-8 max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <GlassCard key={step.number} className="p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-full blur-2xl" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white font-bold text-xl">
                    {step.number}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-3">{step.description}</p>
                    <p className="text-sm text-muted-foreground/80 italic mb-3">{step.example}</p>
                    <Badge variant="secondary" className="text-xs">{step.badge}</Badge>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="absolute left-10 -bottom-4 w-0.5 h-8 bg-gradient-to-b from-primary/50 to-transparent" />
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Comparison */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-fuchsia-500/5 to-violet-500/5" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Agency-Quality SEO. Without the $5,000/Month Bill.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto mb-12">
            {/* Traditional Agency */}
            <GlassCard className="p-6 md:p-8 border-muted">
              <h3 className="text-xl font-bold mb-2">Traditional SEO Agency</h3>
              <p className="text-3xl font-bold text-muted-foreground mb-4">$3,000-$8,000<span className="text-base font-normal">/month</span></p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  Huge upfront investment
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  3-month minimum contract
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  Black box reporting
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <X className="h-4 w-4 text-red-500" />
                  Maybe 4-8 articles/month
                </li>
              </ul>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Average Agency Annual Cost:</p>
                <p className="text-xl font-bold">$36,000 - $96,000</p>
              </div>
            </GlassCard>

            {/* LovelyAnswers */}
            <GlassCard gradient className="p-6 md:p-8 relative overflow-hidden">
              <Badge className="absolute top-4 right-4 bg-primary text-white">Most Popular Choice</Badge>
              <h3 className="text-xl font-bold mb-2">LovelyAnswers</h3>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500 mb-4">$29<span className="text-base font-normal text-foreground">/week</span></p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Affordable for any business
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Cancel anytime with 1 click
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  Full transparency dashboard
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500" />
                  30 articles/month guaranteed
                </li>
              </ul>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-muted-foreground">LovelyAnswers Annual Cost:</p>
                <p className="text-xl font-bold text-emerald-600">Only $1,508</p>
              </div>
            </GlassCard>
          </div>

          {/* Savings Calculator */}
          <GlassCard className="max-w-2xl mx-auto p-6 text-center">
            <h3 className="text-lg font-bold mb-4">Your Savings Breakdown</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Traditional SEO Cost:</p>
                <p className="font-bold">$60,000/year</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">LovelyAnswers Cost:</p>
                <p className="font-bold text-primary">$1,508/year</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">You Save:</p>
                <p className="font-bold text-emerald-600">$58,492/year</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">98% cost reduction</Badge>
          </GlassCard>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-12 md:py-20">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Choose Your Growth Plan</h2>
            <p className="text-muted-foreground">Start with $1. See results in 3 days. Cancel anytime.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Annual */}
            <GlassCard className="p-6 relative">
              <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/20">💰 Best Value</Badge>
              <h3 className="text-xl font-bold mb-2">Annual</h3>
              <p className="text-3xl font-bold mb-1">$990<span className="text-base font-normal text-muted-foreground">/year</span></p>
              <p className="text-sm text-emerald-600 mb-4">Save 2 months</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />365 SEO articles/year</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />1,200 DA worth of backlinks/year</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />VIP support</li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link to="/auth?mode=signup">Start Growing</Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">🛡️ 30-day money-back guarantee</p>
            </GlassCard>

            {/* Weekly - Featured */}
            <GlassCard gradient className="p-6 relative scale-105 shadow-xl">
              <Badge className="mb-4 bg-primary text-white">⭐ Most Popular</Badge>
              <h3 className="text-xl font-bold mb-2">Weekly</h3>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500 mb-1">$29<span className="text-base font-normal text-foreground">/week</span></p>
              <p className="text-sm text-muted-foreground mb-4">Best for serious growth</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />30 SEO articles/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />100 DA worth of backlinks/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />Priority support</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />Cancel with 1 click</li>
              </ul>
              <Button className="w-full gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white" asChild>
                <Link to="/auth?mode=signup">
                  Start Growing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </GlassCard>

            {/* Monthly */}
            <GlassCard className="p-6">
              <Badge variant="secondary" className="mb-4">Monthly</Badge>
              <h3 className="text-xl font-bold mb-2">Monthly</h3>
              <p className="text-3xl font-bold mb-1">$99<span className="text-base font-normal text-muted-foreground">/month</span></p>
              <p className="text-sm text-muted-foreground mb-4">Flexible monthly plan</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />30 SEO articles/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />100 DA worth of backlinks/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" />Cancel anytime</li>
              </ul>
              <Button className="w-full" variant="outline" asChild>
                <Link to="/auth?mode=signup">Start Growing</Link>
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">🛡️ 7-day money-back guarantee</p>
            </GlassCard>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Your Trial Includes: 3 days for just $1 • Full access to all features • Cancel anytime with 1 click
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 pb-32 md:pb-20">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Still on the Fence? Let's Clear That Up.</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-sm md:text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-xs md:text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          <div className="text-center mt-8">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl" asChild>
              <Link to="/auth?mode=signup">
                Your Only Risk is NOT Trying - Start
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="container px-4">
          <GlassCard className="p-6 md:p-12 text-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative text-white">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">
                The Choice is Yours
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-8">
                <div className="text-left p-4 rounded-lg bg-black/20">
                  <h3 className="font-bold mb-2">Keep Struggling</h3>
                  <ul className="space-y-1 text-sm text-white/80">
                    <li>• Keep paying $500+/month for SEO tools</li>
                    <li>• Spend hours writing content yourself</li>
                    <li>• Watch competitors dominate AI search</li>
                  </ul>
                </div>
                <div className="text-left p-4 rounded-lg bg-white/20">
                  <h3 className="font-bold mb-2">Start Growing Today</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Pay just $29/week (start with $1)</li>
                    <li>• Get 30 expert articles published automatically</li>
                    <li>• Be recommended by ChatGPT & Perplexity</li>
                  </ul>
                </div>
              </div>
              <p className="text-white/80 mb-6">🔥 Early adopters are already winning. Don't be left behind.</p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl" asChild>
                <Link to="/auth?mode=signup">
                  Start Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <p className="text-sm text-white/60 mt-4">3 days to test everything. Cancel anytime.</p>
            </div>
          </GlassCard>
        </div>
      </section>

      <PublicFooter />

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent md:hidden">
        <Button 
          size="lg" 
          className="w-full gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-2xl text-base font-semibold py-6" 
          asChild
        >
          <Link to="/auth?mode=signup">
            Start Growing
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      
      <div className="h-24 md:hidden" />
    </div>
  );
}
