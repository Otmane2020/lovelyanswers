import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  Globe,
  FileText,
  Star,
  TrendingUp,
  Zap,
  Search,
  ShoppingBag,
  Bot,
  Target,
  Sparkles,
  BarChart3,
  Shield,
  RefreshCw,
  Package,
  Tag,
  MessageSquare,
  Clock,
  ChevronRight,
  Play,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";

import chatgptIcon from "@/assets/chatgpt-icon.png";
import geminiLogo from "@/assets/gemini-logo.png";
import perplexityLogo from "@/assets/perplexity-logo.png";
import claudeLogo from "@/assets/claude-logo.png";
import shopifyLogo from "@/assets/shopify-logo-new.png";
import wordpressLogo from "@/assets/wordpress-logo-new.png";
import wixLogo from "@/assets/wix-logo.png";
import lovelyMascot from "@/assets/lovely-mascot.png";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5 },
};

const staggerChildren = {
  initial: {},
  whileInView: {},
  viewport: { once: true },
  transition: { staggerChildren: 0.1 },
};

const aiPlatforms = [
  { name: "ChatGPT", logo: chatgptIcon },
  { name: "Gemini", logo: geminiLogo },
  { name: "Perplexity", logo: perplexityLogo },
  { name: "Claude", logo: claudeLogo },
];

const steps = [
  {
    icon: Package,
    title: "Connect your product feed",
    description: "Import your Google Merchant Center XML feed or upload a CSV. We parse all your products instantly.",
  },
  {
    icon: Bot,
    title: "AI analyzes each product",
    description: "Our AI generates optimized titles, descriptions, Q&A blocks, and Schema markup for every product.",
  },
  {
    icon: RefreshCw,
    title: "Auto-publish & schedule",
    description: "Publish optimized content to your CMS on autopilot. 1 to 10 products per day, fully automated.",
  },
  {
    icon: TrendingUp,
    title: "Get recommended by AI",
    description: "Your products start appearing in ChatGPT, Gemini, and Google SGE recommendations.",
  },
];

const features = [
  {
    icon: Tag,
    title: "AI-Optimized Titles",
    description: "Product + benefit + target audience + key advantage format that AI engines love to cite.",
  },
  {
    icon: FileText,
    title: "Smart Descriptions",
    description: "Recommendation-oriented descriptions that answer: For whom? Why choose it? What problem does it solve?",
  },
  {
    icon: MessageSquare,
    title: "Product FAQ (6-8 Q&A)",
    description: "Natural questions covering comparison, budget, delivery, durability, and use cases.",
  },
  {
    icon: Search,
    title: "Schema Markup",
    description: "Product, FAQ, and Review schemas auto-generated. Compatible with Google SGE and AI assistants.",
  },
  {
    icon: Clock,
    title: "30-Day Planning",
    description: "Automated deployment schedule. Re-scan every 30 days, detect new products, update existing Q&A.",
  },
  {
    icon: BarChart3,
    title: "Performance Tracking",
    description: "Monitor which products get cited by AI engines and track conversion improvements.",
  },
];

const comparisonData = [
  { feature: "Content type", traditional: "Basic product descriptions", ai: "AI-recommendation-optimized content" },
  { feature: "Search intent", traditional: "Keyword matching", ai: "Purchase intent + AI citation" },
  { feature: "FAQ generation", traditional: "Manual or none", ai: "6-8 auto-generated Q&A per product" },
  { feature: "Schema markup", traditional: "Basic Product schema", ai: "Product + FAQ + Review schemas" },
  { feature: "Updates", traditional: "Manual updates", ai: "Auto-sync every 30 days" },
  { feature: "AI visibility", traditional: "Not optimized", ai: "Built for ChatGPT, Gemini & SGE" },
];

const testimonials = [
  {
    name: "Sophie L.",
    role: "E-commerce Manager",
    text: "Our products started appearing in ChatGPT recommendations within 3 weeks. Conversion rate up 34%.",
    rating: 5,
  },
  {
    name: "Thomas B.",
    role: "Shopify Store Owner",
    text: "Connected my feed, AI did everything. Now my products rank #1 on Google Shopping AND get recommended by AI.",
    rating: 5,
  },
  {
    name: "Laura M.",
    role: "DTC Brand Founder",
    text: "The auto-generated FAQ alone boosted our product page SEO by 40%. Game changer for e-commerce.",
    rating: 5,
  },
];

const faqs = [
  {
    question: "What is AI Shopping Assistant?",
    answer: "AI Shopping Assistant optimizes your e-commerce products to be recommended by AI engines like ChatGPT, Gemini, and Google SGE. It transforms your product feed into AI-optimized content with smart titles, descriptions, FAQ blocks, and Schema markup.",
  },
  {
    question: "How does it work with my product feed?",
    answer: "Simply paste your Google Merchant Center XML feed URL or upload a CSV file. We automatically parse all your products, analyze categories, and prioritize strategic items for optimization.",
  },
  {
    question: "What kind of content is generated per product?",
    answer: "For each product, we generate: an AI-optimized title, a recommendation-oriented description, 6-8 natural FAQ questions covering comparison, budget, delivery, and use cases, plus complete Schema markup (Product, FAQ, Review).",
  },
  {
    question: "Does it work with my CMS?",
    answer: "Yes! We support WordPress, Shopify, Wix, Webflow, and more. Content is auto-published directly to your product pages or as companion blog posts.",
  },
  {
    question: "How often does it update?",
    answer: "Every 30 days, the system re-scans your feed, detects new products, and updates existing Q&A content. You can also trigger manual updates anytime.",
  },
  {
    question: "Will this actually get my products recommended by ChatGPT?",
    answer: "Yes. AI engines recommend products that have clear, structured answers to purchase-intent questions. Our optimization makes your products the best source for AI to cite when users ask buying questions.",
  },
];

const exampleQuestions = [
  "What's the best laptop under $500 for students?",
  "Which running shoes are best for flat feet?",
  "What's the most durable phone case for iPhone?",
  "Best organic moisturizer for sensitive skin?",
];

export default function AiShoppingAssistant() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return (
    <>
      <Helmet>
        <title>AI Shopping Assistant — Optimize Products for ChatGPT & AI Search | AutoPilot Geo</title>
        <meta
          name="description"
          content="Get your e-commerce products recommended by ChatGPT, Gemini & Google SGE. Auto-generate AI-optimized titles, descriptions, FAQ & Schema from your product feed."
        />
        <link rel="canonical" href="https://autopilotgeo.com/ai-shopping-assistant" />
        <meta property="og:title" content="AI Shopping Assistant — Products Optimized for AI Search" />
        <meta property="og:description" content="Transform your product catalog into AI-recommended content. Auto-generated Q&A, Schema markup & smart descriptions." />
        <meta property="og:url" content="https://autopilotgeo.com/ai-shopping-assistant" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center">
              <AnimatedLogo size="md" />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                <Link to="/">Home</Link>
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                <Link to="/pricing">Pricing</Link>
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                <Link to="/blog">Blog</Link>
              </Button>
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button className="ml-2" asChild>
                <Link to="/onboarding">Start Free Trial</Link>
              </Button>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/onboarding">Start Free</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* ═══════ HERO ═══════ */}
        <section className="relative overflow-hidden pt-28 md:pt-36 pb-20 md:pb-28">
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[120px]" />

          <div className="container relative px-4">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div {...fadeUp}>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground mb-6">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  AI Shopping Optimization for E-Commerce
                </div>
              </motion.div>

              <motion.h1
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.1]"
              >
                Get your products{" "}
                <span className="text-primary">recommended by AI</span>
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
              >
                Transform your product catalog into AI-optimized content. Auto-generate Q&A, titles, descriptions & Schema markup from your Google Shopping feed.
              </motion.p>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
              >
                <Button
                  size="lg"
                  className="h-12 px-8 text-base font-semibold gap-2"
                  onClick={() => navigate("/onboarding")}
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-base"
                  onClick={() => {
                    const el = document.getElementById("how-it-works");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  See how it works
                </Button>
              </motion.div>

              {/* AI Platforms */}
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center justify-center gap-6 flex-wrap mb-12"
              >
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Optimized for</span>
                {aiPlatforms.map((p) => (
                  <div key={p.name} className="flex items-center gap-1.5">
                    <img src={p.logo} alt={p.name} className="h-5 w-5 object-contain" />
                    <span className="text-sm text-muted-foreground">{p.name}</span>
                  </div>
                ))}
              </motion.div>

              {/* Hero Mockup - Product Card */}
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="relative mx-auto max-w-3xl"
              >
                <div className="rounded-xl border border-border bg-card p-1.5 shadow-xl">
                  <div className="rounded-lg bg-muted/30 p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                        <div className="w-3 h-3 rounded-full bg-green-400/60" />
                      </div>
                      <div className="flex-1 h-6 bg-muted rounded-md flex items-center px-3">
                        <span className="text-xs text-muted-foreground">AI Shopping Assistant</span>
                      </div>
                    </div>
                    {/* Product grid mockup */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { name: "Running Shoes Pro", score: 92, status: "Optimized" },
                        { name: "Wireless Earbuds X1", score: 87, status: "Optimized" },
                        { name: "Yoga Mat Premium", score: 45, status: "Pending" },
                      ].map((product, i) => (
                        <div key={i} className="rounded-lg bg-background border border-border p-3">
                          <div className="w-full h-16 bg-muted rounded-md mb-2 flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                          <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className={`text-xs font-semibold ${product.score > 80 ? "text-emerald-500" : "text-amber-500"}`}>
                              {product.score}/100
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${product.status === "Optimized" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                              {product.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Products", value: "156" },
                        { label: "Optimized", value: "89%" },
                        { label: "AI Score", value: "84" },
                        { label: "Citations", value: "+127" },
                      ].map((stat, i) => (
                        <div key={i} className="rounded-lg bg-background border border-border p-2 text-center">
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                          <div className="text-lg font-bold text-foreground">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ AI QUERY EXAMPLES ═══════ */}
        <section className="py-16 md:py-24 border-t border-border">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Why it matters</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                AI engines answer product questions every day
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                When someone asks ChatGPT "What's the best laptop under $500?", is your product the answer? If not, you're losing sales.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {exampleQuestions.map((q, i) => (
                <motion.div
                  key={i}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{q}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {i % 2 === 0 ? "Asked 12K+ times/month on ChatGPT" : "Asked 8K+ times/month on Gemini"}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section id="how-it-works" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-16">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                From product feed to AI recommendation
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                4 simple steps to get your products cited by ChatGPT, Gemini & Google SGE
              </p>
            </motion.div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="relative text-center"
                  >
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t border-dashed border-border" />
                    )}
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 relative">
                      <Icon className="h-7 w-7 text-primary" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════ PRODUCT DEMO ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">What AI generates</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                AI-optimized content for every product
              </h2>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-4xl mx-auto">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Product header */}
                <div className="p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">AI Score: 92/100</span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">Running Shoes Pro X — Best Cushioned Running Shoes for Marathon Training 2025</h3>
                      <p className="text-sm text-muted-foreground mt-1">Original: "Running Shoes Pro X — Men's Running Shoes"</p>
                    </div>
                  </div>
                </div>

                {/* Generated content preview */}
                <div className="p-6 space-y-6">
                  {/* Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">AI Description</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The Running Shoes Pro X is designed for marathon runners seeking maximum cushioning and energy return. Ideal for runners covering 40+ km/week, it features responsive foam technology that reduces fatigue by up to 30%. Whether you're training for your first marathon or setting a new PR, these shoes provide stability and comfort on long distance runs.
                    </p>
                  </div>

                  {/* FAQ Preview */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Generated FAQ (6 questions)</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        "Are Running Shoes Pro X good for marathon training?",
                        "How do they compare to Nike Pegasus and ASICS Gel-Nimbus?",
                        "Are they worth the price for casual runners?",
                        "What's the recommended break-in period?",
                      ].map((q, i) => (
                        <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 text-sm">
                          <span className="text-primary font-medium shrink-0">Q{i + 1}:</span>
                          <span className="text-muted-foreground">{q}</span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground pl-2">+ 2 more questions generated</p>
                    </div>
                  </div>

                  {/* Schema preview */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Search className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-foreground">Schema Markup</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Product Schema", "FAQ Schema", "Review Schema"].map((s) => (
                        <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ FEATURES GRID ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Everything you need for AI shopping optimization
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={i}
                    {...fadeUp}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════ COMPARISON TABLE ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Comparison</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Traditional SEO vs AI Shopping Assistant
              </h2>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-3xl mx-auto">
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
                  <div className="p-4 text-sm font-semibold text-foreground">Feature</div>
                  <div className="p-4 text-sm font-semibold text-muted-foreground text-center">Traditional SEO</div>
                  <div className="p-4 text-sm font-semibold text-primary text-center">AI Shopping Assistant</div>
                </div>
                {comparisonData.map((row, i) => (
                  <div key={i} className={`grid grid-cols-3 ${i < comparisonData.length - 1 ? "border-b border-border" : ""}`}>
                    <div className="p-4 text-sm font-medium text-foreground">{row.feature}</div>
                    <div className="p-4 text-sm text-muted-foreground text-center">{row.traditional}</div>
                    <div className="p-4 text-sm text-foreground text-center font-medium bg-primary/5">{row.ai}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ CMS INTEGRATIONS ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Integrations</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Works with your favorite e-commerce platform
              </h2>
            </motion.div>

            <motion.div {...fadeUp} className="flex items-center justify-center gap-8 md:gap-12 flex-wrap">
              {[
                { name: "Shopify", logo: shopifyLogo },
                { name: "WordPress", logo: wordpressLogo },
                { name: "Wix", logo: wixLogo },
              ].map((platform) => (
                <div key={platform.name} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center p-3">
                    <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm text-muted-foreground">{platform.name}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-xl bg-card border border-border flex items-center justify-center">
                  <span className="text-muted-foreground text-sm font-medium">+more</span>
                </div>
                <span className="text-sm text-muted-foreground">API / Custom</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ TESTIMONIALS ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                E-commerce brands love it
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="p-6 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ PRICING TEASER ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Included in your AutoPilot Geo plan
              </h2>
              <p className="text-muted-foreground mb-8">
                AI Shopping Assistant is included with all AutoPilot Geo plans. No extra cost — optimize your products alongside your blog content.
              </p>

              <div className="p-8 rounded-2xl bg-card border border-border shadow-lg">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <img src={lovelyMascot} alt="Lovely" className="w-14 h-14 object-contain" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">$29<span className="text-lg text-muted-foreground font-normal">/month</span></p>
                    <p className="text-sm text-muted-foreground">Everything included. 3-day free trial.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left mb-6">
                  {[
                    "AI Shopping Assistant",
                    "AEO Blog Articles",
                    "Local AEO",
                    "Auto-Publishing",
                    "Keyword Research",
                    "Reddit Agent",
                    "SEO Audit",
                    "20+ Languages",
                  ].map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 text-base font-semibold gap-2"
                  onClick={() => navigate("/onboarding")}
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    <span>14-day money back</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Cancel anytime</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <motion.div {...fadeUp} className="text-center mb-12">
              <p className="text-sm font-medium text-primary uppercase tracking-wider mb-3">FAQ</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Frequently asked questions
              </h2>
            </motion.div>

            <motion.div {...fadeUp} className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-6">
                    <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* ═══════ FINAL CTA ═══════ */}
        <section className="py-16 md:py-24 bg-primary/5">
          <div className="container px-4">
            <motion.div {...fadeUp} className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
                Start getting your products recommended today
              </h2>
              <p className="text-muted-foreground mb-8">
                Join 500+ businesses already using AutoPilot Geo to dominate AI search.
              </p>
              <Button
                size="lg"
                className="h-14 px-10 text-lg font-semibold gap-2"
                onClick={() => navigate("/onboarding")}
              >
                Start free trial — 3 days free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
