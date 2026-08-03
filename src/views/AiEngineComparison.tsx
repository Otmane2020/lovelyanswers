"use client";
import Link from "next/link";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  ArrowRight,
  Bot,
  Sparkles,
  Search,
  Quote,
  CheckCircle2,
  Layers,
} from "lucide-react";

const engines = [
  {
    icon: <Bot className="h-6 w-6" />,
    name: "ChatGPT (OpenAI)",
    citation:
      "Cites a short list of sources inline when browsing is active, and otherwise answers from model memory with no links at all.",
    favors:
      "Authoritative, long-form pages with clear definitions, structured headings, and consistent brand naming across the web.",
    play:
      "Publish definitive explainer pages and keep your brand described identically on your site, Wikipedia-style directories, and review platforms.",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    name: "Gemini (Google)",
    citation:
      "Blends AI Overviews with classic Google ranking signals and Knowledge Graph entities, linking out to a handful of supporting pages.",
    favors:
      "Pages that already rank well in Google, strong structured data (Organization, Product, FAQPage) and a verified Google Business Profile.",
    play:
      "Keep technical SEO healthy, ship JSON-LD on every commercial page, and maintain your Google Business Profile so the entity is unambiguous.",
  },
  {
    icon: <Search className="h-6 w-6" />,
    name: "Perplexity",
    citation:
      "Cites aggressively — numbered footnotes on nearly every sentence, pulled from freshly crawled web results.",
    favors:
      "Recent, fact-dense content with statistics, dates, and quotable sentences that can be lifted verbatim into an answer.",
    play:
      "Refresh cornerstone pages often, add dated data points, and write self-contained paragraphs that make sense out of context.",
  },
];

const comparison = [
  {
    dimension: "Citation style",
    chatgpt: "Sparse, only when browsing",
    gemini: "Linked AI Overview cards",
    perplexity: "Dense numbered footnotes",
  },
  {
    dimension: "Content freshness weight",
    chatgpt: "Low to medium",
    gemini: "Medium",
    perplexity: "Very high",
  },
  {
    dimension: "Ranking dependency",
    chatgpt: "Weak — training data matters more",
    gemini: "Strong — mirrors Google results",
    perplexity: "Medium — live retrieval",
  },
  {
    dimension: "Structured data impact",
    chatgpt: "Indirect",
    gemini: "High",
    perplexity: "Medium",
  },
  {
    dimension: "Fastest way to appear",
    chatgpt: "Third-party mentions and reviews",
    gemini: "Traditional SEO plus schema",
    perplexity: "Frequently updated data pages",
  },
];

const faqs = [
  {
    q: "Which AI engine should I optimize for first?",
    a: "Start with Perplexity if you need results quickly — it crawls the live web and rewards fresh, fact-dense pages within days. Gemini follows naturally from solid traditional SEO, while ChatGPT visibility builds slowest because it leans on training data and third-party mentions.",
  },
  {
    q: "Is GEO for ChatGPT different from SEO for Google?",
    a: "Yes. Google ranks pages; ChatGPT summarizes consensus. That means off-site consistency — how review sites, directories, and communities describe you — matters as much as your own pages.",
  },
  {
    q: "Do the same pages get cited across all three engines?",
    a: "Rarely. Perplexity favors recent data pages, Gemini favors pages already ranking in Google, and ChatGPT favors widely referenced definitional content. A complete GEO program produces all three content types.",
  },
  {
    q: "How do I track citations across ChatGPT, Gemini, and Perplexity?",
    a: "Run the same set of buyer questions against each engine on a schedule and record whether your brand is mentioned, how it is described, and which URL is cited. AutoPilot Geo automates this monitoring and reports citation share per engine.",
  },
];

export default function AiEngineComparison() {
  const url =
    "https://autopilotgeo.com/blog/chatgpt-vs-gemini-vs-perplexity-geo-comparison";

  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline:
      "ChatGPT vs Gemini vs Perplexity: How Each AI Engine Cites Brands",
    description:
      "A side-by-side comparison of how ChatGPT, Gemini, and Perplexity retrieve, cite, and recommend brands — and how to prioritize your GEO effort for each engine.",
    author: { "@type": "Organization", name: "AutoPilot Geo" },
    publisher: {
      "@type": "Organization",
      name: "AutoPilot Geo",
      logo: {
        "@type": "ImageObject",
        url: "https://autopilotgeo.com/autopilotgeo-logo-light.svg",
      },
    },
    datePublished: "2026-08-03",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <Helmet>
        <title>ChatGPT vs Gemini vs Perplexity: GEO Comparison | AutoPilot Geo</title>
        <meta
          name="description"
          content="Compare how ChatGPT, Gemini, and Perplexity cite brands in AI search, and learn which GEO tactics move the needle on each engine."
        />
        <link rel="canonical" href={url} />
        <meta
          property="og:title"
          content="ChatGPT vs Gemini vs Perplexity: GEO Comparison"
        />
        <meta
          property="og:description"
          content="How each AI engine retrieves and cites brands — and how to prioritize your generative engine optimization work."
        />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify(articleStructuredData)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqStructuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center">
              <AnimatedLogo size="sm" />
            </Link>
            <nav className="flex items-center gap-4">
              <Link href="/blog">
                <Button variant="ghost" size="sm">
                  Blog
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="ghost" size="sm">
                  Pricing
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden bg-[hsl(222,47%,11%)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-violet-500/10 to-emerald-500/10 rounded-full blur-[120px]" />
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge
                variant="secondary"
                className="mb-6 bg-white/10 text-white/70 border-white/20"
              >
                <Layers className="h-3 w-3 mr-1" />
                AI Search Comparison
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight text-white">
                ChatGPT vs Gemini vs{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-emerald-400">
                  Perplexity
                </span>
              </h1>
              <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
                Three AI engines, three completely different ways of citing
                brands. Here is how each one decides who gets recommended — and
                where to spend your GEO effort first.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-violet-500 to-emerald-500 text-white"
                  >
                    Track Your AI Citations
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#comparison">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-white border-white/20 hover:bg-white/10"
                  >
                    See the Comparison
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Intro */}
        <section className="py-16 md:py-24 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Buyers no longer start with ten blue links. They ask an
                assistant, read one synthesized answer, and click at most one or
                two of the cited sources. Which sources get cited depends
                entirely on which engine answered — and the three dominant
                engines behave nothing alike.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                This guide breaks down how <strong>ChatGPT</strong>,{" "}
                <strong>Gemini</strong>, and <strong>Perplexity</strong>{" "}
                retrieve information, how visible their citations are, and what
                actually changes your odds of being named in an answer.
              </p>
              <div className="bg-violet-50 border-l-4 border-violet-500 p-4 rounded-r-lg my-8">
                <p className="text-sm text-violet-900 m-0">
                  <strong>Key insight:</strong> Optimizing for one engine does
                  not automatically win the others. Perplexity rewards freshness,
                  Gemini rewards classic SEO plus structured data, and ChatGPT
                  rewards how the rest of the web talks about you.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Engine breakdown */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How each engine picks its sources
              </h2>
              <p className="text-lg text-muted-foreground">
                Same question, three different retrieval philosophies.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {engines.map((e) => (
                <div
                  key={e.name}
                  className="rounded-2xl border border-border bg-background p-6"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    {e.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{e.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong className="text-foreground">Citations: </strong>
                    {e.citation}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    <strong className="text-foreground">Favors: </strong>
                    {e.favors}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Your play: </strong>
                    {e.play}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section id="comparison" className="py-20 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Side-by-side comparison
              </h2>
              <p className="text-lg text-muted-foreground">
                Where the three engines diverge most.
              </p>
            </div>
            <div className="max-w-5xl mx-auto overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-semibold">Dimension</th>
                    <th className="py-3 pr-4 font-semibold">ChatGPT</th>
                    <th className="py-3 pr-4 font-semibold">Gemini</th>
                    <th className="py-3 font-semibold">Perplexity</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.dimension} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">{row.dimension}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.chatgpt}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {row.gemini}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {row.perplexity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Priorities */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                How to prioritize your GEO effort
              </h2>
              <ul className="space-y-4">
                {[
                  "Week 1–2: publish or refresh one fact-dense, dated resource page per core topic — this is the fastest route into Perplexity citations.",
                  "Week 3–4: add Organization, Product, and FAQPage structured data to every commercial page so Gemini can resolve your entity confidently.",
                  "Month 2: build third-party consistency — reviews, directories, and community mentions describing your product the same way, which is what ChatGPT synthesizes.",
                  "Ongoing: re-run the same buyer questions on all three engines monthly and track citation share per engine, not just overall.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 bg-white">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Frequently asked questions
              </h2>
              <div className="space-y-6">
                {faqs.map((f) => (
                  <div
                    key={f.q}
                    className="rounded-xl border border-border p-6 bg-background"
                  >
                    <h3 className="font-semibold mb-2 flex gap-2">
                      <Quote className="h-4 w-4 text-primary shrink-0 mt-1" />
                      {f.q}
                    </h3>
                    <p className="text-muted-foreground text-sm">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-[hsl(222,47%,11%)]">
          <div className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              See where you are cited today
            </h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              AutoPilot Geo queries ChatGPT, Gemini, and Perplexity on your
              buyer questions and reports your citation share per engine.
            </p>
            <Link href="/auth">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-violet-500 to-emerald-500 text-white"
              >
                Start free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
