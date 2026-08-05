import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe, type Stripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { lovable } from '@/integrations/lovable'
import { BrandMark } from '@/components/brand/BrandMark'
import '@/styles/onboarding.css'

const TOTAL_STEPS = 6

const CATEGORIES = [
  'Retail store', 'Local service', 'E-commerce', 'Restaurant', 'SaaS', 'Other',
]

interface Analysis {
  domain: string
  brandName: string
  description: string
  competitors: string[]
  targetAudiences: string[]
  keywords: (string | { keyword: string })[]
  language: string
}

const normalizeUrl = (raw: string) => {
  const t = raw.trim()
  return !t ? '' : /^https?:\/\//i.test(t) ? t : `https://${t}`
}

const isValidUrl = (raw: string) => {
  try {
    const u = new URL(normalizeUrl(raw))
    return !!u.hostname && u.hostname.includes('.')
  } catch {
    return false
  }
}

/* ---------- icons ---------- */
const IcArrow = () => (
  <svg className="ic-svg" viewBox="0 0 24 24" style={{ width: 14, height: 14, strokeWidth: 2 }}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)
const IcCheck = ({ size = 14 }: { size?: number }) => (
  <svg className="ic-svg" viewBox="0 0 24 24" style={{ width: size, height: size }}>
    <circle cx="12" cy="12" r="9" /><path d="M8 12.3l2.6 2.6L16.3 9" />
  </svg>
)
const IcLock = () => (
  <svg className="ic-svg" viewBox="0 0 24 24" style={{ width: 13, height: 13 }}>
    <rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)
const IcGoogle = () => (
  <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)
const IcApple = () => (
  <svg viewBox="0 0 24 24" style={{ width: 17, height: 17 }} fill="currentColor">
    <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.31-3.5zM14.88 5.6c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22z" />
  </svg>
)

/* ---------- Stripe card form (step 5) ---------- */
function CardForm({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!stripe || !elements) return
    setSubmitting(true)
    // Saves the card against the trialing subscription. Nothing is charged now.
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })
    setSubmitting(false)
    if (error) onError(error.message || 'Could not save your card')
    else onDone()
  }

  return (
    <>
      <div className="card-box">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <button
        className="btn btn-gold"
        style={{ marginTop: 20 }}
        disabled={!stripe || submitting}
        onClick={submit}
      >
        <IcLock />
        {submitting ? 'Starting your trial…' : 'Start free trial'}
      </button>
      <p className="fine">3-day free trial · Cancel anytime · No charge until day 4</p>
      <div className="secure"><IcLock /> Card handled by Stripe — never touches our servers</div>
    </>
  )
}

/* ---------- wizard ---------- */
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [bizName, setBizName] = useState('')
  const [bizSite, setBizSite] = useState('')
  const [category, setCategory] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phase, setPhase] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null)

  // Already onboarded? Go straight to the dashboard.
  useEffect(() => {
    if (authLoading || !user) return
    supabase.from('projects').select('id').eq('user_id', user.id).limit(1)
      .then(({ data }) => { if (data?.length) navigate('/geo', { replace: true }) })
  }, [authLoading, user, navigate])

  /* --- step 3: analyse the site and create the project --- */
  const runAnalysis = useCallback(async () => {
    setError('')
    try {
      setPhase('Reading your website…')
      const { data, error: fnError } = await supabase.functions.invoke('analyze-website', {
        body: { url: normalizeUrl(bizSite || bizName) },
      })
      if (fnError) throw new Error(fnError.message || 'Could not analyze your site')
      if (!data?.success) throw new Error(data?.error || 'Could not analyze your site')

      setPhase('Creating your workspace…')
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user.id
      if (!userId) throw new Error('Session expired — please sign in again')

      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: bizName || data.brandName || data.domain,
          website_url: normalizeUrl(bizSite || `https://${data.domain}`),
          domain: data.domain,
          language: data.language || 'en',
          business_description: data.description || null,
          business_type: category || null,
          brand_name: data.brandName || bizName || null,
          competitors: Array.isArray(data.competitors) ? data.competitors : null,
          is_active: true,
        })
        .select()
        .single()
      if (projError) throw projError

      setProjectId(project.id)

      // Keywords the competitors already rank for — this is what the daily
      // generator will aim at. Non-blocking: a DataForSEO outage must not
      // strand someone mid-signup.
      setPhase('Studying your competitors…')
      try {
        await supabase.functions.invoke('analyze-competitors', {
          body: {
            projectId: project.id,
            competitors: data.competitors ?? [],
            language: data.language || 'en',
          },
        })
      } catch (e) {
        console.error('[ONBOARDING] competitor analysis failed', e)
      }

      setAnalysis(data as Analysis)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep(3)
      setPhase('')
    }
  }, [bizSite, bizName, category])

  // Signed in and sitting on step 3 → start analysing.
  useEffect(() => {
    if (step === 3 && user && !analysis && !phase) runAnalysis()
  }, [step, user, analysis, phase, runAnalysis])

  const handleSignup = async () => {
    if (!email || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters')
      return
    }
    setBusy(true); setError('')
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: bizName || email.split('@')[0] } },
      })
      if (signUpError) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw new Error(signUpError.message)
      }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        setError('Check your inbox to confirm your email, then sign in to continue.')
        setBusy(false)
        return
      }
      setBusy(false)
      runAnalysis()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
      setBusy(false)
    }
  }

  const oauth = async (provider: 'google' | 'apple') => {
    const { error: e } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/onboarding`,
    })
    if (e) setError(e.message)
  }

  /* --- step 5: ask Stripe for a setup intent --- */
  const openPaywall = async () => {
    setBusy(true); setError('')
    try {
      const { data, error: e } = await supabase.functions.invoke('create-subscription-intent', {
        body: { plan },
      })
      if (e) throw new Error(e.message)
      if (data?.error) throw new Error(data.error)

      if (data.alreadySubscribed) {
        setStep(6)
        return
      }
      setStripePromise(loadStripe(data.publishableKey))
      setClientSecret(data.clientSecret)
      setStep(5)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the trial')
    } finally {
      setBusy(false)
    }
  }

  /* --- step 6: don't wait for tomorrow's cron for the first piece --- */
  const finish = async () => {
    setStep(6)
    if (!projectId) return
    try {
      await supabase.functions.invoke('daily-content-rotation', { body: { projectId } })
    } catch (e) {
      console.error('[ONBOARDING] first generation failed', e)
    }
  }

  const brand = analysis?.brandName || bizName || 'your business'
  const keywordList = (analysis?.keywords ?? []).map((k) =>
    typeof k === 'string' ? k : k.keyword
  ).filter(Boolean)

  return (
    <div className="apg-wizard-page">
      <div className="apg-wizard">
        <div className="wiz-head">
          <div className="wiz-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BrandMark size={26} />
              <div className="brand-name">AutopilotGEO</div>
            </div>
            <div className="step-count">Step {step}/{TOTAL_STEPS}</div>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="step" key={step}>
          {error && <div className="err">{error}</div>}

          {/* STEP 1 — business */}
          {step === 1 && (
            <>
              <h1>Let's see how AI talks about your business today</h1>
              <p className="sub">
                No card, no setup — tell us who you are and we'll show you what ChatGPT and Gemini
                currently say (or don't say) about you.
              </p>
              <label className="first">Business name</label>
              <input type="text" autoFocus value={bizName} placeholder="e.g. Sweet Déco"
                onChange={(e) => setBizName(e.target.value)} />
              <label>Website</label>
              <input type="url" value={bizSite} placeholder="yourstore.com"
                onChange={(e) => setBizSite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && bizName.trim() && isValidUrl(bizSite) && setStep(2)} />
              <div className="foot-nav">
                <span />
                <button
                  className="btn btn-primary"
                  disabled={!bizName.trim() || !isValidUrl(bizSite)}
                  onClick={() => { setError(''); setStep(2) }}
                >
                  Continue <IcArrow />
                </button>
              </div>
              {!bizName.trim() || !isValidUrl(bizSite) ? (
                <p className="fine">We need your site to run the analysis.</p>
              ) : null}
            </>
          )}

          {/* STEP 2 — category */}
          {step === 2 && (
            <>
              <h1>What kind of business is it?</h1>
              <p className="sub">This shapes the tone and the questions we optimize your content for.</p>
              <div className="chip-grid">
                {CATEGORIES.map((c) => (
                  <button key={c} className={`chip-opt${category === c ? ' sel' : ''}`}
                    onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
              <div className="foot-nav">
                <button className="btn-ghost" onClick={() => setStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={!category} onClick={() => setStep(3)}>
                  Continue <IcArrow />
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — account, then the real analysis */}
          {step === 3 && (
            user ? (
              <>
                <h1>Checking your AI visibility…</h1>
                <p className="sub">This takes a few seconds.</p>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                  <svg className="spinner" width="46" height="46" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" fill="none" stroke="#e4e5f0" strokeWidth="2.5" />
                    <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="#2e3a8c" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="phase">{phase || 'Starting…'}</p>
              </>
            ) : (
              <>
                <h1>Create your account</h1>
                <p className="sub">So we can save the analysis of <b>{bizSite}</b> to your workspace.</p>
                <button className="btn btn-social" onClick={() => oauth('google')}>
                  <IcGoogle /> Continue with Google
                </button>
                <button className="btn btn-social" onClick={() => oauth('apple')}>
                  <IcApple /> Continue with Apple
                </button>
                <div className="divider"><span /><em>or</em><span /></div>
                <label className="first">Email</label>
                <input type="email" value={email} placeholder="you@example.com"
                  onChange={(e) => setEmail(e.target.value)} />
                <label>Password</label>
                <input type="password" value={password} placeholder="6+ characters"
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignup()} />
                <button className="btn btn-primary" style={{ marginTop: 20 }} disabled={busy} onClick={handleSignup}>
                  {busy ? 'Creating account…' : <>Create account & analyze <IcArrow /></>}
                </button>
                <button className="btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setStep(2)}>
                  Back
                </button>
              </>
            )
          )}

          {/* STEP 4 — what we actually found */}
          {step === 4 && analysis && (
            <>
              <h1>Here's what we found for {brand}</h1>
              <p className="sub">Generated from your real site — this is what's at stake.</p>
              <div className="compare-preview">
                <div className="prev-card before">
                  <div className="lbl">Today, without AutopilotGEO</div>
                  <div className="txt">
                    ChatGPT has never heard of <b>{brand}</b>. When someone asks for a recommendation,
                    a competitor gets named instead
                    {analysis.competitors?.length ? <> — starting with <b>{analysis.competitors[0]}</b></> : null}.
                  </div>
                </div>
                <div className="prev-card after">
                  <div className="lbl">With AutopilotGEO, in ~2 weeks</div>
                  <div className="txt">
                    "I'd recommend <b>{brand}</b> — {analysis.description
                      ? analysis.description.slice(0, 110).replace(/\.$/, '')
                      : 'known for great service'}."
                  </div>
                </div>
              </div>
              {keywordList.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                    {keywordList.length} keywords we'll target
                  </div>
                  <div className="found-chips">
                    {keywordList.slice(0, 6).map((k) => <span className="found-chip" key={k}>{k}</span>)}
                  </div>
                </>
              )}
              <div className="foot-nav">
                <span />
                <button className="btn btn-gold" disabled={busy} onClick={openPaywall}>
                  {busy ? 'Preparing…' : <>Claim this visibility <IcArrow /></>}
                </button>
              </div>
            </>
          )}

          {/* STEP 5 — paywall with Stripe Elements */}
          {step === 5 && (
            <>
              <h1>Start your free trial</h1>
              <p className="sub">
                Card required to prevent abuse — you won't be charged until day 4, and you can cancel
                anytime before that.
              </p>

              <div className="plan-toggle">
                <button className={plan === 'monthly' ? 'on' : ''} onClick={() => setPlan('monthly')}>Monthly</button>
                <button className={plan === 'annual' ? 'on' : ''} onClick={() => setPlan('annual')}>
                  Annual <span className="save">−20%</span>
                </button>
              </div>

              <div className="plan-card">
                <span className="tag">Founding price</span>
                <div className="plan-top">
                  <div className="name">Starter</div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="plan-was">{plan === 'monthly' ? '$29/mo' : '$119.88/yr'}</div>
                    <div className="price">
                      {plan === 'monthly' ? '$9.99' : '$95.88'}
                      <span>{plan === 'monthly' ? '/mo' : '/yr'}</span>
                    </div>
                  </div>
                </div>
                <div className="plan-feats">
                  <div><IcCheck /> 1 GEO-optimized piece / day</div>
                  <div><IcCheck /> ChatGPT, Gemini, Perplexity tracking</div>
                  <div><IcCheck /> Weekly presence check</div>
                </div>
              </div>

              {clientSecret && stripePromise ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <CardForm onDone={finish} onError={setError} />
                </Elements>
              ) : (
                <p className="phase">Loading secure payment form…</p>
              )}

              <button className="btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setStep(4)}>
                Back
              </button>
            </>
          )}

          {/* STEP 6 — done */}
          {step === 6 && (
            <>
              <div className="success-ic">
                <svg className="ic-svg" viewBox="0 0 24 24" style={{ strokeWidth: 2 }}>
                  <path d="M5 13l4.5 4.5L19 8" />
                </svg>
              </div>
              <h1 style={{ textAlign: 'center' }}>You're all set</h1>
              <p className="sub" style={{ textAlign: 'center' }}>
                Your trial has started and your first piece is already being written.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/geo')}>
                Go to my dashboard <IcArrow />
              </button>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/geo?tab=settings')}>
                Connect my website
              </button>
              <div className="timeline">
                <div className="tl-row">
                  <span className="tl-dot" />
                  <div className="tl-text"><b>Now</b><span>Trial started, first draft is being written</span></div>
                </div>
                <div className="tl-row">
                  <span className="tl-dot" />
                  <div className="tl-text"><b>Tomorrow, 5am UTC</b><span>Content goes out automatically, cycling GEO → SEO → AEO → Local AEO</span></div>
                </div>
                <div className="tl-row">
                  <span className="tl-dot later" />
                  <div className="tl-text"><b>In ~2 weeks</b><span>Visibility score appears once AI engines index your content</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
