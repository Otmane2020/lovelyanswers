import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
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
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

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

const aiPlatforms = [
  { name: "ChatGPT", logo: chatgptLogo },
  { name: "Gemini", logo: geminiLogo },
  { name: "Claude", logo: claudeLogo },
  { name: "Perplexity", logo: perplexityLogo },
];

const comparisons = [
  { feature: "Focus", seo: "Search rankings", aeo: "AI citations" },
  { feature: "Content", seo: "Keywords & backlinks", aeo: "Answers & structure" },
  { feature: "Goal", seo: "Google traffic", aeo: "LLM recommendations" },
  { feature: "Format", seo: "Long-form pages", aeo: "Citable answers" },
];

const pricingFeatures = [
  "30 SEO/LLM optimized articles automatically generated and published",
  "Articles with citations, internal links and branded infographics",
  "Automatic quality backlinks (valued at $800+ per month) through our exclusive network of 1,000+ vetted partner sites",
  "We find technical issues on your website that block Google and ChatGPT from properly reading and ranking your site",
  "Articles backed by real-time research and expert insights",
  "Automated keyword research and SERP-based clustering",
  "Reddit agent that builds your brand visibility and authority",
  "Integrates with WordPress, Webflow, Shopify, Wix, API and many other platforms",
  "JSON-LD schema markup for featured snippets",
  "Articles available in 20+ languages (purchase option available)",
];

const faqs = [
  {
    question: "What is Answer Engine Optimization (AEO)?",
    answer: "AEO is a new approach to content optimization that focuses on making your content citable by AI assistants like ChatGPT, Gemini, Claude, and Perplexity. Unlike traditional SEO which targets search engine rankings, AEO ensures AI models understand and recommend your content to users.",
  },
  {
    question: "How does LovelyAnswers generate content?",
    answer: "LovelyAnswers uses advanced AI to analyze your business, industry, and target audience. It then generates SEO/LLM optimized articles backed by real-time research, complete with citations, internal links, and branded infographics - all automatically published to your site.",
  },
  {
    question: "What platforms does LovelyAnswers integrate with?",
    answer: "LovelyAnswers integrates with WordPress, Webflow, Shopify, Wix, and offers an API for custom integrations. Setup takes just a few minutes and content is automatically published to your platform.",
  },
  {
    question: "How do the backlinks work?",
    answer: "Through our exclusive network, we provide automatic quality backlinks valued at $800+ per month. We limit monthly admissions to maintain backlink quality and network balance, ensuring maximum value for all members.",
  },
  {
    question: "Can I try LovelyAnswers before committing?",
    answer: "Yes! We offer a 3-day free trial so you can experience the full power of LovelyAnswers. No credit card required to start. Cancel anytime if it's not the right fit.",
  },
  {
    question: "What languages are supported?",
    answer: "LovelyAnswers generates articles in 20+ languages, allowing you to reach global audiences and optimize for AI assistants in multiple regions.",
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

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Marketing Director",
    company: "TechFlow Solutions",
    companyLogo: companyTechflow,
    avatar: "SM",
    rating: 5,
    text: "LovelyAnswers has completely transformed our content strategy. We went from 0 AI citations to being recommended by ChatGPT within 3 weeks. Our organic traffic increased by 340%.",
    metric: "+340% organic traffic",
  },
  {
    name: "Marc Dubois",
    role: "Founder & CEO",
    company: "GrowthLab Agency",
    companyLogo: companyGrowthlab,
    avatar: "MD",
    rating: 5,
    text: "As an agency, we've integrated LovelyAnswers for all our clients. The ROI is incredible - backlinks alone would cost us 10x more elsewhere. Game changer for AEO.",
    metric: "10x ROI on backlinks",
  },
  {
    name: "Emily Chen",
    role: "Head of SEO",
    company: "Nexus Digital",
    companyLogo: companyNexus,
    avatar: "EC",
    rating: 5,
    text: "We were skeptical about AEO at first, but the results speak for themselves. Our brand is now cited by Gemini and Perplexity. The automated article generation saves us 40 hours/week.",
    metric: "40 hours saved weekly",
  },
  {
    name: "Thomas Bergman",
    role: "E-commerce Manager",
    company: "Nordic Brands Co",
    companyLogo: companyNordic,
    avatar: "TB",
    rating: 5,
    text: "Integration with Shopify was seamless. Within a month, our product pages started appearing in AI-generated shopping recommendations. Sales from AI referrals are now 15% of total.",
    metric: "15% sales from AI",
  },
];

// Sample traffic data for the showcase
const trafficData = [
  { month: "Jan", impressions: 2400, clicks: 180 },
  { month: "Feb", impressions: 3600, clicks: 290 },
  { month: "Mar", impressions: 5800, clicks: 480 },
  { month: "Apr", impressions: 8200, clicks: 720 },
  { month: "May", impressions: 12400, clicks: 1100 },
  { month: "Jun", impressions: 18600, clicks: 1680 },
];

export default function Index() {
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
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg hover:opacity-90" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {/* Mobile navigation */}
          <div className="flex md:hidden items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero with gradient background */}
      <section className="relative overflow-hidden pt-32 pb-20">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5" />
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-primary/30 to-violet-500/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-fuchsia-500/20 to-primary/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-full blur-[150px]" />
        </div>
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 bg-gradient-to-r from-primary/20 to-violet-500/20 text-primary border-primary/30 backdrop-blur-sm">
              <Bot className="mr-1 h-3 w-3" />
              Answer Engine Optimization
            </Badge>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight px-2">
              Be cited by{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 animate-gradient">
                ChatGPT, Gemini
              </span>
              {" "}& AI assistants
            </h1>
            
            <p className="mt-4 md:mt-6 text-base md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              Generate AI-ready answers that LLMs trust and cite. Turn your website into a trusted source for the next generation of search.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
              <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-base md:text-lg px-6 md:px-8" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 border-2 hover:bg-primary/5">
                Watch Demo
              </Button>
            </div>

            {/* AI Platform logos */}
            <div className="mt-12 md:mt-16">
              <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">Optimized for leading AI platforms</p>
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 lg:gap-12 px-4">
                {aiPlatforms.map((platform) => (
                  <div key={platform.name} className="group flex flex-col items-center gap-1 md:gap-2">
                    <div className="h-12 w-12 md:h-16 md:w-16 flex items-center justify-center rounded-xl md:rounded-2xl bg-gradient-to-br from-muted/50 to-muted p-2 md:p-3 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all">
                      <img 
                        src={platform.logo} 
                        alt={platform.name} 
                        className="h-8 w-8 md:h-10 md:w-10 object-contain"
                      />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{platform.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Search Console Traffic Showcase */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <Search className="mr-1 h-3 w-3" />
              Real Results
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4 px-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">Google Search Console</span> Potential
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              See how AEO-optimized content drives exponential growth in impressions and clicks
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-4 md:p-8 bg-gradient-to-br from-background to-muted/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm md:text-base">Traffic Growth</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">Last 6 months</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-emerald-500/10">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-emerald-500" />
                  <span className="text-xs md:text-sm font-semibold text-emerald-600">+675% impressions</span>
                </div>
              </div>

              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(271, 91%, 65%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="impressions"
                      stroke="hsl(160, 84%, 39%)"
                      strokeWidth={3}
                      fill="url(#colorImpressions)"
                      name="Impressions"
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke="hsl(271, 91%, 65%)"
                      strokeWidth={3}
                      fill="url(#colorClicks)"
                      name="Clicks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-center gap-4 md:gap-8 mt-4 md:mt-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs md:text-sm text-muted-foreground">Impressions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-violet-500" />
                  <span className="text-xs md:text-sm text-muted-foreground">Clicks</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* SEO vs AEO with gradient */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-violet-500/5 to-fuchsia-500/5" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 px-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">SEO</span> vs <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">AEO</span>
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              Answer Engine Optimization is the future. While SEO focuses on search rankings, AEO ensures AI assistants cite your content.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <GlassCard className="overflow-hidden bg-gradient-to-br from-background to-muted/30">
              <div className="grid grid-cols-3 text-center font-semibold border-b border-border p-3 md:p-4 bg-muted/30">
                <div></div>
                <div className="text-xs md:text-sm text-muted-foreground">Traditional SEO</div>
                <div className="text-xs md:text-sm text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">AEO</div>
              </div>
              {comparisons.map((row, i) => (
                <div key={row.feature} className={`grid grid-cols-3 text-center p-3 md:p-4 ${i !== comparisons.length - 1 ? "border-b border-border" : ""} hover:bg-muted/20 transition-colors`}>
                  <div className="text-xs md:text-sm font-medium">{row.feature}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{row.seo}</div>
                  <div className="text-xs md:text-sm text-transparent bg-clip-text bg-gradient-to-r from-primary to-fuchsia-500 font-semibold">{row.aeo}</div>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Features with gradient cards */}
      <section className="py-12 md:py-20 relative">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How LovelyAnswers Works</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              A complete platform to make your content AI-citable
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <GlassCard key={feature.title} hover gradient className="p-4 md:p-6 group">
                <div className={`mb-3 md:mb-4 flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-xl md:rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${
                  index === 0 ? 'bg-gradient-to-br from-primary to-violet-500' :
                  index === 1 ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500' :
                  index === 2 ? 'bg-gradient-to-br from-fuchsia-500 to-pink-500' :
                  'bg-gradient-to-br from-cyan-500 to-primary'
                }`}>
                  <feature.icon className="h-5 w-5 md:h-7 md:w-7 text-white" />
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Logos with gradient background */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-muted/50 via-primary/5 to-muted/50" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2 md:mb-3">Integrates with your favorite platforms</h2>
            <p className="text-sm md:text-base text-muted-foreground px-4">
              Connect LovelyAnswers with your CMS and publish content automatically
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 lg:gap-12">
            {integrationLogos.map((integration) => (
              <div 
                key={integration.name}
                className="group flex flex-col items-center gap-1 md:gap-2 opacity-70 hover:opacity-100 transition-all hover:scale-110"
              >
                <div className="h-10 w-16 md:h-14 md:w-24 flex items-center justify-center rounded-lg md:rounded-xl bg-background/80 backdrop-blur-sm shadow-lg p-2 md:p-3">
                  <img 
                    src={integration.logo} 
                    alt={integration.name} 
                    className={`h-5 md:h-8 w-auto object-contain grayscale group-hover:grayscale-0 transition-all ${integration.invert ? 'dark:invert' : ''}`}
                  />
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground font-medium">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials with company logos */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-violet-500/5 to-background" />
        <div className="container relative px-4">
          <div className="text-center mb-8 md:mb-12">
            <Badge className="mb-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 border-amber-500/30">
              <Star className="mr-1 h-3 w-3 fill-amber-500" />
              Customer Stories
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Trusted by Growth-Focused Teams</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              See how businesses are leveraging LovelyAnswers to dominate AI search results
            </p>
          </div>

          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((testimonial, index) => (
              <GlassCard key={index} hover className="p-4 md:p-6 flex flex-col bg-gradient-to-br from-background to-muted/30 group">
                {/* Company Logo */}
                <div className="h-10 md:h-12 mb-3 md:mb-4 flex items-center">
                  <img 
                    src={testimonial.companyLogo} 
                    alt={testimonial.company}
                    className="h-8 md:h-10 w-auto object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                
                <div className="flex items-center gap-1 mb-2 md:mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                
                <Quote className="h-5 w-5 md:h-6 md:w-6 text-primary/30 mb-2" />
                
                <p className="text-xs md:text-sm text-muted-foreground flex-1 mb-3 md:mb-4 leading-relaxed line-clamp-4 md:line-clamp-none">
                  "{testimonial.text}"
                </p>
                
                <div className="mt-auto">
                  <Badge variant="secondary" className="mb-3 md:mb-4 text-[10px] md:text-xs bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-500/20">
                    {testimonial.metric}
                  </Badge>
                  
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-primary via-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs md:text-sm font-semibold shadow-lg">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-xs md:text-sm">{testimonial.name}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing with gradient */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-fuchsia-500/5 to-violet-500/5" />
        <div className="container relative px-4">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Invest in Long-Term Growth</h2>
            <p className="text-xs md:text-sm text-muted-foreground">For smart entrepreneurs</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            {/* Main Plan */}
            <GlassCard gradient className="p-4 md:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-full blur-3xl" />
              <Badge className="mb-3 md:mb-4 bg-gradient-to-r from-primary to-violet-500 text-white border-0 shadow-lg">All-in-One</Badge>
              <div className="mt-2 mb-2 relative">
                <span className="text-lg md:text-2xl text-muted-foreground line-through mr-2">$247</span>
                <span className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">$99</span>
                <span className="text-sm md:text-base text-muted-foreground">/month</span>
              </div>
              <p className="text-primary font-medium text-xs md:text-sm mb-2">Only 34 spots left in January</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-4 md:mb-6">
                We limit monthly admissions to maintain backlink quality and network balance.
              </p>
              <Button className="w-full gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all mb-4 md:mb-6 text-sm md:text-base" size="lg" asChild>
                <Link to="/auth">
                  Start 3-Day Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs md:text-sm font-medium mb-3 md:mb-4">What's included:</p>
              <ul className="space-y-2 md:space-y-3 text-left relative">
                {pricingFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs md:text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Agency Plan */}
            <GlassCard className="p-4 md:p-8 flex flex-col bg-gradient-to-br from-background to-muted/30">
              <Badge variant="secondary" className="mb-3 md:mb-4 w-fit text-xs">For agencies</Badge>
              <h3 className="text-xl md:text-2xl font-bold">Agency Plan</h3>
              <p className="text-sm md:text-base text-muted-foreground mt-3 md:mt-4 flex-1">
                For businesses which want to resell our services to their clients.
              </p>
              <div className="mt-6 md:mt-8 space-y-3">
                <Button variant="outline" className="w-full border-2 hover:bg-primary/5 text-sm md:text-base" size="lg" asChild>
                  <Link to="/pricing">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground text-sm" asChild>
                  <a href="#case-study">View Case Study</a>
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-20 pb-32 md:pb-20">
        <div className="container px-4">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">
              Everything you need to know about LovelyAnswers and Answer Engine Optimization
            </p>
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
        </div>
      </section>

      {/* CTA with enhanced gradient */}
      <section className="py-12 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-muted/30 to-muted/30" />
        <div className="container relative px-4">
          <GlassCard className="p-6 md:p-12 text-center overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            <div className="relative text-white">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4 px-2">
                Become an AI-cited source today
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-6 md:mb-8 text-sm md:text-lg px-4">
                Join businesses optimizing for the AI-first future. Start generating citable answers in minutes.
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl hover:scale-105 transition-all text-sm md:text-base" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>

      <PublicFooter />

      {/* Mobile Sticky CTA Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background via-background to-transparent md:hidden">
        <Button 
          size="lg" 
          className="w-full gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-2xl hover:opacity-90 text-base font-semibold py-6" 
          asChild
        >
          <Link to="/auth">
            <Bot className="h-5 w-5" />
            Start ChatGPT Rank
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      
      {/* Bottom padding for mobile to account for sticky button */}
      <div className="h-24 md:hidden" />
    </div>
  );
}
