"use client";
import { useEffect, useState } from "react";
import { trackPricingView } from "@/lib/gtag-conversions";
import { trackMetaPricingView } from "@/lib/meta-pixel";
import Link from "next/link";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, Shield, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { ExitIntentPopup } from "@/components/nudges/ExitIntentPopup";
import { PLANS, type BillingCycle, type PlanId, formatUSD } from "@/lib/stripe-products";
import { cn } from "@/lib/utils";

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "AutoPilot GEO — AEO Platform",
  "description": "Get cited by ChatGPT, Gemini and Perplexity. 3-day free trial. Starter $49, Pro $99, Agency $199.",
  "brand": { "@type": "Brand", "name": "AutoPilot GEO" },
  "offers": [
    { "@type": "Offer", "name": "Starter", "price": "49", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Pro",     "price": "99", "priceCurrency": "USD" },
    { "@type": "Offer", "name": "Agency",  "price": "199","priceCurrency": "USD" },
  ],
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "reviewCount": "289", "bestRating": "5" }
};

const faqs = [
  { question: "How does the 3-day free trial work?", answer: "Enter your card to start. You get full access for 3 days. We email you the day before charging. Cancel anytime in 1 click — no charge if you cancel before day 4." },
  { question: "I'm not an SEO expert — can I still use this?", answer: "Yes. AutoPilot GEO is built for founders, not SEO consultants. Type your domain, we handle keyword research, content, and publishing." },
  { question: "Will Google penalize AI content?", answer: "No. Google's official position: quality content is welcome regardless of how it's produced. Our articles are written for humans first, AI second." },
  { question: "Which CMS do you support?", answer: "WordPress, Shopify, Webflow, Wix, BigCommerce, Ghost, and any platform with a REST API." },
  { question: "How fast do I see results?", answer: "AEO visibility (ChatGPT mentions) usually within 30 days. Google ranking improvements typically 60-90 days." },
  { question: "Can I cancel anytime?", answer: "Yes. One click in your billing page. No phone calls, no retention scripts." },
];

export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  useEffect(() => { document.documentElement.classList.remove("dark"); trackPricingView(); trackMetaPricingView(); }, []);

  return (
    <>
      <SocialProofToast />
      <ExitIntentPopup ctaUrl="/checkout?plan=pro&cycle=annual" headline="🎁 3 days free on Pro" description="Cancel anytime before day 4 — no charge. Start ranking in ChatGPT today." ctaLabel="Start free trial" />
      <Helmet>
        <title>Pricing — AutoPilot GEO | $49, $99, $199 plans</title>
        <meta name="description" content="3 simple plans: Starter $49, Pro $99, Agency $199. 3-day free trial, cancel anytime. Get cited by ChatGPT, Gemini and Perplexity." />
        <link rel="canonical" href="https://autopilotgeo.com/pricing" />
        <script type="application/ld+json">{JSON.stringify(pricingStructuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-[hsl(222,47%,11%)]">
        <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-[hsl(222,47%,11%)]/90 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center"><AnimatedLogo size="md" /></Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" asChild><Link href="/">Home</Link></Button>
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" asChild><Link href="/auth">Sign In</Link></Button>
              <Button className="bg-white text-[hsl(222,47%,11%)] hover:bg-white/90" asChild>
                <Link href="/checkout?plan=pro&cycle=annual">Start free <ArrowRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* HERO */}
        <section className="relative overflow-hidden pt-32 pb-12">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-400/8 rounded-full blur-[150px]" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-6 bg-white/10 text-white/70 border-white/20">3-day free trial · Cancel anytime</Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-white">
                Get cited by <span className="text-violet-400">ChatGPT</span> in 30 days
              </h1>
              <p className="mt-6 text-xl text-white/50 max-w-2xl mx-auto">
                Simple pricing. No setup fees. No long-term commitment. Just AI visibility.
              </p>

              {/* Billing toggle */}
              <div className="mt-10 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setCycle("monthly")}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition",
                    cycle === "monthly" ? "bg-white text-[hsl(222,47%,11%)]" : "text-white/60 hover:text-white"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setCycle("annual")}
                  className={cn(
                    "px-5 py-2 rounded-full text-sm font-medium transition flex items-center gap-2",
                    cycle === "annual" ? "bg-white text-[hsl(222,47%,11%)]" : "text-white/60 hover:text-white"
                  )}
                >
                  Annual
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">−20%</span>
                </button>
              </div>
            </div>

            {/* PLAN CARDS */}
            <div className="mt-14 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
              {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((plan) => {
                const price = plan.prices[cycle];
                const isPopular = plan.popular;
                return (
                  <div
                    key={plan.id}
                    className={cn(
                      "relative rounded-2xl border p-7 flex flex-col backdrop-blur-sm transition-all",
                      isPopular
                        ? "border-violet-400/40 bg-gradient-to-b from-violet-500/10 to-white/5 shadow-2xl shadow-violet-500/10 md:scale-[1.03]"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    )}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1 bg-violet-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          <Sparkles className="h-3 w-3" /> Most popular
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                      <p className="mt-2 text-sm text-white/50">{plan.tagline}</p>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold text-white">{formatUSD(price.perMonth)}</span>
                        <span className="text-white/40 text-sm">/mo</span>
                      </div>
                      {cycle === "annual" ? (
                        <p className="mt-1 text-xs text-white/40">Billed {formatUSD(price.amount)} /year</p>
                      ) : (
                        <p className="mt-1 text-xs text-white/40">Billed monthly · Cancel anytime</p>
                      )}
                    </div>

                    <Button
                      className={cn(
                        "mt-6 w-full",
                        isPopular
                          ? "bg-violet-500 hover:bg-violet-400 text-white"
                          : "bg-white text-[hsl(222,47%,11%)] hover:bg-white/90"
                      )}
                      asChild
                    >
                      <Link href={`/checkout?plan=${plan.id}&cycle=${cycle}`}>
                        Start 3 days free <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>

                    <ul className="mt-7 space-y-3 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                          <Check className="h-4 w-4 text-violet-300 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-white/40">
              <Shield className="h-4 w-4" /> No charge during trial · Cancel in 1 click
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-white">
          <div className="container max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-[hsl(222,47%,11%)]">FAQs</h2>
              <p className="text-gray-500">
                Question we missed?{" "}
                <a href="mailto:support@autopilotgeo.com" className="text-violet-600 hover:underline">Email us</a>
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
