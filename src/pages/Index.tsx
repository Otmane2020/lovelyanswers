import { useState, useEffect } from "react";
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
  BarChart3,
  Search,
  Eye,
  Target,
  MessageSquare,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { ChatGPTLogo, GoogleLogo } from "@/components/icons/ChatGPTLogo";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleOneTap } from "@/components/GoogleOneTap";
import { InactivityPopup } from "@/components/InactivityPopup";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { ExitIntentPopup } from "@/components/nudges/ExitIntentPopup";

import geminiLogo from "@/assets/gemini-logo.png";
import claudeLogo from "@/assets/claude-logo.png";
import perplexityLogo from "@/assets/perplexity-logo.png";
import chatgptIcon from "@/assets/chatgpt-icon.png";

const heroStats = [
  { value: "4.5", suffix: "x", label: "More AI visibility" },
  { value: "9.7", suffix: "x", label: "More brand mentions" },
  { value: "60", suffix: "%", label: "Traffic increase avg" },
  { value: "1.5", suffix: "bn", label: "AI searches monthly" },
];

const aiPlatforms = [
  { name: "ChatGPT", logo: chatgptIcon },
  { name: "Gemini", logo: geminiLogo },
  { name: "Perplexity", logo: perplexityLogo },
  { name: "Claude", logo: claudeLogo },
];

const featureCards = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: "AI Visibility Score",
    description:
      "See exactly how AI platforms talk about your brand and where you rank against competitors.",
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Brand Mention Tracking",
    description:
      "Monitor every time AI recommends your business or your competitors in real-time.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Content Optimization",
    description:
      "Get actionable insights to optimize your content for AI citation and recommendation.",
  },
];

const showcaseFeatures = [
  {
    tag: "MONITOR YOUR AI PRESENCE",
    title: "Track your visibility across all AI platforms",
    description:
      "Real-time monitoring of how ChatGPT, Gemini, Perplexity and Claude mention your brand.",
  },
  {
    tag: "OPTIMIZE YOUR CONTENT",
    title: "AI-powered content that gets you cited",
    description:
      "Generate expert articles designed to be recommended by AI search engines.",
  },
  {
    tag: "GROW ON AUTOPILOT",
    title: "Automated publishing & SEO",
    description:
      "1 article per day, auto-published to your CMS with full SEO optimization.",
  },
];

const testimonials = [
  {
    platform: "Trustpilot",
    reviews: [
      {
        name: "Mike R.",
        role: "Roofing Company Owner",
        text: "Impressions up 180%, clicks up 90% in 3 months. Now I sell it to my own clients as a managed service.",
        rating: 5,
      },
      {
        name: "Amanda K.",
        role: "Online Store Owner",
        text: "Went from page 3 to page 1 for 12+ keywords in 8 weeks. AI content actually works.",
        rating: 5,
      },
      {
        name: "Ryan G.",
        role: "Agency Owner",
        text: "Canceled $1,200/mo in tools. Now paying $29/month and getting better rankings.",
        rating: 5,
      },
    ],
  },
  {
    platform: "G2",
    reviews: [
      {
        name: "David M.",
        role: "SaaS Founder",
        text: "It's nice knowing the blog and SEO aren't neglected. The articles are great and totally in context!",
        rating: 5,
      },
      {
        name: "Jessica W.",
        role: "Blogger",
        text: "Went from 0 to 24 DA in just 3 months. Absolutely amazing results!",
        rating: 5,
      },
      {
        name: "Tom L.",
        role: "Local Business Owner",
        text: "Set it up once with the WordPress plugin, articles appear every day. Like a content team for $29/mo.",
        rating: 5,
      },
    ],
  },
];

const bottomFeatures = [
  {
    icon: <Search className="h-5 w-5" />,
    title: "Keyword Research",
    description: "AI-powered keyword discovery based on your competitors and market.",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Content Generation",
    description: "Expert-level articles optimized for both Google and AI engines.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Auto-Publishing",
    description: "Direct integration with WordPress, Shopify, Wix, and more.",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Performance Analytics",
    description: "Track your growth across Google Search Console and AI platforms.",
  },
];

const faqs = [
  {
    question: "How does AI search optimization work?",
    answer:
      "We create expert content that AI platforms like ChatGPT, Gemini, and Perplexity use as sources when answering user questions. This gets your brand recommended directly by AI.",
  },
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
    answer:
      "Yes, proven in 50+ industries including healthcare, legal, e-commerce, SaaS, and local services.",
  },
  {
    question: "Is the content actually good?",
    answer:
      "Every article: 1,500+ words, expert-level, with sources and infographics. Google cares about quality, not who wrote it.",
  },
];

export default function Index() {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [activeTestimonialPlatform, setActiveTestimonialPlatform] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const handleGetStarted = () => {
    if (websiteUrl.trim()) {
      navigate(`/signup`);
    } else {
      navigate(`/signup`);
    }
  };

  return (
    <>
      <SocialProofToast />
      <ExitIntentPopup />
      <Helmet>
        <title>LovelyAnswers – Get Discovered in AI Search | ChatGPT, Gemini & Google</title>
        <meta
          name="description"
          content="Get your brand recommended by ChatGPT, Gemini, Perplexity and Google. AI-powered content, monitoring, and optimization for modern search."
        />
        <link rel="canonical" href="https://lovelyanswers.com/" />
        <meta property="og:title" content="LovelyAnswers – Get Discovered in AI Search" />
        <meta
          property="og:description"
          content="The #1 platform to get your brand recommended by AI search engines."
        />
        <meta property="og:url" content="https://lovelyanswers.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://lovelyanswers.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          children={JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "LovelyAnswers",
            url: "https://lovelyanswers.com",
            logo: "https://lovelyanswers.com/favicon.png",
            description:
              "AI search optimization platform. Get recommended by ChatGPT, Gemini, and Google.",
          })}
        />
        <script
          type="application/ld+json"
          children={JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "LovelyAnswers",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "29", priceCurrency: "USD" },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              reviewCount: "527",
              bestRating: "5",
            },
          })}
        />
        <script
          type="application/ld+json"
          children={JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          })}
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <GoogleOneTap />
        <InactivityPopup inactivityDelay={45} />

        {/* Navigation */}
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[hsl(222,47%,11%)]/90 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <AnimatedLogo size="md" />
              <span className="text-lg font-bold tracking-tight text-white">LovelyAnswers</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/signup">Get Started Free</Link>
              </Button>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/pricing">Pricing</Link>
              </Button>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/blog">Blog</Link>
              </Button>
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                asChild
              >
                <Link to="/auth">Log in</Link>
              </Button>
              <Button className="ml-2 bg-white text-[hsl(222,47%,11%)] hover:bg-white/90" asChild>
                <Link to="/onboarding">Start Free</Link>
              </Button>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
                asChild
              >
                <Link to="/auth">Log in</Link>
              </Button>
              <Button size="sm" className="bg-white text-[hsl(222,47%,11%)] hover:bg-white/90" asChild>
                <Link to="/onboarding">Start Free</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* ═══════ HERO — Dark Navy ═══════ */}
        <section className="relative overflow-hidden bg-[hsl(222,47%,11%)] pt-28 md:pt-36 pb-20 md:pb-32">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[120px]" />

          <div className="container relative px-4">
            <div className="mx-auto max-w-4xl text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/70 mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-white/60" />
                  AI search optimization platform
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]"
              >
                Get discovered in{" "}
                <span className="text-white">AI search</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8"
              >
                Get your brand recommended by ChatGPT, Gemini, Perplexity and Google. Monitor, optimize, and grow your AI search presence.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center mb-8"
              >
                <Button
                  size="lg"
                  className="h-12 px-8 bg-white text-[hsl(222,47%,11%)] hover:bg-white/90 text-base font-semibold gap-2"
                  onClick={() => navigate("/onboarding")}
                >
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 border-white/20 text-white bg-white/5 hover:bg-white/10 text-base"
                  onClick={() => {
                    const el = document.getElementById("features");
                    el?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  See how it works
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="max-w-lg mx-auto mb-10"
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      type="url"
                      placeholder="yourwebsite.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
                    />
                  </div>
                  <Button
                    className="h-11 px-5 bg-white/10 hover:bg-white/20 text-white border border-white/10"
                    onClick={handleGetStarted}
                  >
                    Free Audit
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>

              {/* Dashboard mockup */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="relative mx-auto max-w-3xl"
              >
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-1.5 shadow-2xl">
                  <div className="rounded-lg bg-[hsl(222,47%,14%)] p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400/60" />
                        <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                        <div className="w-3 h-3 rounded-full bg-green-400/60" />
                      </div>
                      <div className="flex-1 h-6 bg-white/5 rounded-md" />
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-xs text-white/40 mb-1">AI Score</div>
                        <div className="text-2xl font-bold text-white">87</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-xs text-white/40 mb-1">Mentions</div>
                        <div className="text-2xl font-bold text-white/80">142</div>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3">
                        <div className="text-xs text-white/40 mb-1">Growth</div>
                        <div className="text-2xl font-bold text-white/70">+67%</div>
                      </div>
                    </div>
                    <div className="h-24 md:h-32 rounded-lg bg-white/5 flex items-end p-3 gap-1">
                      {[30, 45, 35, 55, 50, 65, 60, 75, 70, 85, 80, 90].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t bg-gradient-to-t from-blue-400/40 to-blue-300/10"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[hsl(222,47%,11%)] to-transparent" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════ AI Platform Logos ═══════ */}
        <section className="py-8 md:py-12 border-b border-border">
          <div className="container px-4">
            <p className="text-center text-sm text-muted-foreground mb-6">
              Optimize your presence across all major AI platforms
            </p>
            <div className="flex items-center justify-center gap-8 md:gap-14">
              {aiPlatforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <img
                    src={platform.logo}
                    alt={platform.name}
                    className="h-6 md:h-8 w-auto object-contain"
                  />
                  <span className="hidden md:inline text-sm font-medium text-muted-foreground">
                    {platform.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ Stats ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                AI search is the new <span className="font-extrabold">growth channel</span>
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {heroStats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-4xl md:text-5xl font-extrabold text-foreground">
                    {stat.value}
                    <span className="text-foreground/60">{stat.suffix}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ Features ═══════ */}
        <section id="features" className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Understand how AI talks about <span className="font-extrabold">your brand</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Monitor and optimize your brand's presence across every major AI platform.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {featureCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-foreground/5 flex items-center justify-center text-foreground mb-4">
                    {card.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  <div className="mt-4 rounded-lg bg-muted/50 border border-border p-3 h-32 flex items-end gap-1">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div
                        key={j}
                        className="flex-1 rounded-t bg-gradient-to-t from-foreground/10 to-foreground/3"
                        style={{ height: `${30 + Math.random() * 60}%` }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ Testimonials ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                What people say about <span className="font-extrabold">LovelyAnswers</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Join 500+ businesses already growing with AI search optimization.
              </p>
            </div>
            <div className="flex justify-center gap-2 mb-10">
              {testimonials.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonialPlatform(i)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTestimonialPlatform === i
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t.platform}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials[activeTestimonialPlatform].reviews.map((review, i) => (
                <motion.div
                  key={`${activeTestimonialPlatform}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-border bg-card p-6"
                >
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed mb-4">"{review.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[hsl(222,47%,11%)] flex items-center justify-center text-white text-sm font-bold">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ Showcase ═══════ */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
                Turn AI search into a <span className="font-extrabold">growth channel</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Track, optimize, and grow your presence in AI-powered search results.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
              {showcaseFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl overflow-hidden border border-border bg-card"
                >
                  <div className="h-40 bg-[hsl(222,47%,14%)] p-5 flex items-end">
                    <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3 w-full">
                      <div className="h-2 bg-white/20 rounded w-3/4 mb-1.5" />
                      <div className="h-2 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold tracking-wider text-foreground/50 uppercase">
                      {feature.tag}
                    </span>
                    <h3 className="font-semibold mt-1 mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {bottomFeatures.map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card p-4 text-center"
                >
                  <div className="h-10 w-10 rounded-lg bg-foreground/5 flex items-center justify-center text-foreground mx-auto mb-3">
                    {f.icon}
                  </div>
                  <h4 className="font-medium text-sm mb-1">{f.title}</h4>
                  <p className="text-xs text-muted-foreground">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ FAQ ═══════ */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Frequently Asked Questions</h2>
            </div>
            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="rounded-xl border border-border bg-card px-5 transition-all hover:border-foreground/20"
                  >
                    <AccordionTrigger className="text-left font-medium py-4 hover:no-underline text-sm md:text-base">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ═══════ Dark CTA ═══════ */}
        <section className="relative overflow-hidden bg-[hsl(222,47%,11%)] py-20 md:py-32">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/8 rounded-full blur-[150px]" />
          <div className="container relative px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6">
                  Buyers ask AI which brand to choose.
                </h2>
                <p className="text-white/60 text-lg mb-8">
                  Make sure it's yours. Get discovered in ChatGPT, Gemini, Perplexity and Google today.
                </p>
                <Button
                  size="lg"
                  className="h-12 px-8 bg-white text-[hsl(222,47%,11%)] hover:bg-white/90 text-base font-semibold gap-2"
                  onClick={() => navigate("/onboarding")}
                >
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="h-5 w-5 text-white/50" />
                  <span className="text-white/60 text-sm">AI Assistant</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm max-w-[80%]">
                      What's the best SEO tool for small businesses?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="px-4 py-2 rounded-xl bg-white/5 text-white/80 text-sm max-w-[90%]">
                      Based on recent data, I'd recommend{" "}
                      <span className="text-white font-semibold">your-brand.com</span> — they specialize in AI-optimized content and have strong results for small businesses.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ Final CTA ═══════ */}
        <section className="bg-[hsl(222,47%,11%)] py-12 md:py-16">
          <div className="container px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">Be visible, today.</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Start your free trial and get your brand recommended by AI search engines.
            </p>
            <Button
              size="lg"
              className="h-12 px-8 bg-white text-[hsl(222,47%,11%)] hover:bg-white/90 text-base font-semibold gap-2"
              onClick={() => navigate("/onboarding")}
            >
              Get started — it's free <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>

        <PublicFooter />

        {/* Sticky Mobile CTA */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl">
          <Button
            className="w-full h-11 bg-[hsl(222,47%,11%)] hover:bg-[hsl(222,47%,15%)] text-white font-semibold gap-2"
            onClick={() => navigate("/onboarding")}
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
