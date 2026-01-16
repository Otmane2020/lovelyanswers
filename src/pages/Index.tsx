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
  Globe,
  FileText,
  Star,
  TrendingUp,
  X,
  Zap,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ChatGPTLogo, GoogleLogo } from "@/components/icons/ChatGPTLogo";

// Integration logos
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import framerLogo from "@/assets/framer-logo.png";
import boltLogo from "@/assets/bolt-logo.png";
import lovableLogo from "@/assets/lovable-logo.svg";
import bigcommerceLogo from "@/assets/bigcommerce-logo.png";

// AI Platform logos
import geminiLogo from "@/assets/gemini-logo.png";
import claudeLogo from "@/assets/claude-logo.png";
import perplexityLogo from "@/assets/perplexity-logo.png";

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
    text: "Honestly thought \"another SEO tool that won't deliver.\" Started in June anyway. Impressions up 180%, clicks up 90% in 3 months. Now I sell it to my own clients as a managed service.",
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
    text: "Was scared AI content would tank my rankings. Opposite happened. Went from page 3 to page 1 for 12+ keywords in 8 weeks.",
  },
  {
    name: "Ryan",
    handle: "@RyanGrowthCo",
    role: "Agency Owner",
    date: "Jul 12, 2025",
    text: "Burned through $1,200/mo on Jasper + Surfer + SEMrush. Results were meh. Canceled all 3 tools, now paying $29/week and getting better rankings.",
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
    badge: "Analyzes 500+ competitor keywords",
  },
  {
    number: "2",
    title: "Write 1 Expert Article Daily",
    description: "High-quality content that solves real customer problems",
    badge: "1,500-2,500 words avg",
  },
  {
    number: "3",
    title: "Get Backlinks Monthly (Autopilot)",
    description: "Other trusted sites mention and link to your articles",
    badge: "Strict ZERO spam policy",
  },
  {
    number: "4",
    title: "Watch Traffic Explode",
    description: "AI chatbots recommend you. Google ranks you higher.",
    badge: "216% avg traffic increase",
  },
];

const pricingFeatures = [
  "30 AEO LovelyAnswers",
  "30 AEO/SEO articles",
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
    answer: "We're anti-robot. Every article: 1,500+ words, expert-level, with sources and infographics.",
  },
  {
    question: "Will AI content hurt my Google rankings?",
    answer: "Google cares about quality, not who wrote it. Our AI-assisted content follows E-E-A-T guidelines.",
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
              <Link to="/onboarding">
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

      {/* Hero Section */}
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
              <span className="inline-flex items-center gap-2">
                <ChatGPTLogo className="h-8 w-8 md:h-10 md:w-10 text-[#10a37f]" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10a37f] to-emerald-400">ChatGPT</span>
              </span>
              ,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-500">Perplexity</span>
              {" "}AND{" "}
              <span className="inline-flex items-center gap-1">
                <GoogleLogo className="h-7 w-7 md:h-9 md:w-9" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-red-500 to-yellow-500">Google</span>
              </span>
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
                  Get Started Free
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

      {/* AI Comparison Section - WITHOUT vs WITH */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              While You Read This, AI is Recommending Your Competitors
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* WITHOUT */}
            <GlassCard className="p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-3 mb-4">
                <ChatGPTLogo className="h-8 w-8 text-[#10a37f]" />
                <span className="text-sm font-medium text-muted-foreground">AI Assistant</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">What's the best roofing company in Dallas?</p>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-bold">1. CompetitorRoof Pro</span> - Highly rated, 20+ years</p>
                  <p className="text-sm"><span className="font-bold">2. RivalRoofing Solutions</span> - Excellent warranty</p>
                  <p className="text-sm"><span className="font-bold">3. OtherCompany Roofing</span> - Fast response</p>
                </div>
              </div>
              <div className="text-center mb-4">
                <Badge className="bg-red-500/10 text-red-600 border-red-500/20">WITHOUT LovelyAnswers</Badge>
              </div>
              <ul className="space-y-2">
                {comparisonWithout.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4 text-red-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* WITH */}
            <GlassCard className="p-6 border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center gap-3 mb-4">
                <ChatGPTLogo className="h-8 w-8 text-[#10a37f]" />
                <span className="text-sm font-medium text-muted-foreground">AI Assistant</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">What's the best roofing company in Dallas?</p>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-bold text-emerald-600">1. YOUR BUSINESS</span> - Top-rated, expert team</p>
                  <p className="text-sm"><span className="font-bold">2. CompetitorRoof Pro</span> - Also well reviewed</p>
                  <p className="text-sm"><span className="font-bold">3. RivalRoofing</span> - Good local option</p>
                </div>
              </div>
              <div className="text-center mb-4">
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">WITH LovelyAnswers</Badge>
              </div>
              <ul className="space-y-2">
                {comparisonWith.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>

          {/* AI Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            {aiStats.map((stat, i) => (
              <div key={i} className="text-center p-6 rounded-xl bg-card border border-border">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground/60">{stat.source}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button 
              size="lg" 
              className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white"
              onClick={() => navigate("/onboarding")}
            >
              Start Getting AI Traffic
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-12 md:py-20 relative overflow-hidden">
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
            <Button 
              size="lg"
              className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white"
              onClick={() => navigate("/onboarding")}
            >
              Start Growing Like They Did
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Your Growth Engine: From Research to Revenue
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className="bg-card rounded-xl p-6 border border-border h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white font-bold">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="font-bold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                  <Badge variant="secondary" className="text-xs">{step.badge}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 md:py-20">
        <div className="container px-4">
          <div className="max-w-lg mx-auto">
            <GlassCard className="p-8 text-center border-primary/20">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="mr-1 h-3 w-3" />
                Most Popular
              </Badge>
              
              <h2 className="text-2xl font-bold mb-2">Weekly Plan</h2>
              <p className="text-muted-foreground mb-6">Best for serious growth</p>
              
              <div className="flex items-baseline justify-center gap-2 mb-6">
                <span className="text-5xl font-bold">$29</span>
                <span className="text-muted-foreground">/week</span>
              </div>

              <ul className="space-y-3 text-left mb-8">
                {pricingFeatures.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                size="lg" 
                className="w-full h-14 gap-2 bg-foreground text-background hover:bg-foreground/90 text-lg font-medium"
                onClick={() => navigate("/onboarding")}
              >
                Start Growing
                <ArrowRight className="h-5 w-5" />
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                3-day free trial • Cancel anytime • Annual plan saves 20%
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 bg-muted/30">
        <div className="container px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-xl border border-border px-6">
                  <AccordionTrigger className="text-left font-medium py-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-6">
              Your Only Risk is NOT Trying
            </h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              🔥 Early adopters are already winning. Don't be left behind.
            </p>
            <Button 
              size="lg" 
              className="h-14 px-8 gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl text-lg"
              onClick={() => navigate("/onboarding")}
            >
              Start Now
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              3 days to test everything. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
