import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { lovable } from '@/integrations/lovable'
import { BrandMark } from '@/components/brand/BrandMark'
import '@/styles/onboarding.css'

const TOTAL_STEPS = 5

// Publishable keys are meant to be public (Stripe's own design — they only
// ever initialize Stripe.js, never authorize a charge), so this is safe to
// ship in frontend code. Kept as a Vite env var with this as the fallback so
// it never depends on a Supabase Edge Function secret being set correctly.
const STRIPE_PUBLISHABLE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_live_51OkmX3Efti9t9nN9Mlecdj4IgnmMGkECjdGaN85Qg6QJ1KoVOF3KQmX7Cj9aOQiTnolZG7MhJ2qSLS85QqEwJOpM00UBMNxh2H'
const stripePromiseSingleton = loadStripe(STRIPE_PUBLISHABLE_KEY)

const CATEGORIES = [
  'Retail store', 'Local service', 'E-commerce', 'Restaurant', 'SaaS', 'Other',
]

// Flag emoji is derived from the ISO code itself (regional-indicator code
// points), not a hardcoded character per country — one formula covers all of them.
const flagEmoji = (iso2: string) =>
  String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)))

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' }, { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' }, { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' },
  { code: 'PT', name: 'Portugal' }, { code: 'CH', name: 'Switzerland' }, { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' }, { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' }, { code: 'FI', name: 'Finland' }, { code: 'PL', name: 'Poland' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' },
  { code: 'MX', name: 'Mexico' }, { code: 'BR', name: 'Brazil' }, { code: 'AR', name: 'Argentina' },
  { code: 'MA', name: 'Morocco' }, { code: 'DZ', name: 'Algeria' }, { code: 'TN', name: 'Tunisia' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IN', name: 'India' }, { code: 'JP', name: 'Japan' }, { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' },
]

/** Best-effort guess from the browser's own locale — e.g. "fr-FR" -> "FR".
 * Just a starting point; the dropdown lets the user correct it in one click. */
const guessCountryFromLocale = (): string => {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region
    if (region && COUNTRIES.some((c) => c.code === region)) return region
  } catch {
    // Intl.Locale unsupported or locale has no region — fall through.
  }
  const tag = navigator.language?.split('-')[1]?.toUpperCase()
  return tag && COUNTRIES.some((c) => c.code === tag) ? tag : 'US'
}

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
    // No trial: this actually charges the card.
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })
    setSubmitting(false)
    if (error) onError(error.message || 'Could not charge your card')
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
        {submitting ? 'Processing…' : 'Subscribe now'}
      </button>
      <p className="fine">Cancel anytime</p>
      <div className="secure"><IcLock /> Card handled by Stripe — never touches our servers</div>
    </>
  )
}

/* ---------- wizard ---------- */
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { subscribed, trial, isLoading: subLoading } = useSubscription()

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [bizName, setBizName] = useState('')
  const [bizSite, setBizSite] = useState('')
  const [country, setCountry] = useState(guessCountryFromLocale)
  const [category, setCategory] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phase, setPhase] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  // Editable mirror of the auto-detected description, so step 3 is a real
  // review-and-edit screen rather than a read-only report.
  const [editableDescription, setEditableDescription] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  // Quick unauthenticated scrape fired right after step 1, so the category is
  // already guessed and the brand name is properly formatted — "Sweet Déco",
  // not "sweet-deco" (the raw domain slug analyze-website falls back to)
  // — before the full AI pass even starts.
  const [preScraped, setPreScraped] = useState<{ brandName: string; description: string; language: string } | null>(null)
  const [dfsKeywords, setDfsKeywords] = useState<string[]>([])
  // DataForSEO-backed clusters (volume/difficulty/intent), richer than the
  // plain AI-guessed keyword list.
  const [keywordClusters, setKeywordClusters] = useState<{ name: string; intent: string; keywords: { keyword: string; volume: number }[] }[]>([])
  // Best-effort Google Business match — informational, not a live GMB sync.
  const [placeInfo, setPlaceInfo] = useState<{ address?: string; phone?: string; openingHours?: string[]; rating?: number } | null>(null)

  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  // Already has a project: paid (or trialing) -> dashboard. Payment gates
  // access, so a project without a subscription is an incomplete signup —
  // resume straight at the paywall instead of leaving them stuck on step 1,
  // and regardless of how they arrived here (GEODashboard enforces the same
  // rule and redirects unpaid users back to this exact effect).
  const [resumedBilling, setResumedBilling] = useState(false)
  useEffect(() => {
    if (authLoading || !user || subLoading || resumedBilling) return
    supabase.from('projects').select('id, brand_name, name').eq('user_id', user.id).limit(1)
      .then(({ data }) => {
        const existing = data?.[0]
        if (!existing) return
        if (subscribed || trial) {
          navigate('/geo', { replace: true })
          return
        }
        setResumedBilling(true)
        setProjectId(existing.id)
        setBizName(existing.brand_name || existing.name || '')
        openPaywall()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, subLoading, subscribed, trial, navigate, resumedBilling])

  /** Cheap keyword heuristic against the scraped description/domain — a
   * pre-filled guess the user can still override, not a forced choice. */
  const guessCategory = (text: string): string => {
    const t = text.toLowerCase()
    if (/restaurant|café|resto|food|cuisine|menu|traiteur/.test(t)) return 'Restaurant'
    if (/saas|software|logiciel|platform|plateforme|application saas|api\b/.test(t)) return 'SaaS'
    if (/shop|store|boutique|magasin|e-?commerce|panier|cart|livraison.*commande/.test(t)) return 'E-commerce'
    if (/service|consult|agence|agency|artisan|plombier|électricien|coiffeur|réparation/.test(t)) return 'Local service'
    if (/retail|vente au détail|showroom/.test(t)) return 'Retail store'
    return ''
  }

  /* --- right after step 1: no-auth scrape so step 2 isn't a blank guess --- */
  const preScrapeSite = useCallback(async () => {
    const url = normalizeUrl(bizSite)
    if (!url) return
    try {
      const { data } = await supabase.functions.invoke('firecrawl-scrape-fast', { body: { url } })
      if (data?.success && data.data) {
        const { brandName, description, language } = data.data
        setPreScraped({ brandName, description: description || '', language: language || 'en' })
        if (!category) {
          const guessed = guessCategory(`${description || ''} ${url}`)
          if (guessed) setCategory(guessed)
        }
      }
    } catch (e) {
      console.error('[ONBOARDING] pre-scrape failed', e)
    }
  }, [bizSite, category])

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

      // analyze-website's AI pass never returns a brandName field at all — only
      // its own naive regex fallback does, and that's the raw domain slug
      // ("sweet-deco") whenever the page's <title> can't be parsed from a
      // plain fetch (any JS-rendered site). Never trust that fallback: prefer
      // what the user actually typed, then the properly-cased name firecrawl
      // already found ("Sweet Déco").
      const goodBrandName = bizName || preScraped?.brandName || data.brandName || data.domain

      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: goodBrandName,
          website_url: normalizeUrl(bizSite || `https://${data.domain}`),
          domain: data.domain,
          language: data.language || preScraped?.language || 'en',
          business_description: data.description || preScraped?.description || null,
          business_type: category || null,
          brand_name: goodBrandName,
          competitors: Array.isArray(data.competitors) ? data.competitors : null,
          is_active: true,
        })
        .select()
        .single()
      if (projError) throw projError

      setProjectId(project.id)

      // Keywords the competitors already rank for — this is what the daily
      // generator will aim at, and what step 4 shows alongside the AI-guessed
      // ones. Non-blocking: a DataForSEO outage must not strand someone mid-signup.
      setPhase('Studying your competitors…')
      try {
        const { data: dfs } = await supabase.functions.invoke('analyze-competitors', {
          body: {
            projectId: project.id,
            competitors: data.competitors ?? [],
            language: data.language || 'en',
          },
        })
        if (Array.isArray(dfs?.topKeywords)) setDfsKeywords(dfs.topKeywords)
      } catch (e) {
        console.error('[ONBOARDING] competitor analysis failed', e)
      }

      // Two more auto-fill passes, both best-effort: a scored/volumed
      // keyword-research pass (real DataForSEO SERP data where available)
      // and a Google Places match for address/phone/hours — replacing what
      // would otherwise be manual fields on the review screen. Neither
      // blocks getting there if it fails or the API key isn't configured.
      setPhase('Researching keywords…')
      try {
        const { data: kw } = await supabase.functions.invoke('keyword-research', {
          body: { projectId: project.id, seedKeywords: (data.keywords ?? []).slice(0, 5).map((k: any) => typeof k === 'string' ? k : k.keyword), language: data.language || 'en', country: country.toLowerCase() },
        })
        if (Array.isArray(kw?.clusters)) setKeywordClusters(kw.clusters)
      } catch (e) {
        console.error('[ONBOARDING] keyword research failed', e)
      }

      setPhase('Checking your Google listing…')
      try {
        const countryName = COUNTRIES.find((c) => c.code === country)?.name || ''
        const { data: places } = await supabase.functions.invoke('places-search', {
          body: { query: `${goodBrandName} ${countryName}`.trim() },
        })
        const match = places?.results?.[0]
        if (match?.id) {
          const { data: details } = await supabase.functions.invoke('places-search', {
            body: { placeId: match.id },
          })
          if (details?.business) {
            setPlaceInfo({
              address: details.business.address,
              phone: details.business.phone,
              openingHours: details.business.openingHours,
              rating: details.business.rating,
            })
          }
        }
      } catch (e) {
        console.error('[ONBOARDING] places lookup failed', e)
      }

      setAnalysis({ ...data, brandName: goodBrandName } as Analysis)
      setEditableDescription(data.description || preScraped?.description || '')
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep(2)
      setPhase('')
    }
  }, [bizSite, bizName, category, preScraped])

  // Signed in and sitting on step 2 → start analysing.
  useEffect(() => {
    if (step === 2 && user && !analysis && !phase) runAnalysis()
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

  /* --- step 5: ask Stripe for a payment intent --- */
  const openPaywall = async () => {
    setBusy(true); setError('')
    try {
      // Persist whatever was edited on the review screen before moving on.
      if (projectId) {
        await supabase.from('projects').update({
          business_description: editableDescription || null,
          business_type: category || null,
        }).eq('id', projectId)
      }
      const { data, error: e } = await supabase.functions.invoke('create-subscription-intent', {
        body: { plan },
      })
      if (e) throw new Error(e.message)
      if (data?.error) throw new Error(data.error)

      if (data.alreadySubscribed) {
        setStep(5)
        return
      }
      setClientSecret(data.clientSecret)
      setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
    } finally {
      setBusy(false)
    }
  }

  /* --- step 5: seed the 30-day plan now instead of waiting on the cron's
     small per-tick batches. Two tracks, both pre-existing: the AEO
     answer+article pairing (same call AeoWizard already uses) and the
     GEO/SEO/AEO/Local-AEO geo_contents track — 30 slots covers all 30 days
     in one shot since maxSlots overrides the steady-state cron cap. --- */
  const finish = async () => {
    setStep(5)
    if (!projectId) return
    try {
      await Promise.all([
        supabase.functions.invoke('generate-30-days-content', {
          body: { projectId, language: analysis?.language || 'en', days: 30, questionsPerDay: 1, titlesOnly: true },
        }),
        // 16 slots (4 full days) is as much as one request can safely
        // generate before risking a function timeout; check-planning-completeness's
        // hourly cron tops up the rest of the 30-day window from here.
        supabase.functions.invoke('generate-30-gso-contents', {
          body: { projectId, maxSlots: 16 },
        }),
      ])
    } catch (e) {
      console.error('[ONBOARDING] first generation failed', e)
    }
  }

  const canStartAnalysis = !!bizName.trim() && isValidUrl(bizSite) && !!country.trim()
  const brand = analysis?.brandName || preScraped?.brandName || bizName || 'your business'
  const aiKeywords = (analysis?.keywords ?? []).map((k) =>
    typeof k === 'string' ? k : k.keyword
  ).filter(Boolean)
  const clusterKeywords = keywordClusters.flatMap((c) => c.keywords.map((k) => k.keyword))
  // AI-guessed keywords first, then DataForSEO-scored ones from keyword-research,
  // then whatever competitors already rank for — deduped, case-insensitive,
  // keeping the first (highest-priority) occurrence of each.
  const seen = new Set<string>()
  const keywordList = [aiKeywords, clusterKeywords, dfsKeywords].flat().filter((k) => {
    const key = k.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

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
                onChange={(e) => setBizSite(e.target.value)} />
              <label>Country — detected automatically, change if it's wrong</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  width: '100%', padding: '13px 14px', borderRadius: '12px', border: '1.5px solid var(--line)',
                  fontSize: '14.5px', fontFamily: 'inherit', background: 'var(--paper)', color: 'var(--ink)',
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
                ))}
              </select>
              <div className="foot-nav">
                <span />
                <button
                  className="btn btn-primary"
                  disabled={!canStartAnalysis}
                  onClick={() => { setError(''); setStep(2); preScrapeSite() }}
                >
                  Continue <IcArrow />
                </button>
              </div>
              <p className="fine">
                {!canStartAnalysis
                  ? 'We need your business name and site to run the analysis.'
                  : 'Category, description, competitors and keywords get detected automatically next.'}
              </p>
            </>
          )}

          {/* STEP 2 — account, then the real analysis */}
          {step === 2 && (
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
                <button className="btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setStep(1)}>
                  Back
                </button>
              </>
            )
          )}

          {/* STEP 3 — review & edit what we auto-detected */}
          {step === 3 && analysis && (
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
              <label className="first">What we understood about {brand} — edit if it's off</label>
              <textarea
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', fontSize: '13.5px', fontFamily: 'inherit',
                  border: '1.5px solid var(--line)', borderRadius: '10px', background: 'var(--paper)',
                  color: 'var(--ink)', resize: 'vertical', marginBottom: 14,
                }}
              />
              <label>Category — tap to change</label>
              <div className="chip-grid" style={{ marginBottom: 14 }}>
                {CATEGORIES.map((c) => (
                  <button key={c} className={`chip-opt${category === c ? ' sel' : ''}`}
                    onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
              {placeInfo && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                    Found on Google Business
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 14 }}>
                    {placeInfo.address && <div>{placeInfo.address}</div>}
                    {placeInfo.phone && <div>{placeInfo.phone}</div>}
                    {placeInfo.rating ? <div>{placeInfo.rating}★ on Google</div> : null}
                    {placeInfo.openingHours && placeInfo.openingHours.length > 0 && (
                      <div>{placeInfo.openingHours[0]}</div>
                    )}
                  </div>
                </>
              )}
              {analysis.competitors && analysis.competitors.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                    {analysis.competitors.length} competitor{analysis.competitors.length > 1 ? 's' : ''} already winning this
                  </div>
                  <div className="found-chips" style={{ marginBottom: 14 }}>
                    {analysis.competitors.map((c) => <span className="found-chip" key={c}>{c}</span>)}
                  </div>
                </>
              )}
              {keywordList.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
                    {keywordList.length} keywords we'll target
                  </div>
                  <div className="found-chips">
                    {keywordList.slice(0, 10).map((k) => <span className="found-chip" key={k}>{k}</span>)}
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

          {/* STEP 4 — paywall with Stripe Elements */}
          {step === 4 && (
            <>
              <h1>Choose your plan</h1>
              <p className="sub">Pick monthly or annual — you're billed today, and can cancel anytime.</p>

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

              {clientSecret ? (
                <Elements stripe={stripePromiseSingleton} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <CardForm onDone={finish} onError={setError} />
                </Elements>
              ) : (
                <p className="phase">Loading secure payment form…</p>
              )}

              <button className="btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setStep(3)}>
                Back
              </button>
            </>
          )}

          {/* STEP 5 — done */}
          {step === 5 && (
            <>
              <div className="success-ic">
                <svg className="ic-svg" viewBox="0 0 24 24" style={{ strokeWidth: 2 }}>
                  <path d="M5 13l4.5 4.5L19 8" />
                </svg>
              </div>
              <h1 style={{ textAlign: 'center' }}>You're all set</h1>
              <p className="sub" style={{ textAlign: 'center' }}>
                You're subscribed and your first piece is already being written.
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
                  <div className="tl-text"><b>Now</b><span>Subscription active, your 30-day content plan is being built</span></div>
                </div>
                <div className="tl-row">
                  <span className="tl-dot" />
                  <div className="tl-text"><b>Every Mon / Wed / Fri, 6am UTC</b><span>New answers and articles publish automatically, filling the next 30 days</span></div>
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
