"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingVisibilitySection } from "@/components/landing/ShoppingVisibilitySection";
import { TrafficGrowthSection } from "@/components/landing/TrafficGrowthSection";
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

/* ─── Design tokens ──────────────────────────────────────── */
const T = {
  bg: "#f9f8f5",
  white: "#ffffff",
  ink: "#0c0b14",
  mid: "#5a5970",
  muted: "#9997ab",
  blue: "#2563eb",
  blueLight: "#eff4ff",
  blueBorder: "rgba(37,99,235,0.15)",
  border: "rgba(12,11,20,0.08)",
  borderMid: "rgba(12,11,20,0.12)",
  orange: "#ea580c",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  redBg: "#fff5f5",
  red: "#dc2626",
};

/* ─── Fonts (injected once) ───────────────────────────────── */
const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap";

/* ─── Data ────────────────────────────────────────────────── */
const aiPlatforms = [
  { name: "ChatGPT", logo: chatgptIcon, color: "#10a37f" },
  { name: "Gemini", logo: geminiLogo, color: "#4285f4" },
  { name: "Perplexity", logo: perplexityLogo, color: "#6366f1" },
  { name: "Claude", logo: claudeLogo, color: "#cc785c" },
];

const socialProofPills = [
  { initial: "M", name: "Mike", role: "Roofing", result: "+180% impressions" },
  { initial: "A", name: "Amanda", role: "E-shop", result: "Page 1 in 8 weeks" },
  { initial: "R", name: "Ryan", role: "Agency", result: "–$1,200/mo in tools" },
];

const beforeItems = [
  "AI never mentions your brand",
  "Competitors get cited instead",
  "Content takes weeks to write",
  "Stuck on page 3 of Google",
];

const afterItems = [
  "ChatGPT recommends your brand",
  "30 expert articles/month, auto",
  "Auto-published to your CMS",
  "+60% avg traffic in 3 months",
];

const heroStats = [
  { value: "4.5×", label: "More AI visibility" },
  { value: "9.7×", label: "More brand mentions" },
  { value: "+60%", label: "Traffic increase avg" },
  { value: "$29/mo", label: "All-in pricing" },
];

/* Icons as refined SVG paths — no amateur lucide squares */
const FeatureIcons = {
  eye: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M10 4C5.5 4 2 10 2 10s3.5 6 8 6 8-6 8-6-3.5-6-8-6z"
        stroke={T.blue}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke={T.blue} strokeWidth="1.5" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="3" y="11" width="3" height="6" rx="1" fill={T.blue} opacity=".3" />
      <rect x="8.5" y="7" width="3" height="10" rx="1" fill={T.blue} opacity=".6" />
      <rect x="14" y="3" width="3" height="14" rx="1" fill={T.blue} />
    </svg>
  ),
  target: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke={T.blue} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="4.5" stroke={T.blue} strokeWidth="1.5" opacity=".5" />
      <circle cx="10" cy="10" r="2" fill={T.blue} />
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="5.5" stroke={T.blue} strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  file: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M6 2h6l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke={T.blue}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 2v4h4M7 10h6M7 13h4" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.5" stroke={T.blue} strokeWidth="1.5" />
      <path
        d="M10 2.5C10 2.5 7 6 7 10s3 7.5 3 7.5M10 2.5c0 0 3 3.5 3 7.5s-3 7.5-3 7.5M2.5 10h15"
        stroke={T.blue}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  trend: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M2 14l5-5 4 3 5-6" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 6h3v3" stroke={T.blue} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const featureCards = [
  {
    icon: FeatureIcons.eye,
    title: "AI Visibility Score",
    description: "See exactly how AI platforms talk about your brand and where you rank vs. competitors.",
  },
  {
    icon: FeatureIcons.chart,
    title: "Brand Mention Tracking",
    description: "Monitor every time AI recommends your business or your competitors — in real-time.",
  },
  {
    icon: FeatureIcons.target,
    title: "Content Optimization",
    description: "Actionable insights to optimise your content for AI citation and recommendation.",
  },
];

const showcaseFeatures = [
  {
    tag: "MONITOR",
    title: "Track your visibility across all AI platforms",
    description: "Real-time monitoring of how ChatGPT, Gemini, Perplexity and Claude mention your brand.",
  },
  {
    tag: "OPTIMISE",
    title: "AI-powered content that gets you cited",
    description: "Generate expert articles designed to be recommended by AI search engines.",
  },
  {
    tag: "GROW",
    title: "Automated publishing & SEO",
    description: "1 article per day, auto-published to your CMS with full SEO optimisation.",
  },
];

const bottomFeatures = [
  {
    icon: FeatureIcons.search,
    title: "Keyword Research",
    description: "AI-powered keyword discovery based on your competitors and market.",
  },
  {
    icon: FeatureIcons.file,
    title: "Content Generation",
    description: "Expert-level articles optimised for both Google and AI engines.",
  },
  {
    icon: FeatureIcons.globe,
    title: "Auto-Publishing",
    description: "Direct integration with WordPress, Shopify, Wix, and more.",
  },
  {
    icon: FeatureIcons.trend,
    title: "Performance Analytics",
    description: "Track your growth across Google Search Console and AI platforms.",
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
    answer: "Yes, proven in 50+ industries including healthcare, legal, e-commerce, SaaS, and local services.",
  },
  {
    question: "Is the content actually good?",
    answer:
      "Every article: 1,500+ words, expert-level, with sources and infographics. Google cares about quality, not who wrote it.",
  },
];

/* ─── Footer data ─────────────────────────────────────────── */
const footerLinks = {
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

/* ─── Shared style helpers ───────────────────────────────── */
const heading = (size = "2.8rem"): React.CSSProperties => ({
  fontFamily: "'Instrument Serif', serif",
  fontWeight: 400,
  fontSize: `clamp(1.9rem, 4vw, ${size})`,
  letterSpacing: "-0.025em",
  lineHeight: 1.12,
  color: T.ink,
});

const body: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 400,
  color: T.mid,
  lineHeight: 1.7,
};

const label: React.CSSProperties = {
  fontFamily: "'Outfit', sans-serif",
  fontWeight: 600,
  fontSize: "0.68rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: T.blue,
};

/* ─── Component ───────────────────────────────────────────── */
export default function Index() {
  const [activeTestimonialPlatform, setActiveTestimonialPlatform] = useState(0);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

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
        <link href={FONTS_URL} rel="stylesheet" />
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
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          })}
        />
      </Helmet>

      <div style={{ background: T.bg, fontFamily: "'Outfit', sans-serif", minHeight: "100vh" }}>
        <GoogleOneTap />
        <InactivityPopup inactivityDelay={45} />

        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav
          style={{
            position: "fixed",
            top: 0,
            zIndex: 50,
            width: "100%",
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div className="container flex items-center justify-between px-4" style={{ height: 64 }}>
            <Link href="/">
              <AnimatedLogo size="md" />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {[
                ["Pricing", "/pricing"],
                ["Blog", "/blog"],
                ["About", "/about"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    ...body,
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    padding: "6px 14px",
                    borderRadius: 8,
                    color: T.mid,
                    textDecoration: "none",
                    transition: "color .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = T.ink)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = T.mid)}
                >
                  {label}
                </Link>
              ))}
              <Link
                href="/auth"
                style={{
                  ...body,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  padding: "6px 14px",
                  borderRadius: 8,
                  color: T.mid,
                  textDecoration: "none",
                  marginLeft: 4,
                }}
              >
                Log in
              </Link>
              <Link
                href="/onboarding"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 20px",
                  background: T.ink,
                  color: "#fff",
                  borderRadius: 10,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  textDecoration: "none",
                  marginLeft: 8,
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1e1c36")}
                onMouseLeave={(e) => (e.currentTarget.style.background = T.ink)}
              >
                Start Free Audit <ArrowRight size={14} />
              </Link>
            </div>

            <div className="flex md:hidden items-center gap-2">
              <Link
                href="/auth"
                style={{
                  ...body,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: T.mid,
                  textDecoration: "none",
                  padding: "6px 12px",
                }}
              >
                Log in
              </Link>
              <Link
                href="/onboarding"
                style={{
                  padding: "8px 16px",
                  background: T.ink,
                  color: "#fff",
                  borderRadius: 8,
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  textDecoration: "none",
                }}
              >
                Start Free
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section
          style={{
            paddingTop: "7rem",
            paddingBottom: "5rem",
            background: `linear-gradient(180deg, #fff 0%, ${T.bg} 100%)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Soft blue glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(37,99,235,0.05) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />

          <div className="container relative px-4">
            <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: T.white,
                  border: `1px solid ${T.border}`,
                  borderRadius: 99,
                  padding: "7px 16px",
                  fontSize: "0.8rem",
                  color: T.mid,
                  marginBottom: 28,
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: T.green,
                    animation: "pulse-dot 2s infinite",
                    flexShrink: 0,
                  }}
                />
                500+ businesses growing with AI search
              </motion.div>

              {/* H1 */}
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.08 }}
                style={{ ...heading("4.8rem"), marginBottom: 20 }}
              >
                Get your business
                <br />
                recommended by <span style={{ color: T.blue, fontStyle: "italic" }}>ChatGPT</span>
                {" & "}
                <span style={{ color: T.blue, fontStyle: "italic" }}>Google</span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16 }}
                style={{ ...body, fontSize: "1.1rem", maxWidth: 520, margin: "0 auto 36px", color: T.mid }}
              >
                Automatically publish expert content that makes AI search engines recommend{" "}
                <strong style={{ color: T.ink, fontWeight: 600 }}>you</strong> — not your competitors. Works for any
                industry.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
                style={{ marginBottom: 14 }}
              >
                <Link
                  href="/onboarding"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "14px 32px",
                    background: T.ink,
                    color: "#fff",
                    borderRadius: 12,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                    textDecoration: "none",
                    boxShadow: "0 4px 20px rgba(12,11,20,0.18)",
                    transition: "transform .15s, box-shadow .15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 28px rgba(12,11,20,0.22)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(12,11,20,0.18)";
                  }}
                >
                  Get your free AI score <ArrowRight size={16} />
                </Link>
                <button
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  style={{
                    padding: "14px 28px",
                    background: T.white,
                    color: T.ink,
                    border: `1px solid ${T.borderMid}`,
                    borderRadius: 12,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: "1rem",
                    cursor: "pointer",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.bg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = T.white)}
                >
                  See how it works
                </button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                style={{ ...body, fontSize: "0.8rem", color: T.muted, marginBottom: 44 }}
              >
                No credit card · Results in <strong style={{ color: T.mid, fontWeight: 600 }}>30 seconds</strong> ·
                Cancel anytime
              </motion.p>

              {/* Social proof pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
                style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 44 }}
              >
                {socialProofPills.map((p, i) => (
                  <div
                    key={i}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      background: T.white,
                      border: `1px solid ${T.border}`,
                      borderRadius: 99,
                      padding: "8px 16px",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "0.82rem",
                      color: T.mid,
                      boxShadow: "0 1px 4px rgba(12,11,20,0.06)",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: T.blueLight,
                        color: T.blue,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        flexShrink: 0,
                      }}
                    >
                      {p.initial}
                    </div>
                    <span>
                      {p.name} · {p.role} · <strong style={{ color: T.ink, fontWeight: 600 }}>{p.result}</strong>
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Before / After */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto"
                style={{ marginBottom: 44 }}
              >
                {/* Without */}
                <div
                  style={{
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    padding: "22px 24px",
                    textAlign: "left",
                  }}
                >
                  <p style={{ ...label, color: T.red, marginBottom: 16 }}>✕ Without AutoPilot Geo</p>
                  {beforeItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: T.redBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <X size={11} color={T.red} />
                      </div>
                      <span style={{ ...body, fontSize: "0.85rem", color: T.mid }}>{item}</span>
                    </div>
                  ))}
                </div>
                {/* With */}
                <div
                  style={{
                    background: T.white,
                    border: `1px solid ${T.blueBorder}`,
                    borderRadius: 16,
                    padding: "22px 24px",
                    textAlign: "left",
                  }}
                >
                  <p style={{ ...label, color: T.green, marginBottom: 16 }}>✓ With AutoPilot Geo</p>
                  {afterItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          background: T.greenBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 2,
                        }}
                      >
                        <Check size={11} color={T.green} />
                      </div>
                      <span style={{ ...body, fontSize: "0.85rem", color: T.ink, fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto"
                style={{ marginBottom: 44 }}
              >
                {heroStats.map((s, i) => (
                  <div
                    key={i}
                    style={{
                      background: T.white,
                      border: `1px solid ${T.border}`,
                      borderRadius: 14,
                      padding: "18px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Instrument Serif', serif",
                        fontSize: "1.9rem",
                        color: T.ink,
                        lineHeight: 1,
                        marginBottom: 4,
                      }}
                    >
                      {s.value}
                    </div>
                    <p style={{ ...body, fontSize: "0.72rem", color: T.muted, marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* AI platform pills */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.58 }}>
                <p
                  style={{
                    ...body,
                    fontSize: "0.7rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: T.muted,
                    marginBottom: 12,
                  }}
                >
                  Optimizes your presence on
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {aiPlatforms.map((p) => (
                    <div
                      key={p.name}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: T.white,
                        border: `1px solid ${T.border}`,
                        borderRadius: 99,
                        padding: "8px 16px",
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: "0.82rem",
                        color: T.mid,
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                      {p.name}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <ShoppingVisibilitySection />
        <TrafficGrowthSection />

        {/* ── AI PLATFORM LOGOS ─────────────────────────────────── */}
        <section style={{ padding: "48px 0", borderBottom: `1px solid ${T.border}`, background: T.white }}>
          <div className="container px-4">
            <p
              style={{
                ...body,
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: T.muted,
                textAlign: "center",
                marginBottom: 28,
              }}
            >
              Optimise your presence across all major AI platforms
            </p>
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(24px, 5vw, 56px)" }}
            >
              {aiPlatforms.map((p) => (
                <div
                  key={p.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    opacity: 0.45,
                    transition: "opacity .2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
                >
                  <img
                    src={typeof p.logo === "string" ? p.logo : p.logo.src}
                    alt={p.name}
                    style={{ height: 28, width: "auto", objectFit: "contain" }}
                  />
                  <span className="hidden md:inline" style={{ ...body, fontSize: "0.875rem", fontWeight: 500 }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────────────── */}
        <section style={{ padding: "80px 0", background: T.white }}>
          <div className="container px-4">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <h2 style={heading("3rem")}>
                AI search is the new <em style={{ color: T.blue }}>growth channel</em>
              </h2>
              <p style={{ ...body, fontSize: "1rem", maxWidth: 440, margin: "12px auto 0" }}>
                Businesses that show up in AI answers get more clicks, more trust, more customers.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
              {[
                { value: "4.5×", label: "More AI visibility" },
                { value: "9.7×", label: "More brand mentions" },
                { value: "60%", label: "Traffic increase avg" },
                { value: "1.5bn", label: "AI searches monthly" },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    textAlign: "center",
                    background: T.bg,
                    border: `1px solid ${T.border}`,
                    borderRadius: 16,
                    padding: "28px 16px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Instrument Serif', serif",
                      fontSize: "clamp(2rem, 4vw, 3rem)",
                      color: T.ink,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <p style={{ ...body, fontSize: "0.8rem", marginTop: 8 }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────────── */}
        <section id="features" style={{ padding: "80px 0", background: T.bg }}>
          <div className="container px-4">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={label}>What you get</p>
              <h2 style={{ ...heading("2.8rem"), marginTop: 10 }}>
                Understand how AI talks about <em style={{ color: T.blue }}>your brand</em>
              </h2>
              <p style={{ ...body, fontSize: "1rem", maxWidth: 480, margin: "12px auto 0" }}>
                Monitor and optimise your brand's presence across every major AI platform.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {featureCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  style={{
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    borderRadius: 18,
                    padding: "28px 28px 24px",
                    transition: "box-shadow .2s, transform .2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(12,11,20,0.1)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "";
                    e.currentTarget.style.transform = "";
                  }}
                >
                  {/* Refined icon container — no colored square */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: T.blueLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 20,
                    }}
                  >
                    {card.icon}
                  </div>
                  <h3
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      fontSize: "1rem",
                      color: T.ink,
                      marginBottom: 10,
                    }}
                  >
                    {card.title}
                  </h3>
                  <p style={{ ...body, fontSize: "0.875rem" }}>{card.description}</p>
                  {/* Mini chart */}
                  <div
                    style={{
                      marginTop: 20,
                      borderRadius: 10,
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      padding: "12px 14px",
                      height: 72,
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 3,
                    }}
                  >
                    {Array.from({ length: 8 }).map((_, j) => (
                      <div
                        key={j}
                        style={{
                          flex: 1,
                          borderRadius: "3px 3px 0 0",
                          background: T.blue,
                          height: `${22 + (j + 1) * 9}%`,
                          opacity: 0.18 + j * 0.1,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 0", background: T.white }}>
          <div className="container px-4">
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <p style={label}>Social proof</p>
              <h2 style={{ ...heading("2.6rem"), marginTop: 10 }}>
                What people say about <em style={{ color: T.blue }}>AutoPilot Geo</em>
              </h2>
              <p style={{ ...body, fontSize: "1rem", maxWidth: 400, margin: "12px auto 0" }}>
                Join 500+ businesses already growing with AI search optimisation.
              </p>
            </div>

            {/* Platform tabs */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 36 }}>
              {["Trustpilot", "G2"].map((name, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonialPlatform(i)}
                  style={{
                    padding: "8px 20px",
                    borderRadius: 99,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    border: "none",
                    transition: "background .15s, color .15s",
                    background: activeTestimonialPlatform === i ? T.ink : T.bg,
                    color: activeTestimonialPlatform === i ? "#fff" : T.mid,
                  }}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {testimonials[activeTestimonialPlatform].reviews.map((review, i) => (
                <motion.div
                  key={`${activeTestimonialPlatform}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px" }}
                >
                  {/* Stars */}
                  <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <svg key={j} width="14" height="14" viewBox="0 0 14 14" fill="#f59e0b">
                        <path d="M7 1l1.5 4h4l-3.3 2.4 1.3 4L7 9l-3.5 2.4 1.3-4L1.5 5h4z" />
                      </svg>
                    ))}
                  </div>
                  <p style={{ ...body, fontSize: "0.875rem", color: T.mid, marginBottom: 20 }}>"{review.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: T.ink,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        flexShrink: 0,
                      }}
                    >
                      {review.name[0]}
                    </div>
                    <div>
                      <p
                        style={{
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          color: T.ink,
                          margin: 0,
                        }}
                      >
                        {review.name}
                      </p>
                      <p style={{ ...body, fontSize: "0.75rem", color: T.muted, margin: 0 }}>{review.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SHOWCASE ──────────────────────────────────────────── */}
        <section style={{ padding: "80px 0", background: T.bg }}>
          <div className="container px-4">
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <p style={label}>How it works</p>
              <h2 style={{ ...heading("2.8rem"), marginTop: 10 }}>
                Turn AI search into a <em style={{ color: T.blue }}>growth channel</em>
              </h2>
              <p style={{ ...body, fontSize: "1rem", maxWidth: 480, margin: "12px auto 0" }}>
                Track, optimise, and grow your presence in AI-powered search results.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto" style={{ marginBottom: 40 }}>
              {showcaseFeatures.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}
                >
                  {/* Top panel */}
                  <div style={{ height: 140, background: T.ink, padding: 20, display: "flex", alignItems: "flex-end" }}>
                    <div
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          height: 8,
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: 4,
                          width: "70%",
                          marginBottom: 6,
                        }}
                      />
                      <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, width: "45%" }} />
                    </div>
                  </div>
                  <div style={{ padding: 22 }}>
                    <p style={{ ...label, marginBottom: 8 }}>{f.tag}</p>
                    <h3
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                        fontSize: "0.975rem",
                        color: T.ink,
                        marginBottom: 8,
                        lineHeight: 1.4,
                      }}
                    >
                      {f.title}
                    </h3>
                    <p style={{ ...body, fontSize: "0.83rem" }}>{f.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {bottomFeatures.map((f, i) => (
                <div
                  key={i}
                  style={{
                    background: T.white,
                    border: `1px solid ${T.border}`,
                    borderRadius: 14,
                    padding: "22px 18px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: T.blueLight,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 14px",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h4
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      color: T.ink,
                      marginBottom: 6,
                    }}
                  >
                    {f.title}
                  </h4>
                  <p style={{ ...body, fontSize: "0.75rem" }}>{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section style={{ padding: "80px 0", background: T.white }}>
          <div className="container px-4">
            <h2 style={{ ...heading("2.4rem"), textAlign: "center", marginBottom: 48 }}>
              Frequently asked <em style={{ color: T.blue }}>questions</em>
            </h2>
            <div style={{ maxWidth: 640, margin: "0 auto" }}>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    style={{
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 12,
                      padding: "0 20px",
                      overflow: "hidden",
                    }}
                  >
                    <AccordionTrigger
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 500,
                        fontSize: "0.95rem",
                        color: T.ink,
                        textAlign: "left",
                        paddingTop: 18,
                        paddingBottom: 18,
                      }}
                      className="hover:no-underline"
                    >
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent style={{ ...body, fontSize: "0.875rem", paddingBottom: 16 }}>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ── DARK CTA ──────────────────────────────────────────── */}
        <section style={{ background: T.ink, padding: "88px 0", position: "relative", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: 600,
              height: 600,
              background: "radial-gradient(circle, rgba(37,99,235,0.14) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div className="container relative px-4">
            <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
              <div>
                <h2
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontWeight: 400,
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    color: "#fff",
                    lineHeight: 1.12,
                    letterSpacing: "-0.025em",
                    marginBottom: 20,
                  }}
                >
                  Buyers ask AI which brand to choose.
                </h2>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                    marginBottom: 32,
                  }}
                >
                  Make sure it's yours. Get discovered in ChatGPT, Gemini, Perplexity and Google today.
                </p>
                <Link
                  href="/onboarding"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "14px 28px",
                    background: "#fff",
                    color: T.ink,
                    borderRadius: 12,
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                    textDecoration: "none",
                    transition: "background .15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f0eff8")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                >
                  Start for free <ArrowRight size={16} />
                </Link>
              </div>

              {/* Chat mockup */}
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 18,
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 12l4-4 3 2.5L13 5"
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    style={{ fontFamily: "'Outfit', sans-serif", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}
                  >
                    AI Assistant
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "rgba(255,255,255,0.1)",
                        color: "#fff",
                        borderRadius: "14px 14px 4px 14px",
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: "0.875rem",
                        maxWidth: "80%",
                      }}
                    >
                      What's the best SEO tool for small businesses?
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "rgba(255,255,255,0.05)",
                        color: "rgba(255,255,255,0.7)",
                        borderRadius: "14px 14px 14px 4px",
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: "0.875rem",
                        maxWidth: "90%",
                        lineHeight: 1.6,
                      }}
                    >
                      Based on recent data, I'd recommend <strong style={{ color: "#fff" }}>your-brand.com</strong> —
                      they specialise in AI-optimised content with strong results for small businesses.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────── */}
        <section style={{ background: "#090818", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "72px 0" }}>
          <div className="container px-4" style={{ textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "'Instrument Serif', serif",
                fontWeight: 400,
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                color: "#fff",
                letterSpacing: "-0.025em",
                marginBottom: 14,
              }}
            >
              Be visible, today.
            </h2>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "rgba(255,255,255,0.4)",
                fontSize: "1rem",
                maxWidth: 360,
                margin: "0 auto 32px",
                lineHeight: 1.7,
              }}
            >
              Start your free trial and get your brand recommended by AI search engines.
            </p>
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "15px 32px",
                background: "#fff",
                color: T.ink,
                borderRadius: 12,
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                transition: "background .15s, transform .15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0eff8";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "";
              }}
            >
              Get started — it's free <ArrowRight size={16} />
            </Link>
            <p
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "rgba(255,255,255,0.25)",
                fontSize: "0.8rem",
                marginTop: 14,
              }}
            >
              No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer
          style={{ background: "#060515", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "64px 0 32px" }}
        >
          <div className="container px-4">
            {/* Top row */}
            <div
              className="grid grid-cols-2 md:grid-cols-5 gap-10"
              style={{ paddingBottom: 48, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              {/* Brand */}
              <div className="col-span-2 md:col-span-1">
                <div
                  style={{
                    fontFamily: "'Instrument Serif', serif",
                    fontSize: "1.3rem",
                    color: "#fff",
                    marginBottom: 12,
                  }}
                >
                  AutoPilot<span style={{ color: T.blue }}>Geo</span>
                </div>
                <p
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: "0.82rem",
                    color: "rgba(255,255,255,0.35)",
                    lineHeight: 1.7,
                    maxWidth: 200,
                    marginBottom: 20,
                  }}
                >
                  Get your business recommended by ChatGPT, Gemini & Google.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  {/* Twitter/X */}
                  <a
                    href="https://twitter.com/autopilotgeo"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,255,255,0.6)">
                      <path d="M11.07 1.5h1.95L8.72 6.25 14 12.5H9.5L6.17 8.38 2.4 12.5H.44l4.6-5.07L0 1.5h4.6l3.03 3.85L11.07 1.5zm-.68 9.9h1.08L3.67 2.52H2.5l7.89 8.88z" />
                    </svg>
                  </a>
                  {/* LinkedIn */}
                  <a
                    href="https://linkedin.com/company/autopilotgeo"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.07)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "background .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="rgba(255,255,255,0.6)">
                      <path d="M1.5 4.5H3.5V12.5H1.5V4.5ZM2.5 3.5C1.95 3.5 1.5 3.05 1.5 2.5C1.5 1.95 1.95 1.5 2.5 1.5C3.05 1.5 3.5 1.95 3.5 2.5C3.5 3.05 3.05 3.5 2.5 3.5ZM5 4.5H7V5.5H7.05C7.35 4.9 8.1 4.25 9.25 4.25C11.4 4.25 11.8 5.65 11.8 7.5V12.5H9.8V7.9C9.8 7.1 9.8 6.05 8.65 6.05C7.5 6.05 7.3 6.95 7.3 7.85V12.5H5.3V4.5H5Z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Link columns */}
              {Object.entries(footerLinks).map(([section, links]) => (
                <div key={section}>
                  <p
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.3)",
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
                      gap: 10,
                    }}
                  >
                    {links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: "0.85rem",
                            color: "rgba(255,255,255,0.45)",
                            textDecoration: "none",
                            transition: "color .15s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div
              style={{
                paddingTop: 24,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: "0.78rem", color: "rgba(255,255,255,0.25)" }}>
                © 2025 AutoPilotGeo, Inc. All rights reserved.
              </p>
              <div style={{ display: "flex", gap: 20 }}>
                {[
                  ["Privacy", "/privacy"],
                  ["Terms", "/terms"],
                  ["Cookies", "/cookies"],
                ].map(([name, href]) => (
                  <Link
                    key={href}
                    href={href}
                    style={{
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: "0.78rem",
                      color: "rgba(255,255,255,0.25)",
                      textDecoration: "none",
                      transition: "color .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                  >
                    {name}
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
            background: T.white,
            borderTop: `1px solid ${T.border}`,
            boxShadow: "0 -4px 20px rgba(12,11,20,0.08)",
          }}
        >
          <Link
            href="/onboarding"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "13px",
              background: T.ink,
              color: "#fff",
              borderRadius: 10,
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
            }}
          >
            Get free AI score <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </>
  );
}
