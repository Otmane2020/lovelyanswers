"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleOneTap } from "@/components/GoogleOneTap";
import { InactivityPopup } from "@/components/InactivityPopup";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { ExitIntentPopup } from "@/components/nudges/ExitIntentPopup";

/* ── Data ─────────────────────────────────────────────── */
const tickerItems = [
  "ChatGPT Visibility",
  "Google AEO",
  "Gemini Ranking",
  "Perplexity Mentions",
  "Auto-Publishing",
  "GEO Engine",
  "500+ Businesses",
  "$29/month All-In",
];

const steps = [
  {
    num: "01",
    title: "Connect your business",
    desc: "Enter your URL. AutoPilotGeo analyses your sector, competitors, and the questions AI asks about your market.",
    tag: "Setup <5 min",
  },
  {
    num: "02",
    title: "The engine generates content",
    desc: "SEO articles, AEO answers, GEO content — everything is created and optimised automatically so AI cites you first.",
    tag: "100% automatic",
  },
  {
    num: "03",
    title: "Publish in one click",
    desc: "Direct CMS connection. Content publishes on autopilot. Watch your AI visibility score climb.",
    tag: "Auto-publish",
  },
];

const features = [
  {
    icon: "⚡",
    name: "GEO Engine",
    desc: "Real-time optimisation of your presence in generative AI engine answers. Track ChatGPT, Gemini, Perplexity.",
    badge: "Hot",
    hot: true,
  },
  {
    icon: "💬",
    name: "AEO Answers",
    desc: "Generate expert answers to the questions your customers ask AI. Format optimised to be cited directly.",
    badge: "AEO",
  },
  {
    icon: "📝",
    name: "Auto SEO",
    desc: "30 articles/month generated & published automatically. E-E-A-T compliant. Optimised for Google and AI simultaneously.",
    badge: "SEO",
  },
  {
    icon: "📍",
    name: "Local AEO",
    desc: "Dominate local AI answers. Perfect for shops, practices, restaurants — any geo-located activity.",
    badge: "New",
    isNew: true,
  },
  {
    icon: "🛒",
    name: "AEO Shopping",
    desc: "Your products recommended by ChatGPT & Gemini when someone asks 'what's the best product for…'",
    badge: "New",
    isNew: true,
  },
  {
    icon: "📊",
    name: "Analytics & Planning",
    desc: "Real-time dashboard. 30-day auto-generated plan. AI mention history. Competitor tracking.",
    badge: "Live",
  },
];

const testimonials = [
  {
    quote:
      "In 3 weeks, ChatGPT was recommending our firm on 4 of the 5 key legal questions in our sector. Completely insane.",
    initials: "ML",
    name: "Marc L.",
    role: "Partner, law firm",
    platform: "ChatGPT",
  },
  {
    quote:
      "Our organic traffic increased 73% in 2 months. And now Gemini cites our health blog in its answers. Incredible ROI.",
    initials: "SA",
    name: "Sophie A.",
    role: "CEO, health e-commerce",
    platform: "Gemini",
  },
  {
    quote:
      "I was using 4 different tools for SEO. AutoPilotGeo replaces all of them at $29/mo and does even better. Setup in 8 minutes.",
    initials: "TK",
    name: "Thomas K.",
    role: "SaaS B2B Founder",
    platform: "Perplexity",
  },
];

const planIncludes = [
  "30 SEO articles generated & published / month",
  "30 AEO answers optimised for AI / month",
  "GEO Engine — ChatGPT, Gemini, Perplexity tracking",
  "Auto-Publishing WordPress, Shopify, Wix…",
  "Real-time Analytics Dashboard",
  "30-day auto-generated plan",
  "Local AEO + AEO Shopping included",
  "Priority support",
];

const proofStats = [
  { big: "105", desc: "AI answers generated\nscore avg 87/100" },
  { big: "107", desc: "Articles ready to publish\nE-E-A-T optimised" },
  { big: "+15K", desc: "Monthly impressions\nprojected +1 month" },
  { big: "<1wk", desc: "CMS integration\nWordPress · Shopify · Wix" },
];

const faqs = [
  {
    q: "How does AI search optimization work?",
    a: "We create expert content that AI platforms like ChatGPT, Gemini, and Perplexity use as sources when answering user questions. This gets your brand recommended directly by AI.",
  },
  { q: "Can I really cancel anytime?", a: "Yes, 1-click cancellation. No questions asked, no hidden fees." },
  { q: "Do I need technical skills?", a: "No, we handle everything. Just enter your website URL and we do the rest." },
  {
    q: "Will this work for my industry?",
    a: "Yes, proven in 50+ industries including healthcare, legal, e-commerce, SaaS, and local services.",
  },
  {
    q: "Is the content actually good?",
    a: "Every article: 1,500+ words, expert-level, with sources. Google cares about quality, not who wrote it.",
  },
];

/* ── Component ────────────────────────────────────────── */
export default function Index() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [user, authLoading, router]);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // ── Light theme palette ──────────────────────────────
  const ink = "#f7f6fe"; // page background — very light lavender-white
  const paper = "#0d0c1f"; // primary text — near-black
  const signal = "#3b82f6"; // blue accent (unchanged)
  const signal2 = "#f97316"; // orange accent (unchanged)
  const dim = "#6b6a82"; // muted text
  const border = "rgba(13,12,31,0.09)"; // subtle dark border
  const card = "rgba(13,12,31,0.04)"; // card surface

  return (
    <>
      <SocialProofToast />
      <ExitIntentPopup />
      <Helmet>
        <title>AutoPilot Geo – Get Your Business Recommended by ChatGPT & Google</title>
        <meta
          name="description"
          content="Get your business recommended by ChatGPT, Gemini, Perplexity & Google. AI-powered AEO, GEO & SEO automation. Start free."
        />
        <link rel="canonical" href="https://autopilotgeo.com/" />
        <meta property="og:title" content="AutoPilot Geo – Get Recommended by ChatGPT & Google" />
        <meta
          property="og:description"
          content="Automatically publish expert content that makes AI search engines recommend you — not your competitors."
        />
        <meta property="og:url" content="https://autopilotgeo.com/" />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          children={JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "AutoPilot Geo",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "29", priceCurrency: "USD" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "527", bestRating: "5" },
          })}
        />
        <script
          type="application/ld+json"
          children={JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        />
      </Helmet>

      <div
        className="min-h-screen"
        style={{ background: ink, color: paper, fontFamily: "'DM Mono', monospace", fontWeight: 300 }}
      >
        <GoogleOneTap />
        <InactivityPopup inactivityDelay={45} />

        {/* Grid texture */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Scanline */}
        <div
          className="fixed top-0 left-0 right-0 h-[2px] pointer-events-none z-[1]"
          style={{
            background: `linear-gradient(transparent, rgba(59,130,246,0.12), transparent)`,
            animation: "scanline 8s linear infinite",
          }}
        />

        {/* ── HEADER ─────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
          style={{
            background: "rgba(247,246,254,0.88)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${border}`,
          }}
        >
          <Link href="/" className="flex items-center">
            <AnimatedLogo size="sm" theme="light" />
          </Link>
          <div
            className="hidden md:flex items-center gap-2"
            style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: signal }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: signal, animation: "pulse-signal 2s infinite" }}
            />
            AI Visibility Engine — Live
          </div>
          <Link
            href="/onboarding"
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider no-underline transition-transform hover:-translate-y-0.5"
            style={{
              background: signal,
              color: "#fff",
              fontFamily: "'Syne', sans-serif",
              letterSpacing: "0.08em",
            }}
          >
            Start Free Audit →
          </Link>
        </header>

        {/* ── TICKER ──────────────────────── */}
        <div className="relative z-[2] mt-[68px] py-3 overflow-hidden" style={{ background: signal }}>
          <div className="flex whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={i}
                className="px-8 text-xs font-bold uppercase"
                style={{ fontFamily: "'Syne', sans-serif", letterSpacing: "0.15em", color: "#fff" }}
              >
                {item} <span className="px-2 opacity-40">◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── HERO ────────────────────────── */}
        <section className="relative z-[2] min-h-screen grid grid-cols-1 lg:grid-cols-2 gap-0 px-6 md:px-12 items-center">
          {/* Left */}
          <div className="py-20 lg:py-20 lg:pr-12 lg:border-r" style={{ borderColor: border }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-7 text-xs uppercase tracking-[0.2em]"
              style={{ color: signal }}
            >
              <span className="w-8 h-px" style={{ background: signal }} />
              Generative Engine Optimization
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-8 leading-[1.05]"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "clamp(2.4rem, 5vw, 4.2rem)",
                letterSpacing: "-0.03em",
                color: paper,
              }}
            >
              When AI answers,
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 300, color: signal }}>your brand speaks.</em>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-12 max-w-md leading-[1.8]"
              style={{ fontSize: "0.9rem", color: dim }}
            >
              AutoPilotGeo automatically publishes expert content that gets
              <strong style={{ color: paper, fontWeight: 500 }}> your business </strong>
              recommended by ChatGPT, Gemini & Perplexity —
              <strong style={{ color: paper, fontWeight: 500 }}> not your competitors.</strong>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-4 mb-9"
            >
              <Link
                href="/onboarding"
                className="inline-block px-9 py-4 text-sm font-bold uppercase tracking-wider no-underline transition-all hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(59,130,246,0.28)]"
                style={{
                  background: signal,
                  color: "#fff",
                  fontFamily: "'Syne', sans-serif",
                  letterSpacing: "0.08em",
                }}
              >
                Start Free Audit
              </Link>
              <Link
                href="#how"
                className="text-xs tracking-wider no-underline flex items-center gap-2 transition-colors"
                style={{ color: dim, letterSpacing: "0.08em" }}
              >
                See the demo <span>→</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-baseline gap-2"
            >
              <span className="text-3xl font-extrabold" style={{ fontFamily: "'Syne', sans-serif", color: signal }}>
                $29
              </span>
              <span className="text-xs tracking-wider" style={{ color: dim }}>
                / month · all-in · no commitment
              </span>
            </motion.div>
          </div>

          {/* Right */}
          <div className="py-10 lg:py-20 lg:pl-12 flex flex-col gap-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { val: "4.5×", label: "more AI visibility", color: signal },
                { val: "9.7×", label: "more brand mentions", color: signal2 },
                { val: "+60%", label: "avg organic traffic", color: paper },
                { val: "500+", label: "active businesses", color: signal },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="p-6"
                  style={{
                    background: "#fff",
                    border: `1px solid ${border}`,
                    boxShadow: "0 1px 6px rgba(13,12,31,0.06)",
                  }}
                >
                  <div
                    className="text-3xl font-extrabold leading-none mb-1.5"
                    style={{ fontFamily: "'Syne', sans-serif", color: s.color }}
                  >
                    {s.val}
                  </div>
                  <div className="text-[0.65rem] uppercase tracking-wider" style={{ color: dim }}>
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* AI visibility bars */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="p-6"
              style={{ background: "#fff", border: `1px solid ${border}`, boxShadow: "0 1px 6px rgba(13,12,31,0.06)" }}
            >
              <p className="text-[0.65rem] uppercase tracking-[0.15em] mb-5" style={{ color: dim }}>
                Your AI visibility score — client example
              </p>
              {[
                { name: "ChatGPT", pct: 95 },
                { name: "Gemini", pct: 89 },
                { name: "Perplexity", pct: 82 },
              ].map((bar, i) => (
                <div key={i} className="flex items-center gap-3 mb-3.5">
                  <span className="text-xs w-20" style={{ color: dim }}>
                    {bar.name}
                  </span>
                  <div className="flex-1 h-1 relative overflow-hidden" style={{ background: "rgba(13,12,31,0.07)" }}>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1.2, delay: 0.2 * i, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full origin-left"
                      style={{
                        width: `${bar.pct}%`,
                        background: `linear-gradient(90deg, ${signal}, rgba(59,130,246,0.5))`,
                      }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right font-medium" style={{ color: signal }}>
                    {bar.pct}%
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── PROOF BAR ──────────────────── */}
        <section
          className="relative z-[2] flex flex-wrap"
          style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: "#fff" }}
        >
          {proofStats.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex-1 min-w-[50%] md:min-w-0 px-9 py-10"
              style={{ borderRight: i < proofStats.length - 1 ? `1px solid ${border}` : "none" }}
            >
              <div
                className="text-4xl font-extrabold leading-none mb-2"
                style={{ fontFamily: "'Syne', sans-serif", color: signal }}
              >
                {p.big}
              </div>
              <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: dim }}>
                {p.desc}
              </div>
            </motion.div>
          ))}
        </section>

        {/* ── HOW IT WORKS ───────────────── */}
        <section
          id="how"
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-lg"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: paper,
            }}
          >
            Three steps.
            <br />
            <em style={{ fontStyle: "italic", fontWeight: 300, color: dim }}>Zero manual effort.</em>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: border }}>
            {steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-9 transition-colors hover:bg-[rgba(59,130,246,0.03)]"
                style={{ background: "#fff" }}
              >
                <div
                  className="text-5xl font-extrabold leading-none mb-5"
                  style={{ fontFamily: "'Syne', sans-serif", color: "rgba(59,130,246,0.15)", letterSpacing: "-0.04em" }}
                >
                  {s.num}
                </div>
                <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif", color: paper }}>
                  {s.title}
                </h3>
                <p className="text-xs leading-[1.8] mb-4" style={{ color: dim }}>
                  {s.desc}
                </p>
                <span
                  className="inline-block px-2.5 py-1 text-[0.6rem] uppercase tracking-wider"
                  style={{ background: "rgba(59,130,246,0.08)", color: signal }}
                >
                  {s.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ───────────────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <h2
              className="max-w-md"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: paper,
              }}
            >
              Everything you need to dominate the{" "}
              <em style={{ fontStyle: "italic", fontWeight: 300, color: signal }}>AI search era</em>
            </h2>
            <span className="text-xs tracking-wider" style={{ color: dim }}>
              06 modules · 1 platform
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: border }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative p-10 overflow-hidden transition-colors group hover:bg-[rgba(59,130,246,0.02)]"
                style={{ background: "#fff" }}
              >
                <div
                  className="absolute top-0 left-0 w-[2px] h-0 group-hover:h-full transition-all duration-500"
                  style={{ background: signal }}
                />
                <div
                  className="w-10 h-10 flex items-center justify-center mb-6 text-lg"
                  style={{ border: `1px solid ${border}`, background: "rgba(59,130,246,0.04)" }}
                >
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold mb-3" style={{ fontFamily: "'Syne', sans-serif", color: paper }}>
                  {f.name}
                </h3>
                <p className="text-xs leading-[1.8] mb-4" style={{ color: dim }}>
                  {f.desc}
                </p>
                <span
                  className="inline-block px-2 py-0.5 text-[0.58rem] uppercase tracking-wider"
                  style={{
                    border: `1px solid ${f.hot ? signal2 : f.isNew ? signal : border}`,
                    color: f.hot ? signal2 : f.isNew ? signal : dim,
                  }}
                >
                  {f.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── DASHBOARD PREVIEW ──────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] mb-5" style={{ color: signal }}>
              Your command center AI
            </p>
            <h2
              className="mb-6"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: paper,
              }}
            >
              All your AI potential,
              <br />
              <em style={{ fontStyle: "italic", fontWeight: 300, color: dim }}>at a glance.</em>
            </h2>
            <p className="text-sm leading-[1.9] mb-9" style={{ color: dim }}>
              The AutoPilotGeo dashboard gives you a complete view of your visibility in the AI ecosystem. No
              complexity. Just the metrics that matter.
            </p>
            <ul className="space-y-0">
              {[
                "Real-time visibility score on ChatGPT, Gemini, Perplexity",
                "Projected traffic growth curve over 6 months",
                "Week-by-week content activity (answers + articles)",
                "30-day auto-generated & auto-executed plan",
                "SEO, AEO, API status & latency — all green",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 py-2 text-xs leading-relaxed"
                  style={{ color: dim, borderBottom: `1px solid ${border}` }}
                >
                  <span className="mt-0.5 flex-shrink-0" style={{ color: signal }}>
                    ↳
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock widget — light surface */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative p-7 overflow-hidden"
            style={{ background: "#fff", border: `1px solid ${border}`, boxShadow: "0 4px 24px rgba(13,12,31,0.07)" }}
          >
            <div
              className="absolute -top-16 -right-16 w-52 h-52 pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)" }}
            />
            <div className="flex justify-between items-center mb-6">
              <span className="text-[0.65rem] uppercase tracking-wider" style={{ color: dim }}>
                AI Visibility Score
              </span>
              <span
                className="flex items-center gap-1.5 text-[0.58rem] uppercase tracking-wider"
                style={{ color: signal }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: signal, animation: "blink 1.5s infinite" }}
                />
                Live
              </span>
            </div>
            {/* Mini chart bars */}
            <div className="h-20 flex items-end gap-1 mb-6">
              {[30, 45, 35, 55, 60, 50, 70, 80].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 transition-colors hover:bg-[rgba(59,130,246,0.18)]"
                  style={{
                    height: `${h}%`,
                    background: i === 7 ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.09)",
                    borderTop: i === 7 ? `2px solid ${signal}` : "2px solid rgba(59,130,246,0.3)",
                  }}
                />
              ))}
            </div>
            {/* Platform scores */}
            <div className="space-y-3 mb-6">
              {[
                { name: "ChatGPT", pct: 95 },
                { name: "Gemini", pct: 89 },
                { name: "Perplexity", pct: 82 },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs w-20" style={{ color: dim }}>
                    {p.name}
                  </span>
                  <div className="flex-1 h-[3px] overflow-hidden" style={{ background: "rgba(13,12,31,0.07)" }}>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.15 }}
                      className="h-full origin-left"
                      style={{ width: `${p.pct}%`, background: signal }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right font-medium" style={{ color: signal }}>
                    {p.pct}%
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-4 flex justify-between" style={{ borderTop: `1px solid ${border}` }}>
              {[
                { val: "105", label: "Answers" },
                { val: "107", label: "Articles" },
                { val: "+15K", label: "Reach/mo" },
              ].map((w, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: paper }}>
                    {w.val}
                  </div>
                  <div className="text-[0.58rem] mt-0.5" style={{ color: dim }}>
                    {w.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── TESTIMONIALS ───────────────── */}
        <section className="relative z-[2] px-6 md:px-12 py-24" style={{ borderBottom: `1px solid ${border}` }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: border }}>
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10"
                style={{ background: "#fff" }}
              >
                <p
                  className="text-base leading-[1.7] mb-7"
                  style={{ fontFamily: "'Fraunces', serif", fontStyle: "italic", fontWeight: 300, color: paper }}
                >
                  "{t.quote}"
                </p>
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.2)",
                      color: signal,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: paper }}>
                      {t.name}
                    </p>
                    <p className="text-[0.62rem]" style={{ color: dim }}>
                      {t.role}
                    </p>
                  </div>
                  <span
                    className="text-[0.58rem] uppercase tracking-wider px-2 py-1"
                    style={{
                      color: signal,
                      border: "1px solid rgba(59,130,246,0.25)",
                      background: "rgba(59,130,246,0.05)",
                    }}
                  >
                    {t.platform}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PRICING ────────────────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32 text-center"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.8rem, 4vw, 3.2rem)",
              letterSpacing: "-0.03em",
              color: paper,
            }}
          >
            One price. <em style={{ fontStyle: "italic", fontWeight: 300, color: signal }}>All included.</em>
          </motion.h2>
          <p className="text-sm mb-16" style={{ color: dim }}>
            No confusing tiers. No surprises. Just results.
          </p>

          <div
            className="max-w-lg mx-auto relative p-14"
            style={{
              background: "#fff",
              border: `1.5px solid rgba(59,130,246,0.25)`,
              boxShadow: "0 8px 40px rgba(59,130,246,0.1)",
            }}
          >
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-[0.58rem] font-bold uppercase tracking-[0.2em]"
              style={{ background: signal, color: "#fff", fontFamily: "'Syne', sans-serif" }}
            >
              Most Popular
            </span>
            <p
              className="text-sm font-extrabold uppercase tracking-wider mb-6"
              style={{ fontFamily: "'Syne', sans-serif", color: paper }}
            >
              AutoPilot Plan
            </p>
            <div className="mb-8">
              <span
                className="text-7xl font-extrabold leading-none"
                style={{ fontFamily: "'Syne', sans-serif", color: signal, letterSpacing: "-0.04em" }}
              >
                $29
              </span>
              <p className="text-xs mt-2" style={{ color: dim }}>
                per month · no commitment · 1-click cancel
              </p>
            </div>
            <ul className="text-left mb-10 space-y-0">
              {planIncludes.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 py-2.5 text-xs"
                  style={{ borderBottom: `1px solid ${border}`, color: dim }}
                >
                  <span className="font-bold" style={{ color: signal }}>
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="block w-full py-5 text-center text-sm font-bold uppercase tracking-wider no-underline transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(59,130,246,0.3)]"
              style={{ background: signal, color: "#fff", fontFamily: "'Syne', sans-serif", letterSpacing: "0.1em" }}
            >
              Start — Free Audit
            </Link>
            <p className="text-xs mt-4" style={{ color: dim }}>
              Free AI visibility audit · No credit card required
            </p>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────── */}
        <section className="relative z-[2] px-6 md:px-12 py-24" style={{ borderBottom: `1px solid ${border}` }}>
          <h2
            className="text-center mb-16"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              letterSpacing: "-0.02em",
              color: paper,
            }}
          >
            Frequently asked <em style={{ fontStyle: "italic", fontWeight: 300, color: signal }}>questions</em>
          </h2>
          <div className="max-w-2xl mx-auto space-y-px" style={{ background: border }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ background: "#fff" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between text-sm font-medium transition-colors hover:bg-[rgba(59,130,246,0.03)]"
                  style={{ fontFamily: "'Syne', sans-serif", color: paper }}
                >
                  {faq.q}
                  <span className="text-lg ml-4" style={{ color: signal }}>
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-6 pb-5 text-xs leading-[1.8]"
                    style={{ color: dim }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────── */}
        <section className="relative z-[2] py-40 px-6 text-center overflow-hidden" style={{ background: ink }}>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.08), transparent 70%)" }}
          />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mb-6"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(2.2rem, 5vw, 4.5rem)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              color: paper,
            }}
          >
            Your competitors
            <br />
            <em style={{ fontStyle: "italic", fontWeight: 300, color: signal }}>are already there.</em>
          </motion.h2>
          <p className="relative text-sm max-w-md mx-auto mb-12 leading-[1.8]" style={{ color: dim }}>
            Every day without AutoPilotGeo is a day where ChatGPT recommends someone else to your potential customers.
          </p>
          <Link
            href="/onboarding"
            className="relative inline-block px-12 py-5 text-sm font-bold uppercase tracking-wider no-underline transition-all hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(59,130,246,0.3)]"
            style={{ background: signal, color: "#fff", fontFamily: "'Syne', sans-serif", letterSpacing: "0.1em" }}
          >
            Start Now →
          </Link>
        </section>

        {/* ── FOOTER ─────────────────────── */}
        <footer
          className="relative z-[2] px-6 md:px-12 py-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: `1px solid ${border}`, background: "#fff" }}
        >
          <div className="text-sm font-extrabold" style={{ fontFamily: "'Syne', sans-serif", color: paper }}>
            AutoPilot<span style={{ color: signal }}>GEO</span>
          </div>
          <span className="text-[0.6rem] tracking-wider" style={{ color: dim }}>
            © 2025 AutoPilotGeo · Get recommended by AI
          </span>
          <a
            href="https://autopilotgeo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[0.6rem] tracking-wider no-underline transition-colors hover:text-blue-500"
            style={{ color: dim }}
          >
            autopilotgeo.com ↗
          </a>
        </footer>

        {/* Sticky mobile CTA */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 shadow-lg"
          style={{ background: "#fff", borderTop: `1px solid ${border}` }}
        >
          <Link
            href="/onboarding"
            className="block w-full py-3 text-center text-xs font-bold uppercase tracking-wider no-underline"
            style={{ background: signal, color: "#fff", fontFamily: "'Syne', sans-serif" }}
          >
            Get free AI score →
          </Link>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes scanline   { from { transform: translateY(-100%); } to { transform: translateY(100vh); } }
        @keyframes ticker     { from { transform: translateX(0);       } to { transform: translateX(-50%);  } }
        @keyframes pulse-signal { 0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.35); } 50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); } }
        @keyframes blink      { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </>
  );
}
