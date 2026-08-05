import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrandMark } from '@/components/brand/BrandMark'
import '@/styles/landing.css'

/* ---------- inline icons (ported from the design's <symbol> defs) ---------- */
const Ic = ({ d, size = 16, sw = 1.6, circles = [] as { cx: number; cy: number; r: number }[] }) => (
  <svg className="ic-svg" viewBox="0 0 24 24" style={{ width: size, height: size, strokeWidth: sw }}>
    {circles.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
    {d && <path d={d} />}
  </svg>
)
const IcArrow = (p: { size?: number }) => <Ic d="M5 12h14M13 6l6 6-6 6" size={p.size ?? 14} sw={2} />
const IcCheck = (p: { size?: number; sw?: number }) => <Ic d="M8 12.3l2.6 2.6L16.3 9" size={p.size ?? 15} sw={p.sw ?? 1.6} circles={[{ cx: 12, cy: 12, r: 9 }]} />
const IcX = (p: { size?: number; sw?: number }) => <Ic d="M9 9l6 6M15 9l-6 6" size={p.size ?? 15} sw={p.sw ?? 1.6} circles={[{ cx: 12, cy: 12, r: 9 }]} />
const IcTarget = () => <Ic d="" circles={[{ cx: 12, cy: 12, r: 9 }, { cx: 12, cy: 12, r: 4.5 }, { cx: 12, cy: 12, r: 1 }]} size={20} />
const IcRadar = () => <Ic d="M12 12L18 7" circles={[{ cx: 12, cy: 12, r: 9 }, { cx: 12, cy: 12, r: 1.4 }]} size={20} />
const IcPen = () => <Ic d="M4 20l1-4.5L15.8 5.2a1.7 1.7 0 0 1 2.4 0l.6.6a1.7 1.7 0 0 1 0 2.4L8.5 19 4 20z" size={20} />
const IcKey = () => <Ic d="M11 12l9-9M17 6l2 2M14 9l2 2" circles={[{ cx: 8, cy: 15, r: 4 }]} size={17} />
const IcPlug = () => <Ic d="M9 3v5M15 3v5M6.5 8h11l-.7 5.5a4.8 4.8 0 0 1-4.8 4V21" size={17} />
const IcBar = () => <Ic d="M4 20V10M11 20V4M18 20v-7M2.5 20h19" size={17} />

/* ---------- live demo data (illustrative product tour, clearly framed as a demo) ---------- */
const DEMO_TABS = ['today', 'content', 'presence', 'results', 'settings'] as const
type DemoTab = typeof DEMO_TABS[number]
const TAB_LABEL: Record<DemoTab, string> = {
  today: 'Today', content: 'Content', presence: 'Presence', results: 'Results', settings: 'Settings',
}

/* UGC testimonial reel. ~80 MB, so it is never fetched until the visitor plays it. */
const UGC_VIDEO =
  'https://autopilotgeo.com/__l5e/assets-v1/f7566a0b-b5cd-40fd-a310-3ee51b25c2b6/ugc-desktop.mp4'

export default function Landing() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<DemoTab>('today')
  const [playing, setPlaying] = useState(true)
  const [hovering, setHovering] = useState(false)
  const [videoOn, setVideoOn] = useState(false)
  const [cycle, setCycle] = useState(0) // bumps to restart the story fill animation

  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const goTab = useCallback((t: DemoTab, auto = false) => {
    setTab(t)
    setCycle((c) => c + 1)
    // A manual pick hands control to the visitor: stop the carousel so the
    // panel they chose stays on screen long enough to actually read.
    if (!auto) setPlaying(false)
  }, [])

  const running = playing && !hovering && !reduceMotion

  // Autoplay: advance every 4s, matching the story-fill animation.
  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => {
      const next = DEMO_TABS[(DEMO_TABS.indexOf(tab) + 1) % DEMO_TABS.length]
      goTab(next, true)
    }, 4000)
    return () => clearTimeout(id)
  }, [tab, running, cycle, goTab])

  const startTrial = () => navigate('/onboarding')
  const openApp = () => navigate('/auth')

  const tabIndex = DEMO_TABS.indexOf(tab)

  return (
    <div className="apg-landing">
      {/* ================= NAV ================= */}
      <nav>
        <div className="nav-inner">
          <BrandMark size={32} withText />
          <div className="nav-links">
            <a href="#pricing">Pricing</a>
            <Link to="/blog">Blog</Link>
            <Link to="/auth">Log in</Link>
          </div>
          <div className="nav-cta">
            <button className="btn btn-ghost btn-sm" onClick={openApp}>Open App</button>
            <button className="btn btn-gold btn-sm" onClick={startTrial}>
              Start free trial <IcArrow size={13} />
            </button>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <header className="hero">
        <div className="wrap">
          <div className="kicker"><b>500+</b> businesses growing with AI search</div>
          <h1>
            The #1 GEO platform.<br />Grow your traffic. <span className="accent">Win generative search.</span>
          </h1>
          <p className="sub">
            AutopilotGEO is the first platform built purely for Generative Engine Optimization. We create,
            optimize and publish content that ChatGPT, Gemini, Perplexity and Google AI Overviews cite — so
            customers find you when they ask AI.
          </p>
          <div className="hero-cta">
            <button className="btn btn-gold" onClick={startTrial}>Start GEO free trial <IcArrow /></button>
            <a className="btn btn-ghost" href="#demo">See GEO in action</a>
          </div>
          <p className="fine">3-day free trial · Card required · Cancel anytime</p>

          <div className="trust-row">
            <div className="trust-item"><div className="n mono">500+</div><div className="l">active sites ranking on AI</div></div>
            <div className="trust-item"><div className="n mono">★ 4.9/5</div><div className="l">founder reviews · Excellent</div></div>
            <div className="trust-item"><div className="n mono">+60%</div><div className="l">avg traffic in 3 months</div></div>
          </div>
        </div>
      </header>

      {/* ================= WITHOUT / WITH ================= */}
      <section>
        <div className="wrap">
          <div className="compare">
            <div className="compare-card without">
              <h3><IcX /> Without AutopilotGEO</h3>
              {[
                'Your brand never appears in ChatGPT answers',
                'Competitors get cited by Gemini & Perplexity',
                'Zero presence in AI search results',
                'Traffic flat while AI search grows 40%/year',
              ].map((t) => (
                <div className="compare-row" key={t}><span className="mk"><IcX size={10} sw={2.4} /></span>{t}</div>
              ))}
            </div>
            <div className="compare-card with">
              <h3><IcCheck /> With AutopilotGEO</h3>
              {[
                'ChatGPT, Gemini & Perplexity cite your brand',
                'GEO-optimized content auto-generated daily',
                'Rank in AI Overviews and answer boxes',
                '+60% avg traffic from generative search',
              ].map((t) => (
                <div className="compare-row" key={t}><span className="mk"><IcCheck size={10} sw={2.4} /></span>{t}</div>
              ))}
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat-tile"><div className="n">4.5x</div><div className="l">More AI citations</div></div>
            <div className="stat-tile"><div className="n">9.7x</div><div className="l">More brand mentions in AI</div></div>
            <div className="stat-tile"><div className="n">60%</div><div className="l">GEO traffic increase avg</div></div>
            <div className="stat-tile"><div className="n">€9.99<span style={{ fontSize: '14px' }}>/mo</span></div><div className="l">Founding price — locked</div></div>
          </div>

          <p className="eyebrow-label" style={{ marginTop: '64px' }}>Optimizes your presence on</p>
          <div className="platform-row">
            {['Google', 'ChatGPT', 'Gemini', 'Perplexity', 'Shopping'].map((p) => (
              <span className="platform-chip" key={p}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= LIVE APP DEMO ================= */}
      <section id="demo">
        <div className="wrap">
          <p className="eyebrow-label">Live demo</p>
          <h2 className="section-title">This is the actual app — try it</h2>
          <p className="section-sub">
            No login needed. Click through the tabs the way your customers would, on day one of using
            AutopilotGEO. Figures shown are an illustrative sample.
          </p>

          <div className="demo-shell">
            <div className="browser-chrome">
              <span className="bc-dot" style={{ background: '#f0605a' }} />
              <span className="bc-dot" style={{ background: '#f2b445' }} />
              <span className="bc-dot" style={{ background: '#3fb455' }} />
              <span className="bc-url">app.autopilotgeo.com</span>
              {!reduceMotion && (
                <button
                  className="bc-play"
                  title={playing ? 'Pause' : 'Play'}
                  aria-label={playing ? 'Pause demo' : 'Play demo'}
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? '❚❚' : '▶'}
                </button>
              )}
            </div>

            <div className="story-track">
              {DEMO_TABS.map((t, i) => (
                <div className="story-seg" key={t}>
                  <span
                    key={`${t}-${cycle}`}
                    className={`story-fill${i === tabIndex && running ? ' run' : ''}`}
                    style={{ width: i < tabIndex || (i === tabIndex && !running) ? '100%' : undefined }}
                  />
                </div>
              ))}
            </div>

            <div
              className="preview-shell"
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              <div className="preview-tabs">
                {DEMO_TABS.map((t) => (
                  <button key={t} className={`preview-tab${tab === t ? ' on' : ''}`} onClick={() => goTab(t)}>
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>

              {tab === 'today' && (
                <div className="dm-panel">
                  <div className="dm-hero">
                    <div><div className="dm-hero-num">27</div><div className="dm-hero-lbl">people found your store via AI this month</div></div>
                    <div><div className="dm-hero-num">+3×</div><div className="dm-hero-lbl">visibility vs. last month</div></div>
                  </div>
                  <div className="dm-banner">
                    <strong>169 pieces of content are ready</strong> — your site isn't connected yet, so nothing publishes.
                  </div>
                  <p className="dm-subhead">Published automatically <span className="dm-pill live" style={{ marginLeft: '6px' }}>✓ 2 today</span></p>
                  <div className="p-row"><span className="p-dot" style={{ background: 'var(--green)' }} /><span style={{ flex: 1 }}>Article "Best running shoes under $150" — published at 6:02am</span></div>
                  <div className="p-row"><span className="p-dot" style={{ background: 'var(--green)' }} /><span style={{ flex: 1 }}>Answer "Do you ship internationally?" — live on Gemini &amp; Perplexity</span></div>
                  <p className="dm-subhead" style={{ marginTop: '16px' }}>Needs your input</p>
                  <div className="p-row"><span className="p-dot" style={{ background: '#c23b3b' }} /><span style={{ flex: 1 }}>Sunday hours don't match between Google and your site</span></div>
                  <div className="p-row"><span className="p-dot" style={{ background: 'var(--amber)' }} /><span style={{ flex: 1 }}>Reply to Sophie M.'s Google review (3★) — that's your voice, not ours</span></div>
                </div>
              )}

              {tab === 'content' && (
                <div className="dm-panel">
                  <div className="dm-cadence">
                    <div className="dm-cadence-ic">🔥</div>
                    <div>
                      <strong>Current pace: 1 piece of content a day</strong>
                      <span>One asset, optimized for every generative engine — ChatGPT, Gemini, Perplexity and your site — at once.</span>
                    </div>
                  </div>
                  <div className="dm-tblrow dm-head"><span>Content</span><span>Format</span><span>Where it works</span><span>Status</span></div>
                  {[
                    ['Best running shoes under $150', 'Article · GEO', 'Your site · ChatGPT', 'wait', 'Waiting'],
                    ['Do you ship internationally?', 'Answer · GEO', 'ChatGPT · Perplexity', 'live', 'Live'],
                    ['Nike Air Max 90 — product page', 'Product · GEO', 'Your site · Google', 'live', 'Live'],
                    ['Return policy explained', 'Answer · GEO', 'Your site', 'draft', 'Draft'],
                  ].map(([t, f, w, cls, lbl]) => (
                    <div className="dm-tblrow" key={t}>
                      <span>{t}</span><span className="dm-tag">{f}</span><span className="dm-tag">{w}</span>
                      <span className={`dm-pill ${cls}`}>{lbl}</span>
                    </div>
                  ))}
                  <p className="dm-subhead" style={{ marginTop: '16px' }}>History</p>
                  <div className="p-row"><span className="p-dot" style={{ background: 'var(--green)' }} /><span style={{ flex: 1 }}>Aug 4 — "Do you ship internationally?" published</span></div>
                  <div className="p-row"><span className="p-dot" style={{ background: 'var(--green)' }} /><span style={{ flex: 1 }}>Aug 3 — "Nike Air Max 90" product page published</span></div>
                </div>
              )}

              {tab === 'presence' && (
                <div className="dm-panel">
                  <p className="dm-subhead">Business listing</p>
                  <div className="dm-check"><span className="dm-check-ic ok">✓</span>Name, address and phone match everywhere</div>
                  <div className="dm-check"><span className="dm-check-ic ok">✓</span>Photos up to date</div>
                  <div className="dm-check"><span className="dm-check-ic warn">!</span>Sunday hours differ between Google and your site</div>
                  <div className="dm-check"><span className="dm-check-ic ok">✓</span>Category and description optimized</div>
                  <button className="btn btn-primary btn-sm" style={{ margin: '12px 0 20px' }} onClick={startTrial}>Fix the hours</button>
                  <p className="dm-subhead">Recent reviews <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>— 4.6 ★ from 87</span></p>
                  <div className="dm-review">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Sophie M.</span><span style={{ color: '#e0a52c' }}>★★★☆☆</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Lovely store but delivery took a while. — A suggested reply is ready</p>
                  </div>
                  <div className="dm-review">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      <span>Karim D.</span><span style={{ color: '#e0a52c' }}>★★★★★</span>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--ink-soft)' }}>Great advice, found exactly what we were looking for!</p>
                  </div>
                </div>
              )}

              {tab === 'results' && (
                <div className="dm-panel">
                  <p className="dm-subhead">Visibility by assistant</p>
                  <div className="p-gauges">
                    {[['ChatGPT', 95, '#1f8a5f'], ['Gemini', 89, '#2e3a8c'], ['Perplexity', 82, '#4a58c9']].map(([n, v, c]) => (
                      <div className="p-gauge" key={n as string}>
                        <div className="p-ring" style={{ background: `conic-gradient(${c} 0% ${v}%, #eceefa ${v}% 100%)` }}><span>{v}%</span></div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{n}</div>
                          <div style={{ fontSize: '11px', color: 'var(--green)' }}>✓ Up to date</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="dm-subhead">What AI is actually saying</p>
                  <div className="prev-card-mini" style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '6px' }}>"Best running shoes under $150?"</div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55 }}>
                      I recommend the <b style={{ background: '#fff2cf', padding: '0 3px', borderRadius: '3px' }}>Nike Air Max 90</b> from your-store.com — great comfort and style, in stock with free shipping.
                    </div>
                  </div>
                  <div className="prev-card-mini">
                    <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--ink-soft)', marginBottom: '6px' }}>"Do you ship internationally?"</div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.55 }}>
                      Yes — <b style={{ background: '#fff2cf', padding: '0 3px', borderRadius: '3px' }}>your-store.com</b> ships to most countries, with delivery times shown at checkout.
                    </div>
                  </div>
                  <p className="dm-subhead" style={{ marginTop: '16px' }}>Reach over time</p>
                  <svg viewBox="0 0 500 90" width="100%" height="80">
                    <polyline points="0,78 80,70 160,58 240,44 320,28 400,14 480,6" fill="none" stroke="#2e3a8c" strokeWidth="2.5" />
                  </svg>
                </div>
              )}

              {tab === 'settings' && (
                <div className="dm-panel">
                  <p className="dm-subhead">Connections</p>
                  <div className="dm-setting"><span>Website (CMS)</span><span className="dm-pill wait">Not connected</span></div>
                  <div className="dm-setting"><span>Google Business Profile</span><span className="dm-pill live">Connected</span></div>
                  <div className="dm-setting"><span>Shopify catalog</span><span className="dm-pill live">Connected — 214 products</span></div>
                  <p className="dm-subhead" style={{ marginTop: '16px' }}>Account</p>
                  <div className="dm-setting"><span>Pierre B. — pierre@sweet-deco.fr</span><button className="btn btn-ghost btn-sm" onClick={startTrial}>Edit</button></div>
                  <div className="dm-setting"><span>Plan — Growth, €49/mo</span><button className="btn btn-ghost btn-sm" onClick={startTrial}>Manage</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= WHY FOUNDERS SWITCH (UGC) ================= */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <p className="eyebrow-label">Real creators · Real results</p>
          <h2 className="section-title">Why founders switch to AutopilotGEO</h2>
          <p className="section-sub">Hear it straight from the people using it every day.</p>

          <div className="ugc">
            <div className="ugc-frame">
              {videoOn ? (
                <video
                  src={UGC_VIDEO}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  onEnded={() => setVideoOn(false)}
                />
              ) : (
                /* Facade: the 80 MB file is only fetched once the visitor clicks. */
                <button
                  className="ugc-cover"
                  onClick={() => setVideoOn(true)}
                  aria-label="Play founder testimonials video"
                >
                  <span className="ugc-play">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                  <span className="ugc-label">Founders on what changed after switching to GEO</span>
                  <span className="ugc-hint">Tap to play · sound on</span>
                </button>
              )}
            </div>
            <p className="ugc-caption">Real customers, filmed in their own words.</p>
          </div>

          <button className="btn btn-gold" style={{ marginTop: '30px' }} onClick={startTrial}>
            Start free trial <IcArrow />
          </button>
        </div>
      </section>

      {/* ================= SHOPPING VISIBILITY ================= */}
      <section>
        <div className="wrap">
          <p className="eyebrow-label">#1 AI Shopping Platform Visibility</p>
          <h2 className="section-title">Your products, everywhere AI recommends</h2>
          <p className="section-sub">Dominate Google Shopping, Rich Results, Discover feeds, and AI conversations — all on autopilot.</p>

          <div className="demo-shell" style={{ maxWidth: '560px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>GEO Shopping for Shopify</h3>
            <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', marginBottom: '20px' }}>
              Turn your Shopify store into an AI-citation machine. We import your products, detect your
              shop's language and automatically generate optimized articles that get cited by ChatGPT,
              Gemini and Perplexity — published straight to your Shopify blog.
            </p>
            {[
              '1-click OAuth install',
              'Auto-import all your products',
              "Content in your shop's language",
              'Auto-publish articles daily to your Shopify blog',
            ].map((t) => (
              <div className="compare-row" style={{ padding: '6px 0' }} key={t}>
                <span className="mk" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                  <IcCheck size={10} sw={2.4} />
                </span>{t}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <div style={{ flex: 1, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '10px', padding: '11px 14px', fontSize: '13.5px', color: 'var(--ink-soft)' }}>
                your-store<span style={{ color: 'var(--ink)' }}>.myshopify.com</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={startTrial}>Install on Shopify</button>
            </div>
            <p className="fine" style={{ marginTop: '14px' }}>Free 3-day trial · Cancel anytime · No credit card until day 4</p>
          </div>
        </div>
      </section>

      {/* ================= TRAFFIC CHART ================= */}
      <section>
        <div className="wrap">
          <div className="chart-card">
            <div className="chart-top">
              <div>
                <h3 style={{ fontSize: '16px' }}>Google Search Traffic Growth</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>Search Console impressions</p>
              </div>
              <div className="big">+500%</div>
            </div>
            <svg viewBox="0 0 900 180" width="100%" height="160">
              <line x1="0" y1="160" x2="900" y2="160" stroke="var(--line)" />
              <polyline points="0,150 150,142 300,120 450,88 600,55 750,25 900,10" fill="none" stroke="var(--green)" strokeWidth="3" />
            </svg>
            <div style={{ display: 'flex', gap: '18px', fontSize: '12px', color: 'var(--ink-soft)', marginTop: '4px' }}>
              {['M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((m) => <span key={m}>{m}</span>)}
            </div>
            <div className="before-after">
              <div className="ba-item"><div className="n">~200</div><div className="l">visits/month — before AutopilotGEO</div></div>
              <div className="ba-item"><div className="n">10K+</div><div className="l">visits/month — after 6 months</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= GEO FEATURES ================= */}
      <section>
        <div className="wrap">
          <p className="eyebrow-label">Generative search is the new growth channel</p>
          <h2 className="section-title">Understand how generative AI talks about your brand</h2>
          <p className="section-sub">Monitor and optimize your brand's presence across every major generative AI engine.</p>
          <div className="feat-3">
            {[
              [<IcTarget key="t" />, 'GEO Visibility Score', 'See exactly how visible your brand is across ChatGPT, Gemini, Perplexity and Claude — and how you rank against competitors.'],
              [<IcRadar key="r" />, 'AI Citation Tracking', 'Monitor every time AI engines recommend your business — or your competitors — in real-time generative search results.'],
              [<IcPen key="p" />, 'GEO Content Optimization', 'Get actionable insights to optimize your content for AI citation, entity recognition and generative engine ranking.'],
            ].map(([icon, title, body]) => (
              <div className="feat-card" key={title as string}>
                <div className="feat-ic">{icon as JSX.Element}</div>
                <h3>{title as string}</h3>
                <p>{body as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 3 PILLARS (dark) ================= */}
      <section
        className="pillars-section"
        style={{ background: 'var(--primary-deep)', color: '#fff', borderRadius: '24px', maxWidth: '1180px', margin: '0 20px', padding: '44px 24px' }}
      >
        <p className="eyebrow-label" style={{ color: '#a6ade4' }}>Turn generative AI into a growth channel</p>
        <h2 className="section-title" style={{ color: '#fff' }}>
          Track, optimize, and grow your citations in AI-powered search results
        </h2>
        <div className="feat-3" style={{ marginTop: '50px' }}>
          {[
            [<IcRadar key="a" />, 'Monitor your GEO presence', 'Track your visibility across all generative AI engines', 'Real-time monitoring of how ChatGPT, Gemini, Perplexity and Claude mention and cite your brand in AI search answers.'],
            [<IcTarget key="b" />, 'Optimize for AI citation', 'GEO content that AI search engines cite', 'Generate structured, authoritative content specifically designed to be recommended by generative AI search engines.'],
            [<IcPen key="c" />, 'Scale on autopilot', 'Automated GEO publishing & optimization', '1 GEO-optimized piece per day, auto-published to your CMS with full generative engine optimization.'],
          ].map(([icon, eyebrow, title, body]) => (
            <div className="feat-card" key={title as string} style={{ background: 'rgba(255,255,255,.05)', borderColor: 'rgba(255,255,255,.12)' }}>
              <div className="feat-ic" style={{ background: 'rgba(215,201,138,.15)', color: '#e9dfa8' }}>{icon as JSX.Element}</div>
              <p style={{ color: '#a6ade4', fontSize: '11.5px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                {eyebrow as string}
              </p>
              <h3 style={{ color: '#fff' }}>{title as string}</h3>
              <p style={{ color: '#b7bce8' }}>{body as string}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 4 MINI FEATURES ================= */}
      <section>
        <div className="wrap">
          <div className="feat-4">
            {[
              [<IcKey key="k" />, 'GEO Keyword Research', 'AI-powered keyword discovery targeting generative search queries and conversational intent.'],
              [<IcPen key="p" />, 'GEO Content Generation', 'Expert-level articles optimized for both Google AI Overviews and standalone generative engines.'],
              [<IcPlug key="l" />, 'Auto-Publishing', 'Direct integration with WordPress, Shopify, Wix, and more — with GEO markup included.'],
              [<IcBar key="b" />, 'GEO Analytics', 'Track your growth across Search Console, AI platform mentions and generative search visibility.'],
            ].map(([icon, title, body]) => (
              <div className="feat-mini" key={title as string}>
                <div className="feat-ic">{icon as JSX.Element}</div>
                <h3>{title as string}</h3>
                <p>{body as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PRICING ================= */}
      <section id="pricing">
        <div className="wrap">
          <p className="eyebrow-label">Pricing</p>
          <h2 className="section-title">Simple pricing, locked in early</h2>
          <p className="section-sub">Founding prices for the first 500 businesses — the rate you join at is the rate you keep.</p>

          <div className="price-grid">
            <div className="price-card">
              <h3>Starter</h3>
              <div className="was">€29/mo</div>
              <div className="amt">€9<span style={{ fontSize: '22px' }}>.99</span><span style={{ fontSize: '16px' }}>/mo</span></div>
              <div className="per">Founding price for the first 500 businesses — locked while you stay subscribed</div>
              <ul>
                {['1 GEO-optimized piece / day', '1 website connected', 'ChatGPT, Gemini, Perplexity tracking', 'Weekly presence check'].map((f) => (
                  <li key={f}><IcCheck /> {f}</li>
                ))}
              </ul>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={startTrial}>Start free trial</button>
            </div>

            <div className="price-card featured">
              <span className="tag">Most popular</span>
              <h3>Growth</h3>
              <div className="was">&nbsp;</div>
              <div className="amt">€49<span style={{ fontSize: '16px' }}>/mo</span></div>
              <div className="per">Everything a growing store needs</div>
              <ul>
                {['Everything in Starter', 'Shopping & product feed optimization', 'Google Business & review responses', 'Priority support'].map((f) => (
                  <li key={f}><IcCheck /> {f}</li>
                ))}
              </ul>
              <button className="btn btn-gold" style={{ width: '100%' }} onClick={startTrial}>Start free trial</button>
            </div>

            <div className="price-card">
              <h3>Scale</h3>
              <div className="was">&nbsp;</div>
              <div className="amt">€129<span style={{ fontSize: '16px' }}>/mo</span></div>
              <div className="per">For multi-location businesses &amp; agencies</div>
              <ul>
                {['Everything in Growth', 'Up to 5 locations / sites', 'Team seats & approvals', 'Dedicated onboarding'].map((f) => (
                  <li key={f}><IcCheck /> {f}</li>
                ))}
              </ul>
              <a className="btn btn-ghost" style={{ width: '100%' }} href="mailto:support@autopilotgeo.com">Talk to us</a>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section>
        <div className="wrap">
          <p className="eyebrow-label">FAQ</p>
          <h2 className="section-title">Frequently asked questions</h2>
          <div className="faq">
            {[
              ['What is Generative Engine Optimization (GEO)?', "GEO is the practice of structuring and publishing content so that generative AI models — ChatGPT, Gemini, Perplexity, Google AI Overviews — cite your brand when answering a user's question, instead of just ranking a link on a results page."],
              ['How is GEO different from SEO?', 'SEO optimizes for ranking in a list of links. GEO optimizes for being the answer itself — structured, factual, citation-ready content that an AI model can quote or recommend directly inside a conversation.'],
              ['Can I really cancel anytime?', "Yes. There's no lock-in contract — cancel from your account settings whenever you like."],
              ['Do I need technical skills for GEO?', 'No. Connect your site or store once, and content is generated, optimized and published on autopilot from there.'],
              ['Will GEO work for my industry?', 'GEO applies anywhere people ask AI assistants for recommendations — retail, local services, SaaS and beyond.'],
              ['Is the GEO content actually good?', 'Every piece is written to read naturally for humans first — citation-readiness for AI comes from structure and factual grounding, not keyword stuffing.'],
            ].map(([q, a], i) => (
              <details className="faq-item" key={q} open={i === 0}>
                <summary>{q}<span>+</span></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section>
        <div className="wrap">
          <div className="final-cta">
            <div style={{ position: 'absolute', top: '-90px', right: '-90px', opacity: 0.14, pointerEvents: 'none' }}>
              <BrandMark size={340} />
            </div>
            <h2>Buyers ask AI which brand to choose. Make sure it's yours.</h2>
            <p>Get cited by ChatGPT, Gemini, Perplexity and Google AI Overviews today.</p>
            <button className="btn btn-gold" onClick={startTrial}>Start GEO free trial <IcArrow /></button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-col">
              <BrandMark size={32} withText />
              <p className="desc">
                The #1 Answer &amp; Generative Engine Optimization platform. Get cited by ChatGPT, Gemini,
                and AI assistants.
              </p>
              <p className="desc" style={{ marginTop: '10px' }}>AutopilotGEO Ltd · support@autopilotgeo.com</p>
            </div>
            <div className="foot-col">
              <h4>Product</h4>
              <Link to="/blog">Blog</Link>
              <Link to="/local">Local AEO</Link>
              <a href="#pricing">Pricing</a>
              <Link to="/auth">Login</Link>
            </div>
            <div className="foot-col">
              <h4>Company</h4>
              <Link to="/about">About us</Link>
              <Link to="/terms">Terms of service</Link>
              <Link to="/privacy">Privacy policy</Link>
              <a href="mailto:support@autopilotgeo.com">Contact</a>
            </div>
            <div className="foot-col">
              <h4>Trust &amp; Security</h4>
              <span style={{ display: 'block', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '11px' }}>Secure payment — powered by Stripe</span>
              <span style={{ display: 'block', fontSize: '14px', color: 'var(--ink-soft)', marginBottom: '11px' }}>Trusted by 500+ businesses</span>
              <h4 style={{ marginTop: '20px' }}>Resources</h4>
              <Link to="/articles">AEO Articles</Link>
              <Link to="/local">Local SEO</Link>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} AutopilotGEO Ltd. All rights reserved.</span>
            <span>autopilotgeo.com</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
