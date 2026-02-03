import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import {
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
import { TrustedByMarquee } from "@/components/TrustedByMarquee";
import { ChatGPTLogo, GoogleLogo } from "@/components/icons/ChatGPTLogo";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleOneTap } from "@/components/GoogleOneTap";

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

// Lovely mascot
import lovelyMascot from "@/assets/lovely-mascot.png";

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
    text: "Burned through $1,200/mo on Jasper + Surfer + SEMrush. Results were meh. Canceled all 3 tools, now paying $29/month and getting better rankings.",
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
    text: "Set it up once with the WordPress plugin, and now articles just appear on my site every day. Like having a full-time content team for $29/month.",
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
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Force dark theme on landing page
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      // Cleanup: restore light theme when leaving
      document.documentElement.classList.remove("dark");
    };
  }, []);

  // Force light theme for landing page
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show floating CTA after scrolling past 500px (roughly past hero section)
      setShowFloatingCTA(window.scrollY > 500);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleGetStarted = () => {
    navigate(`/onboarding?url=${encodeURIComponent(websiteUrl)}`);
  };

  return (
    <>
      <Helmet>
        <title>LovelyAnswers – AEO AutoPost | Rank in ChatGPT, Gemini & Google</title>
        <meta name="description" content="Generate AI-optimized AEO answers for ChatGPT, Gemini, Copilot and Google. Get 30 articles/month, backlinks, and 216% avg traffic increase." />
        <link rel="canonical" href="https://lovelyanswers.com/" />
        <meta property="og:title" content="LovelyAnswers – Rank in ChatGPT, Gemini & Google with AI Answers" />
        <meta property="og:description" content="The #1 AEO platform. Get cited by AI assistants and dominate Google search." />
        <meta property="og:url" content="https://lovelyanswers.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lovelyanswers.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="LovelyAnswers – AEO Platform" />
        <meta name="twitter:description" content="Get recommended by ChatGPT, Perplexity AND Google" />
      </Helmet>
    <div className="min-h-screen bg-background">
      {/* Google One Tap Popup */}
      <GoogleOneTap />
      
      {/* Announcement Bar */}
      <div className="fixed top-0 z-[60] w-full bg-gradient-to-r from-pink-500 via-violet-500 to-blue-500 text-white py-1.5 md:py-2 px-2 md:px-4 text-center text-xs md:text-sm font-medium">
        <span className="inline-flex flex-wrap items-center justify-center gap-1 md:gap-2">
          <span className="hidden md:inline">👉</span>
          <span><span className="line-through opacity-75">$99</span> → <span className="font-bold">$29</span></span>
          <span className="hidden sm:inline">•</span>
          <span><span className="font-bold">70% OFF</span> Code</span>
          <span className="bg-white/20 px-1.5 md:px-2 py-0.5 rounded font-bold">FLASHSALE</span>
          <span className="hidden sm:inline text-white/90">forever</span>
        </span>
      </div>
      
      {/* Navigation */}
      <nav className="fixed top-[36px] z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <AnimatedLogo size="md" />
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
                <Sparkles className="h-4 w-4" />
                Start Free
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
      <section className="relative overflow-hidden pt-32 md:pt-40 pb-12 md:pb-20">
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

            {/* URL Input Section - Hidden on mobile, shown on desktop */}
            <div className="hidden md:block max-w-xl mx-auto mb-6 md:mb-8">
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

            {/* Sticky Mobile CTA - Fixed at bottom on mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl">
              <div className="flex flex-col gap-2 max-w-xl mx-auto">
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-primary/20 focus:border-primary"
                  />
                </div>
                <Button 
                  size="lg" 
                  className="w-full h-12 gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl text-base font-semibold"
                  onClick={handleGetStarted}
                >
                  🚀 Get Free Audit
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

      {/* Trusted By Marquee */}
      <TrustedByMarquee />

      {/* Hire Lovely Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-violet-50 via-background to-primary/5 dark:from-violet-950/30 dark:via-background dark:to-primary/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        <div className="container px-4 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {/* Left: Text */}
              <div className="space-y-6 text-center md:text-left order-2 md:order-1">
                <Badge className="bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary border-primary/20">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Meet Your AI Assistant
                </Badge>
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                  Hire <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500">Lovely</span> — Your 24/7 AI Marketing Agent
                </h2>
                <p className="text-lg text-muted-foreground">
                  While you sleep, <strong>Lovely</strong> writes expert articles, answers customer questions, 
                  and gets your brand recommended by ChatGPT, Gemini & Google. 
                  <span className="text-primary font-semibold"> No hiring, no managing, no stress.</span>
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span>Publishes 1 SEO article every day automatically</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span>Gets you cited by AI assistants (ChatGPT, Gemini, Perplexity)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span>Costs less than a coffee a day — $29/month</span>
                  </li>
                </ul>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button 
                    size="lg" 
                    className="gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-lg hover:shadow-xl"
                    onClick={() => navigate("/onboarding")}
                  >
                    <Sparkles className="h-5 w-5" />
                    Hire Lovely Now
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-emerald-500" />
                    3-day free trial • Cancel anytime
                  </div>
                </div>
              </div>
              
              {/* Right: Mascot */}
              <div className="relative order-1 md:order-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  whileInView={{ opacity: 1, scale: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-full blur-[80px] scale-75" />
                  <img 
                    src={lovelyMascot} 
                    alt="Lovely - Your AI Marketing Agent" 
                    className="relative w-full max-w-md mx-auto drop-shadow-2xl"
                  />
                </motion.div>
              </div>
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
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-[80px]" />
        
        <div className="container relative px-4">
          <div className="text-center mb-10 md:mb-16">
            <Badge className="mb-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 text-emerald-600 border-emerald-500/30">
              <TrendingUp className="mr-1 h-3 w-3" />
              Proven Results
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500">Real Businesses.</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500">Real Growth.</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500">Real Fast.</span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              We used to grow enterprises like <span className="font-semibold text-foreground">Vodafone</span> (+62% conversion). Now we help small businesses grow.
              <br />
              Same <span className="text-muted-foreground/60 line-through">$10,000/month</span> expertise for <span className="text-emerald-500 font-bold text-xl">$29/month</span>
            </p>
          </div>

          {/* Company Logos - Now in color with hover effects */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 mb-12 md:mb-16">
            {integrationLogos.slice(0, 6).map((logo) => (
              <div 
                key={logo.name}
                className="group relative p-3 rounded-xl transition-all duration-300 hover:bg-muted/50 hover:scale-110"
              >
                <img 
                  src={logo.logo} 
                  alt={logo.name}
                  className={`h-8 md:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105 ${logo.invert ? 'dark:invert' : ''}`}
                />
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {logo.name}
                </span>
              </div>
            ))}
          </div>

          {/* Testimonials Grid with colorful accents */}
          <div className="grid gap-5 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {testimonialsTweets.map((tweet, index) => {
              const gradients = [
                'from-emerald-500 to-cyan-500',
                'from-violet-500 to-fuchsia-500',
                'from-amber-500 to-orange-500',
                'from-rose-500 to-pink-500',
                'from-blue-500 to-indigo-500',
                'from-teal-500 to-green-500',
              ];
              const borderColors = [
                'hover:border-emerald-500/40',
                'hover:border-violet-500/40',
                'hover:border-amber-500/40',
                'hover:border-rose-500/40',
                'hover:border-blue-500/40',
                'hover:border-teal-500/40',
              ];
              return (
                <GlassCard 
                  key={index} 
                  className={`p-5 md:p-6 bg-gradient-to-br from-background to-muted/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${borderColors[index % borderColors.length]}`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center text-white font-bold shadow-lg`}>
                      {tweet.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tweet.name}</span>
                        <span className="text-xs text-primary/70">{tweet.handle}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">{tweet.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{tweet.text}</p>
                </GlassCard>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <div className="flex -space-x-2">
                {['M', 'D', 'A', 'R'].map((letter, i) => (
                  <div key={i} className={`h-6 w-6 rounded-full bg-gradient-to-br ${['from-emerald-500 to-cyan-500', 'from-violet-500 to-fuchsia-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500'][i]} flex items-center justify-center text-white text-xs font-bold border-2 border-background`}>
                    {letter}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium text-emerald-600">527+ businesses growing on autopilot</span>
            </div>
            <div>
              <Button 
                size="lg"
                className="gap-2 bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 text-white shadow-xl hover:shadow-emerald-500/25 hover:scale-105 transition-all h-14 px-8 text-lg"
                onClick={() => navigate("/onboarding")}
              >
                Start Growing Like They Did
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/50 via-muted/30 to-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        <div className="container px-4 relative">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-600 border-violet-500/30">
              <Zap className="mr-1 h-3 w-3" />
              Simple 4-Step Process
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500">Growth Engine</span>
              : From Research to Revenue
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Set it up once, watch your traffic grow on autopilot
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {steps.map((step, i) => {
              const stepGradients = [
                { bg: 'from-blue-500 to-cyan-500', border: 'hover:border-blue-500/40', shadow: 'hover:shadow-blue-500/20' },
                { bg: 'from-violet-500 to-purple-500', border: 'hover:border-violet-500/40', shadow: 'hover:shadow-violet-500/20' },
                { bg: 'from-amber-500 to-orange-500', border: 'hover:border-amber-500/40', shadow: 'hover:shadow-amber-500/20' },
                { bg: 'from-emerald-500 to-green-500', border: 'hover:border-emerald-500/40', shadow: 'hover:shadow-emerald-500/20' },
              ];
              const stepIcons = [
                <FileText key={0} className="h-5 w-5" />,
                <Sparkles key={1} className="h-5 w-5" />,
                <ExternalLink key={2} className="h-5 w-5" />,
                <TrendingUp key={3} className="h-5 w-5" />,
              ];
              return (
                <div key={i} className="relative group">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-[calc(100%+0.5rem)] w-[calc(100%-2rem)] h-0.5 bg-gradient-to-r from-border via-primary/30 to-border" />
                  )}
                  <div className={`bg-card rounded-2xl p-6 border border-border h-full transition-all duration-300 ${stepGradients[i].border} ${stepGradients[i].shadow} hover:shadow-xl hover:-translate-y-1`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stepGradients[i].bg} flex items-center justify-center text-white font-bold shadow-lg`}>
                        {stepIcons[i]}
                      </div>
                      <span className="text-3xl font-bold text-muted-foreground/30">0{step.number}</span>
                    </div>
                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                    <Badge className={`text-xs bg-gradient-to-r ${stepGradients[i].bg} text-white border-0`}>{step.badge}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-500/5 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-[120px]" />
        
        <div className="container px-4 relative">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">Transparent</span> Pricing
            </h2>
          </div>
          
          <div className="max-w-lg mx-auto">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 rounded-3xl blur opacity-30" />
              
              <GlassCard className="relative p-8 md:p-10 text-center border-2 border-violet-500/30 bg-card/95">
                <Badge className="mb-4 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-600 border-violet-500/30">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
                
                <h2 className="text-2xl font-bold mb-2">Weekly Plan</h2>
                <p className="text-muted-foreground mb-6">Best for serious growth</p>
                
                <div className="flex items-baseline justify-center gap-2 mb-8">
                  <span className="text-2xl text-muted-foreground line-through">$99</span>
                  <span className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">$29</span>
                  <span className="text-muted-foreground">/week</span>
                </div>

                <ul className="space-y-4 text-left mb-8">
                  {pricingFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  size="lg" 
                  className="w-full h-14 gap-2 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-500 text-white hover:opacity-90 text-lg font-semibold shadow-xl hover:shadow-violet-500/30 transition-all"
                  onClick={() => navigate("/onboarding")}
                >
                  Start Growing
                  <ArrowRight className="h-5 w-5" />
                </Button>

                <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-emerald-500" />
                    3-day free trial
                  </span>
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-emerald-500" />
                    Cancel anytime
                  </span>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background">
        <div className="container px-4">
          <div className="text-center mb-14">
            <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-amber-500/30">
              Got Questions?
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Questions</span>
            </h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-2xl border border-border px-6 transition-all duration-300 hover:border-primary/30 hover:shadow-md data-[state=open]:border-primary/40 data-[state=open]:shadow-lg">
                  <AccordionTrigger className="text-left font-semibold py-5 hover:no-underline">
                    <span className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {i + 1}
                      </span>
                      {faq.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 pl-11">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/10 to-fuchsia-500/10" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-6 bg-gradient-to-r from-rose-500/10 to-orange-500/10 text-rose-600 border-rose-500/30 text-sm px-4 py-1">
              🔥 Early adopters are already winning
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Your Only Risk is{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500">NOT Trying</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
              While you're reading this, your competitors are getting AI traffic. Don't be left behind.
            </p>
            <Button 
              size="lg" 
              className="h-16 px-10 gap-3 bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 text-white shadow-2xl hover:shadow-emerald-500/30 text-xl font-semibold hover:scale-105 transition-all"
              onClick={() => navigate("/onboarding")}
            >
              Start Your Free Trial Now
              <ArrowRight className="h-6 w-6" />
            </Button>
            <div className="flex items-center justify-center gap-6 mt-8 text-muted-foreground">
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                3-day free trial
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-500" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* TrustAvis Floating Widget - Mobile First */}
      <a
        href="https://trust-avis.com/entreprise/lovelyanswers"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-1/2 -translate-y-1/2 right-4 z-40 bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-2 hover:shadow-xl hover:scale-105 transition-all group"
      >
        {/* TrustAvis Logo */}
        <div className="flex items-center justify-center w-8 h-8 bg-[#2563EB] rounded-md">
          <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        
        {/* Rating & Brand */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-900">Trust</span>
            <span className="text-sm font-bold text-[#2563EB]">Avis</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-700">4.9</span>
            <span className="text-xs text-gray-500">(289)</span>
          </div>
        </div>
      </a>
    </div>
    </>
  );
}
