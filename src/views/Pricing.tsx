"use client";
import { useEffect } from "react";
import { trackPricingView } from "@/lib/gtag-conversions";
import Link from "next/link";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Sparkles, FileText, Link as LinkIcon, Search, Languages, Bot, Globe, Wrench, MessageSquare } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { ExitIntentPopup } from "@/components/nudges/ExitIntentPopup";

const pricingStructuredData = {
  "@context": "https://schema.org", "@type": "Product", "name": "AutoPilot Geo AEO Platform",
  "description": "All-in-one AI SEO solution with 30 articles/month, automatic backlinks, keyword research, and AI Answer Engine Optimization for ChatGPT, Gemini, and Google.",
  "brand": { "@type": "Brand", "name": "AutoPilot Geo" },
  "offers": { "@type": "Offer", "price": "29", "priceCurrency": "USD", "priceValidUntil": "2027-12-31", "availability": "https://schema.org/InStock", "url": "https://autopilotgeo.com/pricing" },
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "527", "bestRating": "5" }
};

const features = [
  { icon: Bot, text: "AEO: Get cited by ChatGPT, Gemini, Perplexity & AI search engines" },
  { icon: FileText, text: "30 SEO & AEO optimized articles auto-generated and published monthly" },
  { icon: Globe, text: "Local AEO: Dominate AI answers for your city, neighborhood & niche" },
  { icon: Search, text: "AI Shopping Assistant: Optimize your product feed for AI-powered shopping" },
  { icon: Sparkles, text: "Articles with citations, internal links and branded infographics" },
  { icon: LinkIcon, text: "Automatic quality backlinks (valued at $800+/month) through our network" },
  { icon: Wrench, text: "Technical SEO audit - find issues blocking Google and ChatGPT" },
  { icon: Bot, text: "Automated keyword research and SERP-based clustering" },
  { icon: MessageSquare, text: "Reddit agent that builds your brand visibility and authority" },
  { icon: Globe, text: "Integrates with WordPress, Shopify, Wix, BigCommerce & more" },
  { icon: Languages, text: "Content available in 20+ languages" },
];

const faqs = [
  { question: "I am not an SEO expert?", answer: "Don't worry! AutoPilot Geo is designed to support individuals without any SEO knowledge. We take care of everything from keyword research, clustering, content creation to content optimization. You just need to publish the generated content." },
  { question: "Will Google penalize AI written content?", answer: "No, Google penalizes low quality content, regardless of whether it's AI or human written. Their official take confirms that quality AI content is welcome." },
  { question: "Can AI content even rank on Google?", answer: "Yes, absolutely. If executed correctly. We've proven multiple times that quality AI content can rank well on Google." },
  { question: "Which languages are supported?", answer: "We support content generation in all major languages including English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, and many others." },
  { question: "How long does it typically take to see results?", answer: "While SEO is a long-term strategy, most clients begin seeing measurable improvements in their search rankings within 3-6 months." },
  { question: "Can I cancel my subscription?", answer: "Yes, you can cancel your subscription at any time. Content stays yours and you can continue to use it as you see fit." },
  { question: "What is your refund policy?", answer: "We offer a 3-day free trial period to ensure our service meets your needs. Due to the costs associated with external APIs and AI services, we cannot offer refunds after the trial period ends." },
];

export default function Pricing() {
  useEffect(() => { document.documentElement.classList.remove("dark"); trackPricingView(); }, []);

  return (
    <>
      <SocialProofToast />
      <ExitIntentPopup ctaUrl="/onboarding" headline="🎁 Special offer: 2 months free!" description="Join the 500+ sites boosting their AI visibility with AutoPilot Geo. Get 2 months free now." ctaLabel="Start for free" />
      <Helmet>
        <title>Pricing - AutoPilot Geo AEO Platform | $29/month AI SEO</title>
        <meta name="description" content="Get 30 AI-optimized articles, backlinks, keyword research & WordPress auto-publishing for $29/month. 3-day free trial. Cancel anytime." />
        <link rel="canonical" href="https://autopilotgeo.com/pricing" />
        <script type="application/ld+json">{JSON.stringify(pricingStructuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-[hsl(222,47%,11%)]">
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[hsl(222,47%,11%)]/90 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <AnimatedLogo size="md" />
            </Link>
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" asChild><Link href="/">Home</Link></Button>
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" asChild><Link href="/auth">Sign In</Link></Button>
              <Button className="bg-white text-[hsl(222,47%,11%)] hover:bg-white/90" asChild>
                <Link href="/signup">Start Free <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </nav>

        <section className="relative overflow-hidden pt-32 pb-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-400/8 rounded-full blur-[150px]" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-6 bg-white/10 text-white/70 border-white/20">Join 500+ businesses already ranking</Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white">
                Get Recommended by <span className="font-extrabold">ChatGPT & Google</span>
              </h1>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">Stop being invisible to AI. Start appearing in ChatGPT, Gemini & Google answers within 30 days.</p>
            </div>

            <div className="mt-16 max-w-xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/10 text-white/70 border-white/20">Only 34 spots left this month</Badge>
                </div>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2 text-white">AI Visibility Engine</h2>
                  <p className="text-sm text-white/40 mb-4">Everything you need to get cited by AI search engines — on autopilot.</p>
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-2xl text-white/30 line-through">$58</span>
                    <span className="text-6xl font-bold text-white">$29</span>
                    <span className="text-white/40">/month</span>
                  </div>
                  <p className="text-sm text-white/50 font-medium mt-2">Or $23/month billed annually</p>
                </div>
                <Button className="w-full gap-2 bg-white text-[hsl(222,47%,11%)] hover:bg-white/90 mb-8" size="lg" asChild>
                  <Link href="/signup">Start Ranking in ChatGPT <ArrowRight className="h-5 w-5" /></Link>
                </Button>
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-white/40 uppercase tracking-wider">What's included:</h3>
                  <ul className="space-y-3">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                          <Check className="h-3 w-3 text-white/70" />
                        </div>
                        <span className="text-sm text-white/70">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-12 max-w-xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <h3 className="font-bold mb-2 text-white">For agencies</h3>
                <p className="text-sm text-white/40 mb-4">For businesses which want to resell our services to their clients.</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild><Link href="/signup">Learn More</Link></Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-[hsl(222,47%,11%)]">FAQs</h2>
              <p className="text-gray-500">
                Haven't found what you are looking for?{" "}
                <a href="mailto:support@autopilotgeo.com" className="text-[hsl(222,47%,30%)] hover:underline">Send us an email</a>
              </p>
            </div>
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border rounded-lg px-4 bg-gray-50">
                  <AccordionTrigger className="text-left hover:no-underline text-[hsl(222,47%,11%)]">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-gray-500">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        <PublicFooter />
      </div>
    </>
  );
}
