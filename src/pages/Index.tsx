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
  ChevronRight,
  ChevronDown,
  Star,
  Quote,
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
    avatar: "SM",
    rating: 5,
    text: "LovelyAnswers has completely transformed our content strategy. We went from 0 AI citations to being recommended by ChatGPT within 3 weeks. Our organic traffic increased by 340%.",
    metric: "+340% organic traffic",
  },
  {
    name: "Marc Dubois",
    role: "Founder & CEO",
    company: "GrowthLab Agency",
    avatar: "MD",
    rating: 5,
    text: "As an agency, we've integrated LovelyAnswers for all our clients. The ROI is incredible - backlinks alone would cost us 10x more elsewhere. Game changer for AEO.",
    metric: "10x ROI on backlinks",
  },
  {
    name: "Emily Chen",
    role: "Head of SEO",
    company: "Nexus Digital",
    avatar: "EC",
    rating: 5,
    text: "We were skeptical about AEO at first, but the results speak for themselves. Our brand is now cited by Gemini and Perplexity. The automated article generation saves us 40 hours/week.",
    metric: "40 hours saved weekly",
  },
  {
    name: "Thomas Bergman",
    role: "E-commerce Manager",
    company: "Nordic Brands Co",
    avatar: "TB",
    rating: 5,
    text: "Integration with Shopify was seamless. Within a month, our product pages started appearing in AI-generated shopping recommendations. Sales from AI referrals are now 15% of total.",
    metric: "15% sales from AI",
  },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 shadow-lg">
              <Heart className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
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
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-full blur-[120px] opacity-30" />
        
        <div className="container relative">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Bot className="mr-1 h-3 w-3" />
              Answer Engine Optimization
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Be cited by{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">ChatGPT, Gemini</span>
              {" "}& AI assistants
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate AI-ready answers that LLMs trust and cite. Turn your website into a trusted source for the next generation of search.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg hover:opacity-90 text-lg px-8" asChild>
                <Link to="/auth">
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
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">AEO (LovelyAnswers)</div>
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
            <h2 className="text-3xl font-bold mb-4">How LovelyAnswers Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A complete platform to make your content AI-citable
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <GlassCard key={feature.title} hover gradient className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-lg">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Logos */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3">Integrates with your favorite platforms</h2>
            <p className="text-muted-foreground">
              Connect LovelyAnswers with your CMS and publish content automatically
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {integrationLogos.map((integration) => (
              <div 
                key={integration.name}
                className="group flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <div className="h-12 w-20 flex items-center justify-center">
                  <img 
                    src={integration.logo} 
                    alt={integration.name} 
                    className={`h-10 w-auto object-contain grayscale group-hover:grayscale-0 transition-all ${integration.invert ? 'dark:invert' : ''}`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{integration.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <Star className="mr-1 h-3 w-3 fill-primary" />
              Customer Stories
            </Badge>
            <h2 className="text-3xl font-bold mb-4">Trusted by Growth-Focused Teams</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              See how businesses are leveraging LovelyAnswers to dominate AI search results
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((testimonial, index) => (
              <GlassCard key={index} hover className="p-6 flex flex-col">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <Quote className="h-8 w-8 text-primary/20 mb-2" />
                
                <p className="text-sm text-muted-foreground flex-1 mb-4">
                  "{testimonial.text}"
                </p>
                
                <div className="mt-auto">
                  <Badge variant="secondary" className="mb-4 text-xs bg-emerald-500/10 text-emerald-600 border-0">
                    {testimonial.metric}
                  </Badge>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white text-sm font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Invest in Long-Term Growth</h2>
            <p className="text-sm text-muted-foreground">For smart entrepreneurs</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Main Plan */}
            <GlassCard gradient className="p-8">
              <Badge className="mb-4 bg-gradient-to-r from-primary to-violet-500 text-white border-0">All-in-One</Badge>
              <div className="mt-2 mb-2">
                <span className="text-2xl text-muted-foreground line-through mr-2">$247</span>
                <span className="text-5xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-primary font-medium text-sm mb-2">Only 34 spots left in January</p>
              <p className="text-xs text-muted-foreground mb-6">
                We limit monthly admissions to maintain backlink quality and network balance.
              </p>
              <Button className="w-full gap-2 bg-gradient-to-r from-primary to-violet-500 text-white shadow-lg hover:opacity-90 mb-6" size="lg" asChild>
                <Link to="/auth">
                  Start 3-Day Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-sm font-medium mb-4">What's included:</p>
              <ul className="space-y-3 text-left">
                {pricingFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Agency Plan */}
            <GlassCard className="p-8 flex flex-col">
              <Badge variant="secondary" className="mb-4 w-fit">For agencies</Badge>
              <h3 className="text-2xl font-bold">Agency Plan</h3>
              <p className="text-muted-foreground mt-4 flex-1">
                For businesses which want to resell our services to their clients.
              </p>
              <div className="mt-8 space-y-3">
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <Link to="/pricing">
                    Learn More
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground" asChild>
                  <a href="#case-study">View Case Study</a>
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about LovelyAnswers and Answer Engine Optimization
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <GlassCard className="p-12 text-center bg-gradient-to-r from-primary to-violet-500 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            <div className="relative">
              <h2 className="text-3xl font-bold mb-4">
                Become an AI-cited source today
              </h2>
              <p className="text-white/80 max-w-xl mx-auto mb-8">
                Join businesses optimizing for the AI-first future. Start generating citable answers in minutes.
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-lg" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </GlassCard>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
