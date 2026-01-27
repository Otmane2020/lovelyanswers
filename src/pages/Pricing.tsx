import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  ArrowRight, 
  Check, 
  Sparkles,
  FileText,
  Link as LinkIcon,
  Search,
  Languages,
  Bot,
  Globe,
  Wrench,
  MessageSquare,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";

const features = [
  { icon: FileText, text: "30 SEO/LLM optimized articles automatically generated and published" },
  { icon: Sparkles, text: "Articles with citations, internal links and branded infographics" },
  { icon: LinkIcon, text: "Automatic quality backlinks (valued at $800+ per month) through our exclusive network" },
  { icon: Wrench, text: "Technical SEO audit - find issues blocking Google and ChatGPT" },
  { icon: Search, text: "Articles backed by real-time research and expert insights" },
  { icon: Bot, text: "Automated keyword research and SERP-based clustering" },
  { icon: MessageSquare, text: "Reddit agent that builds your brand visibility and authority" },
  { icon: Globe, text: "Integrates with WordPress, Webflow, Shopify, Wix, API and more" },
  { icon: FileText, text: "JSON-LD schema markup for featured snippets" },
  { icon: Languages, text: "Articles available in 20+ languages" },
];

const faqs = [
  {
    question: "I am not an SEO expert?",
    answer: "Don't worry! LovelyAnswers is designed to support individuals without any SEO knowledge. We take care of everything from keyword research, clustering, content creation to content optimization. You just need to publish the generated content."
  },
  {
    question: "Will Google penalize AI written content?",
    answer: "No, Google penalizes low quality content, regardless of whether it's AI or human written. Their official take confirms that quality AI content is welcome."
  },
  {
    question: "Can AI content even rank on Google?",
    answer: "Yes, absolutely. If executed correctly. We've proven multiple times that quality AI content can rank well on Google. When AI has sufficient context and access to high-quality information, it produces excellent content."
  },
  {
    question: "Which languages are supported?",
    answer: "We support content generation in all major languages including English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, and many others."
  },
  {
    question: "How long does it typically take to see results?",
    answer: "While SEO is a long-term strategy, most clients begin seeing measurable improvements in their search rankings within 3-6 months. True topical authority typically takes 6-12 months of consistent content."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes, you can cancel your subscription at any time. Content stays yours and you can continue to use it as you see fit."
  },
  {
    question: "What is your refund policy?",
    answer: "We offer a 3-day free trial period to ensure our service meets your needs. Due to the costs associated with external APIs and AI services, we cannot offer refunds after the trial period ends."
  },
];

export default function Pricing() {
  // Force dark theme on public pages
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
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
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/">Home</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button className="gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:opacity-90" asChild>
              <Link to="/auth">
                Try 3-day trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Pricing */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full blur-[120px] opacity-30" />
        
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-6 bg-pink-500/10 text-pink-600 border-pink-500/20">
              For smart entrepreneurs
            </Badge>
            
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Invest in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">Long-Term Growth</span>
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
              All-in-one AI SEO solution to dominate search rankings and get cited by AI assistants.
            </p>
          </div>

          {/* Pricing Card */}
          <div className="mt-16 max-w-xl mx-auto">
            <GlassCard gradient className="p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-500 text-white border-0">
                  Only 34 spots left in January
                </Badge>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">All-In-One</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  We limit monthly admissions to maintain backlink quality and network balance.
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl text-muted-foreground line-through">$99</span>
                  <span className="text-6xl font-bold">$29</span>
                  <span className="text-muted-foreground">/week</span>
                </div>
              </div>

              <Button className="w-full gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg hover:opacity-90 mb-8" size="lg" asChild>
                <Link to="/auth">
                  Start 3-Day Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>

              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  What's included:
                </h3>
                <ul className="space-y-3">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                        <Check className="h-3 w-3 text-emerald-500" />
                      </div>
                      <span className="text-sm">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          </div>

          {/* Agency CTA */}
          <div className="mt-12 max-w-xl mx-auto">
            <GlassCard className="p-6 text-center">
              <h3 className="font-bold mb-2">For agencies</h3>
              <p className="text-sm text-muted-foreground mb-4">
                For businesses which want to resell our services to their clients.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/auth">Learn More</Link>
                </Button>
                <Button variant="ghost" className="text-pink-600">
                  View Case Study
                </Button>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">FAQs</h2>
            <p className="text-muted-foreground">
              Haven't found what you are looking for?{" "}
              <a href="mailto:support@lovelyanswers.io" className="text-pink-600 hover:underline">
                Send us an email
              </a>
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4 bg-background">
                <AccordionTrigger className="text-left hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
