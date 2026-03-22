"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleOneTap } from "@/components/GoogleOneTap";
import { InactivityPopup } from "@/components/InactivityPopup";
import { SocialProofToast } from "@/components/nudges/SocialProofToast";
import { ExitIntentPopup } from "@/components/nudges/ExitIntentPopup";

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────── */
const C = {
  bg: "#f7f6fe",
  white: "#ffffff",
  ink: "#0c0b18",
  paper: "#0d0c1f",
  mid: "#5a5872",
  muted: "#9997ab",
  blue: "#3b82f6",
  blueDark: "#1d4ed8",
  blueLight: "#eff4ff",
  blueBorder: "rgba(59,130,246,0.18)",
  orange: "#f97316",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  redBg: "#fff5f5",
  red: "#dc2626",
  border: "rgba(13,12,31,0.08)",
  borderMid: "rgba(13,12,31,0.14)",
  card: "rgba(13,12,31,0.03)",
};

/* ─────────────────────────────────────────────────────────
   SVG ICONS — refined, no emoji
───────────────────────────────────────────────────────── */
const Icon = {
  geo: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke={C.blue} strokeWidth="1.4" />
      <path
        d="M9 2v14M2 9h14M4.5 4.5C6 7 6 11 4.5 13.5M13.5 4.5C12 7 12 11 13.5 13.5"
        stroke={C.blue}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  aeo: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 14l3.5-9h1L11 14" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10.5h4.5" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14" cy="9" r="2.5" stroke={C.blue} strokeWidth="1.4" />
    </svg>
  ),
  seo: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="3" width="14" height="12" rx="2" stroke={C.blue} strokeWidth="1.4" />
      <path d="M6 7h6M6 10h4" stroke={C.blue} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 6h14" stroke={C.blue} strokeWidth="1.4" />
    </svg>
  ),
  local: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2a5 5 0 015 5c0 3.5-5 9-5 9S4 10.5 4 7a5 5 0 015-5z" stroke={C.blue} strokeWidth="1.4" />
      <circle cx="9" cy="7" r="1.8" stroke={C.blue} strokeWidth="1.4" />
    </svg>
  ),
  shop: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M3 3h1.5l1.2 6h7.5l1.3-4H6"
        stroke={C.blue}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="14" r="1.2" fill={C.blue} />
      <circle cx="12" cy="14" r="1.2" fill={C.blue} />
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="10" width="3" height="5" rx="1" fill={C.blue} opacity=".3" />
      <rect x="7.5" y="6" width="3" height="9" rx="1" fill={C.blue} opacity=".6" />
      <rect x="13" y="3" width="3" height="12" rx="1" fill={C.blue} />
    </svg>
  ),
};

/* ─────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  "ChatGPT Visibility",
  "Google AEO",
  "Gemini Ranking",
  "Perplexity Mentions",
  "Auto-Publishing",
  "GEO Engine",
  "500+ Businesses",
  "$29/month All-In",
];

const SOCIAL_PILLS = [
  { init: "M", name: "Mike", role: "Roofing", result: "+180% impressions" },
  { init: "A", name: "Amanda", role: "E-shop", result: "Page 1 in 8 weeks" },
  { init: "R", name: "Ryan", role: "Agency", result: "–$1,200/mo in tools" },
];

const BEFORE = [
  "AI never mentions your brand",
  "Competitors get cited instead",
  "Content takes weeks to write",
  "Stuck on page 3 of Google",
];

const AFTER = [
  "ChatGPT recommends your brand",
  "30 expert articles/month, auto",
  "Auto-published to your CMS",
  "+60% avg traffic in 3 months",
];

const HERO_STATS = [
  { val: "4.5×", label: "More AI visibility" },
  { val: "9.7×", label: "More brand mentions" },
  { val: "+60%", label: "Traffic increase avg" },
  { val: "$29/mo", label: "All-in pricing" },
];

const AI_PLATFORMS = [
  { name: "ChatGPT", color: "#10a37f" },
  { name: "Gemini", color: "#4285f4" },
  { name: "Perplexity", color: "#6366f1" },
  { name: "Claude", color: "#cc785c" },
];

const STEPS = [
  {
    num: "01",
    title: "Connect your business",
    desc: "Enter your URL. AutoPilotGeo analyses your sector, competitors, and the questions AI asks about your market.",
    tag: "Setup <5 min",
  },
  {
    num: "02",
    title: "The engine generates content",
    desc: "SEO articles, AEO answers, GEO content — everything created and optimised automatically so AI cites you first.",
    tag: "100% automatic",
  },
  {
    num: "03",
    title: "Publish in one click",
    desc: "Direct CMS connection. Content publishes on autopilot. Watch your AI visibility score climb.",
    tag: "Auto-publish",
  },
];

const FEATURES = [
  {
    icon: Icon.geo,
    name: "GEO Engine",
    desc: "Real-time optimisation of your presence in generative AI engine answers. Track ChatGPT, Gemini, Perplexity.",
    badge: "Hot",
    hot: true,
  },
  {
    icon: Icon.aeo,
    name: "AEO Answers",
    desc: "Generate expert answers to the questions your customers ask AI. Format optimised to be cited directly.",
    badge: "AEO",
  },
  {
    icon: Icon.seo,
    name: "Auto SEO",
    desc: "30 articles/month generated & published automatically. E-E-A-T compliant. Optimised for Google and AI simultaneously.",
    badge: "SEO",
  },
  {
    icon: Icon.local,
    name: "Local AEO",
    desc: "Dominate local AI answers. Perfect for shops, practices, restaurants — any geo-located activity.",
    badge: "New",
    isNew: true,
  },
  {
    icon: Icon.shop,
    name: "AEO Shopping",
    desc: 'Your products recommended by ChatGPT & Gemini when someone asks "what\'s the best product for…"',
    badge: "New",
    isNew: true,
  },
  {
    icon: Icon.analytics,
    name: "Analytics & Planning",
    desc: "Real-time dashboard. 30-day auto-generated plan. AI mention history. Competitor tracking.",
    badge: "Live",
  },
];

const TESTIMONIALS = [
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

const PLAN_INCLUDES = [
  "30 SEO articles generated & published / month",
  "30 AEO answers optimised for AI / month",
  "GEO Engine — ChatGPT, Gemini, Perplexity tracking",
  "Auto-Publishing WordPress, Shopify, Wix…",
  "Real-time Analytics Dashboard",
  "30-day auto-generated plan",
  "Local AEO + AEO Shopping included",
  "Priority support",
];

const PROOF_STATS = [
  { big: "105", desc: "AI answers generated\nscore avg 87/100" },
  { big: "107", desc: "Articles ready to publish\nE-E-A-T optimised" },
  { big: "+15K", desc: "Monthly impressions\nprojected +1 month" },
  { big: "<1wk", desc: "CMS integration\nWordPress · Shopify · Wix" },
];

const FAQS = [
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

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "GEO Engine", href: "/geo-engine" },
    { label: "AEO Answers", href: "/aeo-answers" },
    { label: "Auto SEO", href: "/auto-seo" },
    { label: "Local AEO", href: "/local-aeo" },
    { label: "AEO Shopping", href: "/aeo-shopping" },
    { label: "Analytics", href: "/analytics" },
    { label: "Integrations", href: "/integrations" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Pricing", href: "/pricing" },
    { label: "Careers", href: "/careers" },
    { label: "Affiliates", href: "/affiliates" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Support", href: "/support" },
    { label: "API Reference", href: "/api" },
    { label: "Status", href: "/status" },
    { label: "Changelog", href: "/changelog" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
    { label: "GDPR", href: "/gdpr" },
  ],
};

/* ─────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────── */
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta property="og:title" content="AutoPilot Geo – Get Recommended by ChatGPT & Google" />
        <meta
          property="og:description"
          content="Automatically publish expert content that makes AI search engines recommend you — not your competitors."
        />
        <meta property="og:url" content="https://autopilotgeo.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://autopilotgeo.com/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
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
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        />
      </Helmet>

      <div
        style={{
          background: C.bg,
          color: C.paper,
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 400,
          minHeight: "100vh",
        }}
      >
        <GoogleOneTap />
        <InactivityPopup inactivityDelay={45} />

        {/* Grid texture */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `linear-gradient(rgba(59,130,246,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.04) 1px,transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Scanline */}
        <div
          className="fixed top-0 left-0 right-0 h-[2px] pointer-events-none z-[1]"
          style={{
            background: `linear-gradient(transparent,rgba(59,130,246,0.1),transparent)`,
            animation: "scanline 8s linear infinite",
          }}
        />

        {/* ── HEADER ─────────────────────────────────────── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
          style={{
            background: "rgba(247,246,254,0.9)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Link href="/">
            <AnimatedLogo size="sm" theme="light" />
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {[
              ["Pricing", "/pricing"],
              ["Blog", "/blog"],
              ["About", "/about"],
            ].map(([l, h]) => (
              <Link
                key={h}
                href={h}
                style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  padding: "6px 14px",
                  borderRadius: 8,
                  color: C.mid,
                  textDecoration: "none",
                }}
              >
                {l}
              </Link>
            ))}
            <Link
              href="/auth"
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 500,
                fontSize: "0.85rem",
                padding: "6px 14px",
                color: C.mid,
                textDecoration: "none",
                marginLeft: 4,
              }}
            >
              Log in
            </Link>
          </div>

          <div
            className="hidden md:flex items-center gap-2"
            style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.blue }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: C.blue, animation: "pulse-signal 2s infinite" }}
            />
            AI Visibility Engine — Live
          </div>

          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: C.blue,
              color: "#fff",
              borderRadius: 8,
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 600,
              fontSize: "0.82rem",
              textDecoration: "none",
              letterSpacing: "0.04em",
            }}
          >
            Start Free Audit <ArrowRight size={14} />
          </Link>
        </header>

        {/* ── TICKER ─────────────────────────────────────── */}
        <div className="relative z-[2] mt-[64px] py-3 overflow-hidden" style={{ background: C.blue }}>
          <div className="flex whitespace-nowrap" style={{ animation: "ticker 22s linear infinite" }}>
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span
                key={i}
                style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#fff",
                  padding: "0 28px",
                }}
              >
                {item} <span style={{ opacity: 0.35, padding: "0 6px" }}>◆</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── HERO ───────────────────────────────────────── */}
        <section className="relative z-[2] px-6 md:px-12 pt-20 pb-0">
          <div className="max-w-7xl mx-auto">
            {/* Top: eyebrow + title + sub + CTA */}
            <div className="max-w-2xl mb-16">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-3 mb-6"
                style={{ fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: C.blue }}
              >
                <span style={{ width: 28, height: 1, background: C.blue, display: "inline-block" }} />
                Generative Engine Optimization
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: "clamp(2.6rem,5vw,4.4rem)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.025em",
                  color: C.paper,
                  marginBottom: 20,
                }}
              >
                Get your business
                <br />
                recommended by <em style={{ fontStyle: "italic", color: C.blue }}>ChatGPT</em>
                {" & "}
                <em style={{ fontStyle: "italic", color: C.blue }}>Google</em>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                style={{ fontSize: "1.05rem", lineHeight: 1.75, color: C.mid, maxWidth: 500, marginBottom: 32 }}
              >
                Automatically publish expert content that makes AI search engines recommend{" "}
                <strong style={{ color: C.paper, fontWeight: 600 }}>you</strong> — not your competitors. Works for any
                industry.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4"
              >
                <Link
                  href="/onboarding"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 30px",
                    background: C.blue,
                    color: "#fff",
                    borderRadius: 10,
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(59,130,246,0.28)",
                    transition: "transform .15s,box-shadow .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 28px rgba(59,130,246,0.36)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(59,130,246,0.28)";
                  }}
                >
                  Get your free AI score <ArrowRight size={16} />
                </Link>
                <Link
                  href="#how"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.82rem",
                    color: C.mid,
                    textDecoration: "none",
                    letterSpacing: "0.04em",
                  }}
                >
                  See how it works <span>→</span>
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ fontSize: "0.75rem", color: C.muted }}
              >
                No credit card · Results in <strong style={{ color: C.mid, fontWeight: 600 }}>30 seconds</strong> ·
                Cancel anytime
              </motion.p>
            </div>

            {/* Middle: before/after + stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16 max-w-4xl">
              {/* Before */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px" }}
              >
                <p
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: C.red,
                    marginBottom: 16,
                  }}
                >
                  ✕ Without AutoPilot Geo
                </p>
                {BEFORE.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: C.redBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <X size={11} color={C.red} />
                    </div>
                    <span style={{ fontSize: "0.85rem", color: C.mid, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </motion.div>

              {/* After */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
                style={{
                  background: C.white,
                  border: `1px solid ${C.blueBorder}`,
                  borderRadius: 16,
                  padding: "22px 24px",
                  boxShadow: "0 0 0 3px rgba(59,130,246,0.05)",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: C.green,
                    marginBottom: 16,
                  }}
                >
                  ✓ With AutoPilot Geo
                </p>
                {AFTER.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: C.greenBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <Check size={11} color={C.green} />
                    </div>
                    <span style={{ fontSize: "0.85rem", color: C.paper, fontWeight: 500, lineHeight: 1.5 }}>
                      {item}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Bottom: social proof + stats + AI platforms */}
            <div className="pb-20 border-b" style={{ borderColor: C.border }}>
              {/* Social proof pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.48 }}
                style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}
              >
                {SOCIAL_PILLS.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 9,
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 99,
                      padding: "7px 14px",
                      fontSize: "0.8rem",
                      color: C.mid,
                      boxShadow: "0 1px 4px rgba(13,12,31,0.05)",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: C.blueLight,
                        color: C.blue,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        flexShrink: 0,
                      }}
                    >
                      {p.init}
                    </div>
                    {p.name} · {p.role} · <strong style={{ color: C.paper, fontWeight: 600 }}>{p.result}</strong>
                  </div>
                ))}
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.54 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
                style={{ maxWidth: 640 }}
              >
                {HERO_STATS.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      padding: "16px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Instrument Serif',serif",
                        fontSize: "1.8rem",
                        color: C.paper,
                        lineHeight: 1,
                      }}
                    >
                      {s.val}
                    </div>
                    <p style={{ fontSize: "0.7rem", color: C.muted, marginTop: 4 }}>{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* AI platforms */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.58 }}
                style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}
              >
                <span
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginRight: 4,
                  }}
                >
                  Optimises your presence on
                </span>
                {AI_PLATFORMS.map((p) => (
                  <div
                    key={p.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      background: C.white,
                      border: `1px solid ${C.border}`,
                      borderRadius: 99,
                      padding: "6px 14px",
                      fontSize: "0.8rem",
                      color: C.mid,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    {p.name}
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── PROOF BAR ──────────────────────────────────── */}
        <section
          className="relative z-[2] flex flex-wrap"
          style={{ background: C.white, borderBottom: `1px solid ${C.border}` }}
        >
          {PROOF_STATS.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex-1 min-w-[50%] md:min-w-0 px-9 py-10"
              style={{ borderRight: i < PROOF_STATS.length - 1 ? `1px solid ${C.border}` : "none" }}
            >
              <div
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontSize: "2.4rem",
                  color: C.blue,
                  lineHeight: 1,
                  marginBottom: 8,
                }}
              >
                {p.big}
              </div>
              <div style={{ fontSize: "0.75rem", lineHeight: 1.7, color: C.mid, whiteSpace: "pre-line" }}>{p.desc}</div>
            </motion.div>
          ))}
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────── */}
        <section
          id="how"
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 56 }}
          >
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: C.blue,
                marginBottom: 12,
              }}
            >
              How it works
            </p>
            <h2
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: "clamp(1.8rem,3.5vw,2.8rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: C.paper,
              }}
            >
              Three steps.
              <br />
              <em style={{ color: C.mid, fontStyle: "italic" }}>Zero manual effort.</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: C.border }}>
            {STEPS.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-9"
                style={{ background: C.white, transition: "background .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
              >
                <div
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontSize: "3.6rem",
                    color: "rgba(59,130,246,0.12)",
                    lineHeight: 1,
                    marginBottom: 20,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.num}
                </div>
                <h3
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: C.paper,
                    marginBottom: 10,
                  }}
                >
                  {s.title}
                </h3>
                <p style={{ fontSize: "0.82rem", lineHeight: 1.8, color: C.mid, marginBottom: 16 }}>{s.desc}</p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    background: "rgba(59,130,246,0.08)",
                    color: C.blue,
                    fontSize: "0.62rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {s.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
            <div>
              <p
                style={{
                  fontFamily: "'Outfit',sans-serif",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: C.blue,
                  marginBottom: 10,
                }}
              >
                Platform modules
              </p>
              <h2
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontWeight: 400,
                  fontSize: "clamp(1.6rem,3vw,2.4rem)",
                  lineHeight: 1.15,
                  letterSpacing: "-0.02em",
                  color: C.paper,
                  maxWidth: 440,
                }}
              >
                Everything you need to dominate the <em style={{ color: C.blue }}>AI search era</em>
              </h2>
            </div>
            <span style={{ fontSize: "0.72rem", color: C.muted, letterSpacing: "0.06em" }}>
              06 modules · 1 platform
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: C.border }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative p-10 overflow-hidden group"
                style={{ background: C.white, transition: "background .2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = C.white)}
              >
                {/* Left accent bar on hover */}
                <div
                  className="absolute top-0 left-0 w-[2px] h-0 group-hover:h-full"
                  style={{ background: C.blue, transition: "height .4s cubic-bezier(.22,1,.36,1)" }}
                />
                {/* Icon */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: C.blueLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    color: C.paper,
                    marginBottom: 10,
                  }}
                >
                  {f.name}
                </h3>
                <p style={{ fontSize: "0.8rem", lineHeight: 1.8, color: C.mid, marginBottom: 16 }}>{f.desc}</p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 8px",
                    fontSize: "0.6rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    border: `1px solid ${f.hot ? C.orange : f.isNew ? C.blue : C.border}`,
                    color: f.hot ? C.orange : f.isNew ? C.blue : C.muted,
                  }}
                >
                  {f.badge}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── DASHBOARD PREVIEW ──────────────────────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <div>
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: C.blue,
                marginBottom: 12,
              }}
            >
              Your command center
            </p>
            <h2
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: "clamp(1.6rem,2.8vw,2.2rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: C.paper,
                marginBottom: 18,
              }}
            >
              All your AI potential,
              <br />
              <em style={{ color: C.mid }}>at a glance.</em>
            </h2>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.85, color: C.mid, marginBottom: 28 }}>
              The AutoPilotGeo dashboard gives you a complete view of your visibility in the AI ecosystem. No
              complexity. Just the metrics that matter.
            </p>
            <ul>
              {[
                "Real-time visibility score on ChatGPT, Gemini, Perplexity",
                "Projected traffic growth curve over 6 months",
                "Week-by-week content activity (answers + articles)",
                "30-day auto-generated & auto-executed plan",
                "SEO, AEO, API status & latency — all green",
              ].map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: "0.8rem",
                    color: C.mid,
                    lineHeight: 1.6,
                    listStyle: "none",
                  }}
                >
                  <span style={{ color: C.blue, flexShrink: 0, marginTop: 2 }}>↳</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Widget */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 2,
              padding: 28,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(13,12,31,0.07)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 200,
                height: 200,
                background: "radial-gradient(circle,rgba(59,130,246,0.07),transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <span
                style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.muted }}
              >
                AI Visibility Score
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "0.6rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: C.blue,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: C.blue,
                    animation: "blink 1.5s infinite",
                  }}
                />
                Live
              </span>
            </div>
            {/* Mini bars */}
            <div style={{ height: 72, display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 22 }}>
              {[30, 45, 35, 55, 60, 50, 70, 80].map((h, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    background: i === 7 ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.1)",
                    borderTop: i === 7 ? `2px solid ${C.blue}` : "2px solid rgba(59,130,246,0.3)",
                  }}
                />
              ))}
            </div>
            {/* Platform bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                { name: "ChatGPT", pct: 95 },
                { name: "Gemini", pct: 89 },
                { name: "Perplexity", pct: 82 },
              ].map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.72rem", width: 76, color: C.mid }}>{p.name}</span>
                  <div style={{ flex: 1, height: 3, background: "rgba(13,12,31,0.07)", overflow: "hidden" }}>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: i * 0.15 }}
                      style={{ height: "100%", width: `${p.pct}%`, background: C.blue, transformOrigin: "left" }}
                    />
                  </div>
                  <span style={{ fontSize: "0.68rem", color: C.blue, width: 28, textAlign: "right", fontWeight: 500 }}>
                    {p.pct}%
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                paddingTop: 16,
                display: "flex",
                justifyContent: "space-between",
                borderTop: `1px solid ${C.border}`,
              }}
            >
              {[
                { val: "105", label: "Answers" },
                { val: "107", label: "Articles" },
                { val: "+15K", label: "Reach/mo" },
              ].map((w, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Instrument Serif',serif", fontSize: "1.4rem", color: C.paper }}>
                    {w.val}
                  </div>
                  <div style={{ fontSize: "0.6rem", color: C.muted, marginTop: 2 }}>{w.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ── TESTIMONIALS ───────────────────────────────── */}
        <section className="relative z-[2] px-6 md:px-12 py-24" style={{ borderBottom: `1px solid ${C.border}` }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 40 }}
          >
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "0.65rem",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: C.blue,
                marginBottom: 10,
              }}
            >
              Social proof
            </p>
            <h2
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: "clamp(1.6rem,3vw,2.4rem)",
                letterSpacing: "-0.02em",
                color: C.paper,
              }}
            >
              What people say about <em style={{ color: C.blue }}>AutoPilot Geo</em>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px" style={{ background: C.border }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{ background: C.white, padding: 36 }}
              >
                {/* Stars */}
                <div style={{ display: "flex", gap: 3, marginBottom: 16 }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} width="13" height="13" viewBox="0 0 13 13" fill="#f59e0b">
                      <path d="M6.5 1l1.4 3.8H12L8.7 7.3l1.3 3.8-3.5-2.4-3.5 2.4 1.3-3.8L1 4.8h4.1z" />
                    </svg>
                  ))}
                </div>
                <p
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontStyle: "italic",
                    fontWeight: 400,
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    color: C.paper,
                    marginBottom: 24,
                  }}
                >
                  "{t.quote}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: C.blueLight,
                      border: `1px solid ${C.blueBorder}`,
                      color: C.blue,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'Outfit',sans-serif",
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      flexShrink: 0,
                    }}
                  >
                    {t.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "'Outfit',sans-serif",
                        fontWeight: 600,
                        fontSize: "0.82rem",
                        color: C.paper,
                        margin: 0,
                      }}
                    >
                      {t.name}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: C.muted, margin: 0 }}>{t.role}</p>
                  </div>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: C.blue,
                      border: `1px solid ${C.blueBorder}`,
                      background: C.blueLight,
                      padding: "3px 9px",
                    }}
                  >
                    {t.platform}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── PRICING ────────────────────────────────────── */}
        <section
          className="relative z-[2] px-6 md:px-12 py-24 lg:py-32 text-center"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2
              style={{
                fontFamily: "'Instrument Serif',serif",
                fontWeight: 400,
                fontSize: "clamp(1.8rem,4vw,3.2rem)",
                letterSpacing: "-0.025em",
                color: C.paper,
                marginBottom: 10,
              }}
            >
              One price. <em style={{ color: C.blue }}>All included.</em>
            </h2>
            <p style={{ fontSize: "0.875rem", color: C.muted, marginBottom: 52 }}>
              No confusing tiers. No surprises. Just results.
            </p>
          </motion.div>

          <div
            style={{
              maxWidth: 480,
              margin: "0 auto",
              position: "relative",
              background: C.white,
              border: `1.5px solid ${C.blueBorder}`,
              padding: 52,
              boxShadow: "0 8px 40px rgba(59,130,246,0.09)",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -12,
                left: "50%",
                transform: "translateX(-50%)",
                background: C.blue,
                color: "#fff",
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "0.6rem",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "5px 16px",
              }}
            >
              Most Popular
            </span>
            <p
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "0.8rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: C.paper,
                marginBottom: 20,
              }}
            >
              AutoPilot Plan
            </p>
            <div style={{ marginBottom: 28 }}>
              <span
                style={{
                  fontFamily: "'Instrument Serif',serif",
                  fontSize: "5rem",
                  color: C.blue,
                  lineHeight: 1,
                  letterSpacing: "-0.04em",
                }}
              >
                $29
              </span>
              <p style={{ fontSize: "0.75rem", color: C.muted, marginTop: 6 }}>
                per month · no commitment · 1-click cancel
              </p>
            </div>
            <ul style={{ textAlign: "left", marginBottom: 36, listStyle: "none", padding: 0 }}>
              {PLAN_INCLUDES.map((item, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 0",
                    borderBottom: `1px solid ${C.border}`,
                    fontSize: "0.82rem",
                    color: C.mid,
                  }}
                >
                  <Check size={14} color={C.blue} />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              style={{
                display: "block",
                width: "100%",
                padding: "18px",
                textAlign: "center",
                background: C.blue,
                color: "#fff",
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                letterSpacing: "0.06em",
                transition: "transform .15s,box-shadow .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(59,130,246,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              Start — Free Audit
            </Link>
            <p style={{ fontSize: "0.72rem", color: C.muted, marginTop: 14 }}>
              Free AI visibility audit · No credit card required
            </p>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────── */}
        <section className="relative z-[2] px-6 md:px-12 py-24" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2
            className="text-center"
            style={{
              fontFamily: "'Instrument Serif',serif",
              fontWeight: 400,
              fontSize: "clamp(1.6rem,3vw,2.4rem)",
              letterSpacing: "-0.02em",
              color: C.paper,
              marginBottom: 48,
            }}
          >
            Frequently asked <em style={{ color: C.blue }}>questions</em>
          </h2>
          <div
            style={{
              maxWidth: 640,
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              background: C.border,
            }}
          >
            {FAQS.map((faq, i) => (
              <div key={i} style={{ background: C.white }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "18px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "'Outfit',sans-serif",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    color: C.paper,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: C.blue, marginLeft: 12, flexShrink: 0 }}>
                    {openFaq === i ? "−" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    style={{ padding: "0 24px 18px", fontSize: "0.82rem", lineHeight: 1.8, color: C.mid }}
                  >
                    {faq.a}
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────── */}
        <section className="relative z-[2] py-40 px-6 text-center overflow-hidden" style={{ background: C.bg }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 600,
              height: 600,
              background: "radial-gradient(circle,rgba(59,130,246,0.07),transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              fontFamily: "'Instrument Serif',serif",
              fontWeight: 400,
              fontSize: "clamp(2.2rem,5vw,4.5rem)",
              letterSpacing: "-0.025em",
              lineHeight: 1.06,
              color: C.paper,
              marginBottom: 18,
              position: "relative",
            }}
          >
            Your competitors
            <br />
            <em style={{ color: C.blue }}>are already there.</em>
          </motion.h2>
          <p
            style={{
              fontSize: "0.9rem",
              color: C.mid,
              maxWidth: 420,
              margin: "0 auto 40px",
              lineHeight: 1.8,
              position: "relative",
            }}
          >
            Every day without AutoPilotGeo is a day where ChatGPT recommends someone else to your potential customers.
          </p>
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "16px 40px",
              background: C.blue,
              color: "#fff",
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              letterSpacing: "0.04em",
              position: "relative",
              transition: "transform .15s,box-shadow .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 20px 60px rgba(59,130,246,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = "";
            }}
          >
            Start Now <ArrowRight size={16} />
          </Link>
        </section>

        {/* ── FOOTER ─────────────────────────────────────── */}
        <footer style={{ background: "#07061a", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Main grid */}
          <div className="container px-6 md:px-12" style={{ paddingTop: 56, paddingBottom: 40 }}>
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-10"
              style={{ paddingBottom: 44, borderBottom: "1px solid rgba(255,255,255,0.07)" }}
            >
              {/* Brand column */}
              <div className="col-span-2 md:col-span-1">
                <div
                  style={{
                    fontFamily: "'Instrument Serif',serif",
                    fontSize: "1.25rem",
                    color: "#fff",
                    marginBottom: 12,
                  }}
                >
                  AutoPilot<span style={{ color: C.blue }}>Geo</span>
                </div>
                <p
                  style={{
                    fontFamily: "'Outfit',sans-serif",
                    fontSize: "0.8rem",
                    color: "rgba(255,255,255,0.35)",
                    lineHeight: 1.75,
                    maxWidth: 190,
                    marginBottom: 22,
                  }}
                >
                  Get your business recommended by ChatGPT, Gemini & Google.
                </p>
                {/* Social icons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    {
                      href: "https://twitter.com/autopilotgeo",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,255,255,0.55)">
                          <path d="M11.07 1.5h1.95L8.72 6.25 14 12.5H9.5L6.17 8.38 2.4 12.5H.44l4.6-5.07L0 1.5h4.6l3.03 3.85L11.07 1.5zm-.68 9.9h1.08L3.67 2.52H2.5l7.89 8.88z" />
                        </svg>
                      ),
                    },
                    {
                      href: "https://linkedin.com/company/autopilotgeo",
                      icon: (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,255,255,0.55)">
                          <path d="M1.5 4.5H3.5V12.5H1.5V4.5ZM2.5 1.5a1 1 0 110 2 1 1 0 010-2zM5 4.5h2v1.1C7.35 4.9 8.1 4.25 9.25 4.25c2.15 0 2.55 1.4 2.55 3.25v5H9.8V7.9c0-.8 0-1.85-1.15-1.85S7.3 6.95 7.3 7.85V12.5H5.3V4.5H5z" />
                        </svg>
                      ),
                    },
                  ].map((s, i) => (
                    <a
                      key={i}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        background: "rgba(255,255,255,0.07)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "background .15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(FOOTER_LINKS).map(([section, links]) => (
                <div key={section}>
                  <p
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.28)",
                      marginBottom: 16,
                    }}
                  >
                    {section}
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: 9,
                    }}
                  >
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          style={{
                            fontFamily: "'Outfit',sans-serif",
                            fontSize: "0.82rem",
                            color: "rgba(255,255,255,0.42)",
                            textDecoration: "none",
                            transition: "color .15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.42)")}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div
              style={{
                paddingTop: 20,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: "0.75rem", color: "rgba(255,255,255,0.22)" }}>
                © 2025 AutoPilotGeo, Inc. All rights reserved.
              </p>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  ["Privacy", "/privacy"],
                  ["Terms", "/terms"],
                  ["Cookies", "/cookies"],
                ].map(([n, h]) => (
                  <Link
                    key={h}
                    href={h}
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.22)",
                      textDecoration: "none",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}
                  >
                    {n}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>

        {/* Sticky mobile CTA */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3"
          style={{
            background: C.white,
            borderTop: `1px solid ${C.border}`,
            boxShadow: "0 -4px 20px rgba(13,12,31,0.08)",
          }}
        >
          <Link
            href="/onboarding"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "13px",
              background: C.blue,
              color: "#fff",
              borderRadius: 9,
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 600,
              fontSize: "0.88rem",
              textDecoration: "none",
            }}
          >
            Get free AI score <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes scanline     { from{transform:translateY(-100%)} to{transform:translateY(100vh)} }
        @keyframes ticker       { from{transform:translateX(0)}      to{transform:translateX(-50%)} }
        @keyframes pulse-signal { 0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.35)} 50%{box-shadow:0 0 0 8px rgba(59,130,246,0)} }
        @keyframes blink        { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </>
  );
}
