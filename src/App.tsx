"use client";

import { Helmet } from "react-helmet-async";

export default function App() {
  return (
    <>
      <Helmet>
        <title>AutoPilot Geo – Get Your Business Recommended by ChatGPT & Google</title>
        <meta
          name="description"
          content="Get your business recommended by ChatGPT, Gemini, Perplexity & Google. AI-powered AEO, GEO & SEO automation. Start free. Works for any industry."
        />
        <link rel="canonical" href="https://autopilotgeo.com/" />
        <meta property="og:title" content="AutoPilot Geo – Get Your Business Recommended by ChatGPT & Google" />
        <meta
          property="og:description"
          content="Automatically publish expert content that makes AI search engines recommend you — not your competitors. Works for any industry."
        />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <a href="/" className="text-lg font-semibold tracking-tight text-foreground">
              AutoPilot Geo
            </a>
            <nav className="flex items-center gap-3 text-sm">
              <a href="/pricing" className="text-muted-foreground transition-colors hover:text-foreground">
                Pricing
              </a>
              <a href="/blog" className="text-muted-foreground transition-colors hover:text-foreground">
                Blog
              </a>
              <a href="/auth" className="text-muted-foreground transition-colors hover:text-foreground">
                Log in
              </a>
              <a
                href="/onboarding"
                className="rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start Free Audit
              </a>
            </nav>
          </div>
        </header>

        <main>
          <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="max-w-4xl">
              <p className="mb-6 inline-flex rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                500+ businesses growing with AI search
              </p>
              <h1 className="text-balance text-5xl font-black tracking-tight sm:text-6xl md:text-7xl">
                Get your business recommended by <span className="text-primary">ChatGPT</span> &{" "}
                <span className="text-primary">Google</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                Automatically publish expert content that makes AI search engines recommend you — not your
                competitors. Works for any industry.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Get your free AI score
                </a>
                <a
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 text-base font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  See pricing
                </a>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["4.5x", "More AI visibility"],
                  ["9.7x", "More brand mentions"],
                  ["60%", "Traffic increase avg"],
                  ["$29/mo", "All-in pricing"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-border bg-card/40">
            <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
              {[
                [
                  "AI Visibility Score",
                  "See exactly how AI platforms talk about your brand and where you rank against competitors.",
                ],
                [
                  "Brand Mention Tracking",
                  "Monitor every time AI recommends your business or your competitors in real-time.",
                ],
                [
                  "Content Optimization",
                  "Get actionable insights to optimize your content for AI citation and recommendation.",
                ],
              ].map(([title, description]) => (
                <article key={title} className="rounded-3xl border border-border bg-background p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                  <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
