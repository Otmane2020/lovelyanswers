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

// Flag emoji (regional-indicator code points) renders fine on Mac/iOS but
// Windows shows the raw two-letter codes instead of combining them into a
// flag — and a native <select><option> can't hold an <img> to fix that
// properly. flagUrl() + the custom dropdown below are the workaround.
const flagUrl = (iso2: string) => `https://flagcdn.com/24x18/${iso2.toLowerCase()}.png`

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
  recommendationExample?: string
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
  const [countryOpen, setCountryOpen] = useState(false)
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
  const [competitorKeywords, setCompetitorKeywords] = useState<{ domain: string; keywords: string[] }[]>([])
  // DataForSEO-backed clusters (volume/difficulty/intent), richer than the
  // plain AI-guessed keyword list.
  const [keywordClusters, setKeywordClusters] = useState<{ name: string; intent: string; keywords: { keyword: string; volume: number }[] }[]>([])
  // Best-effort Google Business match — informational, not a live GMB sync.
  const [placeInfo, setPlaceInfo] = useState<{ address?: string; phone?: string; openingHours?: string[]; rating?: number } | null>(null)

  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percentOff: number | null; amountOff: number | null } | null>(null)

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

  /* --- step 2: analyse the site — no account needed yet, so people see
     what AI already says about them before we ask them to sign up --- */
  const runAnonAnalysis = useCallback(async () => {
    setError('')
    try {
      setPhase('Reading your website…')
      // analyze-website is meant to run without auth (config.toml declares
      // verify_jwt = false for it, same as firecrawl-scrape-fast below), but
      // production has been observed returning 401 for anonymous calls to it
      // regardless — a deploy/dashboard-config drift, not something this
      // code controls. Don't let that dead-end the funnel: fall back to the
      // anonymous pre-scrape's brand/description/language so step 3 still
      // renders, just without AI-detected competitors and keywords until
      // persistProject retries analyze-website with a real session.
      let data: Record<string, unknown> & { success?: boolean; domain?: string; brandName?: string; description?: string; language?: string; competitors?: string[]; keywords?: unknown[]; recommendationExample?: string } = {}
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('analyze-website', {
          body: { url: normalizeUrl(bizSite || bizName) },
        })
        if (fnError) throw new Error(fnError.message || 'Could not analyze your site')
        if (!fnData?.success) throw new Error(fnData?.error || 'Could not analyze your site')
        data = fnData
      } catch (e) {
        console.error('[ONBOARDING] analyze-website failed, falling back to a direct scrape', e)
        // Don't rely on preScrapeSite's state — it was fired in parallel from
        // step 1's Continue click and may not have resolved yet. Fetch fresh
        // instead of racing it.
        const url = normalizeUrl(bizSite || bizName)
        const { data: scraped } = await supabase.functions.invoke('firecrawl-scrape-fast', { body: { url } })
        if (!scraped?.success || !scraped.data) throw e
        data = {
          success: true,
          domain: url.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
          brandName: scraped.data.brandName,
          description: scraped.data.description || '',
          language: scraped.data.language || 'en',
          competitors: [],
          keywords: [],
        }
      }

      // analyze-website's AI pass never returns a brandName field at all — only
      // its own naive regex fallback does, and that's the raw domain slug
      // ("sweet-deco") whenever the page's <title> can't be parsed from a
      // plain fetch (any JS-rendered site). Never trust that fallback: prefer
      // what the user actually typed, then the properly-cased name firecrawl
      // already found ("Sweet Déco").
      const goodBrandName = bizName || preScraped?.brandName || data.brandName || data.domain

      // Best-effort Google Business match — doesn't need auth or a project,
      // so it can run now and show up on the review step before signup.
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
      setStep(1)
      setPhase('')
    }
  }, [bizSite, bizName, preScraped, country])

  /* --- step 3 -> paywall: create the account (if needed), then the project
     and its competitor/keyword enrichment — all of this needs a real user,
     which is why it waits until after the analysis is already on screen --- */
  const persistProject = useCallback(async () => {
    if (!analysis) throw new Error('Run the analysis first')

    const { data: sess } = await supabase.auth.getSession()
    const userId = sess.session?.user.id
    if (!userId) throw new Error('Session expired — please sign in again')

    // If the anonymous analyze-website call earlier failed (production has
    // been seen rejecting it with 401 without a session — see runAnonAnalysis),
    // we're sitting on the pre-scrape fallback with no real competitors or
    // keywords. Retry now that a session exists, so the project the
    // generator uses is still seeded with real data instead of nothing.
    let enriched = analysis
    if (!analysis.competitors?.length) {
      try {
        const { data: retryData, error: retryError } = await supabase.functions.invoke('analyze-website', {
          body: { url: normalizeUrl(bizSite || bizName) },
        })
        if (!retryError && retryData?.success) {
          enriched = { ...analysis, ...retryData, brandName: analysis.brandName }
          setAnalysis(enriched)
        }
      } catch (e) {
        console.error('[ONBOARDING] analyze-website retry after signup failed', e)
      }
    }

    setPhase('Creating your workspace…')
    const goodBrandName = enriched.brandName || bizName
    const { data: project, error: projError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: goodBrandName,
        website_url: normalizeUrl(bizSite || `https://${enriched.domain}`),
        domain: enriched.domain,
        language: enriched.language || preScraped?.language || 'en',
        business_description: editableDescription || enriched.description || null,
        business_type: category || null,
        brand_name: goodBrandName,
        competitors: Array.isArray(enriched.competitors) ? enriched.competitors : null,
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
      const { data: dfs } = await supabase.functions.invoke('analyze-competitors', {
        body: {
          projectId: project.id,
          competitors: enriched.competitors ?? [],
          language: enriched.language || 'en',
        },
      })
      if (Array.isArray(dfs?.topKeywords)) setDfsKeywords(dfs.topKeywords)
      if (Array.isArray(dfs?.perCompetitor)) setCompetitorKeywords(dfs.perCompetitor)
    } catch (e) {
      console.error('[ONBOARDING] competitor analysis failed', e)
    }

    // A scored/volumed keyword-research pass (real DataForSEO SERP data
    // where available). Non-blocking, same reasoning as above.
    setPhase('Researching keywords…')
    try {
      const { data: kw } = await supabase.functions.invoke('keyword-research', {
        body: {
          projectId: project.id,
          seedKeywords: (enriched.keywords ?? []).slice(0, 5).map((k) => typeof k === 'string' ? k : k.keyword),
          language: enriched.language || 'en',
          country: country.toLowerCase(),
        },
      })
      if (Array.isArray(kw?.clusters)) setKeywordClusters(kw.clusters)
    } catch (e) {
      console.error('[ONBOARDING] keyword research failed', e)
    }

    return project.id
  }, [analysis, bizName, bizSite, category, country, editableDescription, preScraped])

  // Sitting on step 2 → start analysing right away, no account required.
  useEffect(() => {
    if (step === 2 && !analysis && !phase) runAnonAnalysis()
  }, [step, analysis, phase, runAnonAnalysis])

  /* --- step 3's CTA: create the account (only if not signed in yet), then
     persist the project and move to the paywall. Account creation happens
     here — after the analysis is already on screen — instead of gating
     the analysis behind a blind signup. --- */
  const claimVisibility = async () => {
    setBusy(true); setError('')
    try {
      if (!user) {
        if (!email || password.length < 6) {
          setError('Enter an email and a password of at least 6 characters')
          setBusy(false)
          return
        }
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
      }
      const pid = projectId || (await persistProject())
      await openPaywall(pid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
    } finally {
      setBusy(false)
      setPhase('')
    }
  }

  const oauth = async (provider: 'google' | 'apple') => {
    const { error: e } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/onboarding`,
    })
    if (e) setError(e.message)
  }

  /* --- ask Stripe for a payment intent matching the current plan + promo.
     Re-invoked whenever either changes — create-subscription-intent updates
     the same never-paid subscription in place rather than creating a new
     one each time, so toggling plan/promo repeatedly doesn't abandon
     orphaned Stripe subscriptions. --- */
  const refreshSubscription = async (nextPlan: 'monthly' | 'annual', nextPromo: string) => {
    setBusy(true); setError('')
    try {
      const { data, error: e } = await supabase.functions.invoke('create-subscription-intent', {
        body: { plan: nextPlan, promoCode: nextPromo || undefined },
      })
      if (e) throw new Error(e.message)
      if (data?.error) throw new Error(data.error)

      if (data.alreadySubscribed) {
        setStep(5)
        return
      }
      setClientSecret(data.clientSecret)
      setAppliedDiscount(data.discount ?? null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout')
      return false
    } finally {
      setBusy(false)
    }
  }

  /* --- step 3 -> step 4: persist edits, then open the paywall.
     Accepts an explicit id because a caller that just created the project
     in the same tick (persistProject via setProjectId) can't rely on the
     `projectId` state closure having caught up yet. --- */
  const openPaywall = async (pid?: string) => {
    const id = pid ?? projectId
    if (id) {
      await supabase.from('projects').update({
        business_description: editableDescription || null,
        business_type: category || null,
      }).eq('id', id)
    }
    if (await refreshSubscription(plan, promoCode)) setStep(4)
  }

  const changePlan = async (nextPlan: 'monthly' | 'annual') => {
    setPlan(nextPlan)
    await refreshSubscription(nextPlan, promoCode)
  }

  const applyPromoCode = async () => {
    const code = promoInput.trim()
    if (!code) return
    setPromoBusy(true); setPromoError('')
    try {
      const { data, error: e } = await supabase.functions.invoke('create-subscription-intent', {
        body: { plan, promoCode: code },
      })
      if (e) throw new Error(e.message)
      if (data?.error) throw new Error(data.error)
      setClientSecret(data.clientSecret)
      setAppliedDiscount(data.discount ?? null)
      setPromoCode(code)
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : 'Could not apply that code')
    } finally {
      setPromoBusy(false)
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

  // Base prices in cents, matching what create-subscription-intent actually
  // charges — kept in sync manually since the price itself lives in Stripe.
  const basePriceCents = plan === 'monthly' ? 999 : 9588
  const discountedPriceCents = appliedDiscount
    ? appliedDiscount.percentOff
      ? Math.round(basePriceCents * (1 - appliedDiscount.percentOff / 100))
      : appliedDiscount.amountOff
      ? Math.max(0, basePriceCents - appliedDiscount.amountOff)
      : basePriceCents
    : basePriceCents
  const discountedPriceLabel = `$${(discountedPriceCents / 100).toFixed(2)}`
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

          {/* STEP 2 — real analysis, no account needed yet */}
          {step === 2 && (
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
                    "{analysis.recommendationExample || `I'd recommend ${brand} — known for great service.`}"
                  </div>
                </div>
              </div>
              <label className="first">Country</label>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setCountryOpen((o) => !o)}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--line)',
                    fontSize: '14.5px', fontFamily: 'inherit', background: 'var(--paper)', color: 'var(--ink)',
                    display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <img src={flagUrl(country)} alt="" width={22} height={16} style={{ borderRadius: 2, flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{COUNTRIES.find((c) => c.code === country)?.name}</span>
                  <IcArrow />
                </button>
                {countryOpen && (
                  <>
                    {/* Backdrop to close on outside click — sits under the list, above everything else. */}
                    <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setCountryOpen(false)} />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 11,
                      background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: '12px',
                      maxHeight: '220px', overflowY: 'auto', boxShadow: '0 12px 28px rgba(20,22,46,.14)',
                    }}>
                      {COUNTRIES.map((c) => (
                        <button
                          type="button"
                          key={c.code}
                          onClick={() => { setCountry(c.code); setCountryOpen(false) }}
                          style={{
                            width: '100%', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                            background: c.code === country ? 'var(--primary-soft)' : 'transparent', border: 'none',
                            fontFamily: 'inherit', fontSize: '13.5px', color: 'var(--ink)', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <img src={flagUrl(c.code)} alt="" width={20} height={15} style={{ borderRadius: 2, flexShrink: 0 }} />
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {analysis.competitors.map((c) => {
                      const bareDomain = c.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
                      const kws = competitorKeywords.find((ck) => ck.domain === bareDomain)?.keywords ?? []
                      return (
                        <div key={c} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                          border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)',
                        }}>
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${bareDomain}&sz=32`}
                            alt=""
                            width={18}
                            height={18}
                            style={{ borderRadius: 4, marginTop: 2, flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{bareDomain}</div>
                            {kws.length > 0 && (
                              <div className="found-chips" style={{ marginTop: 4 }}>
                                {kws.map((k) => <span className="found-chip" key={k}>{k}</span>)}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
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
              {!user && (
                <>
                  <label className="first">Create your account to claim this</label>
                  <button className="btn btn-social" onClick={() => oauth('google')}>
                    <IcGoogle /> Continue with Google
                  </button>
                  <button className="btn btn-social" onClick={() => oauth('apple')}>
                    <IcApple /> Continue with Apple
                  </button>
                  <div className="divider"><span /><em>or</em><span /></div>
                  <label>Email</label>
                  <input type="email" value={email} placeholder="you@example.com"
                    onChange={(e) => setEmail(e.target.value)} />
                  <label>Password</label>
                  <input type="password" value={password} placeholder="6+ characters"
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && claimVisibility()} />
                </>
              )}
              <div className="foot-nav">
                <span />
                <button className="btn btn-gold" disabled={busy} onClick={claimVisibility}>
                  {busy ? 'Preparing…' : <>{user ? 'Claim this visibility' : 'Create account & claim this visibility'} <IcArrow /></>}
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
                <button disabled={busy} className={plan === 'monthly' ? 'on' : ''} onClick={() => changePlan('monthly')}>Monthly</button>
                <button disabled={busy} className={plan === 'annual' ? 'on' : ''} onClick={() => changePlan('annual')}>
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
                      {discountedPriceLabel}
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

              {appliedDiscount ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--green-soft)', border: '1px solid #cfe9db', borderRadius: '10px',
                  padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: 'var(--green)',
                }}>
                  <span><IcCheck size={13} /> Code <b>{appliedDiscount.code}</b> applied
                    {appliedDiscount.percentOff ? ` — ${appliedDiscount.percentOff}% off` : appliedDiscount.amountOff ? ` — $${(appliedDiscount.amountOff / 100).toFixed(2)} off` : ''}
                  </span>
                  <button
                    className="btn-ghost"
                    style={{ padding: '2px 8px', fontSize: 12 }}
                    onClick={() => { setPromoCode(''); setPromoInput(''); refreshSubscription(plan, '') }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <input
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo code"
                    onKeyDown={(e) => e.key === 'Enter' && applyPromoCode()}
                    style={{
                      flex: 1, padding: '10px 12px', fontSize: '13.5px', fontFamily: 'inherit',
                      border: '1.5px solid var(--line)', borderRadius: '9px', background: 'var(--paper)', color: 'var(--ink)',
                    }}
                  />
                  <button className="btn btn-ghost btn-sm" disabled={promoBusy || !promoInput.trim()} onClick={applyPromoCode}>
                    {promoBusy ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {promoError && <p className="err" style={{ marginTop: '-8px' }}>{promoError}</p>}

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
                You're subscribed and your first piece is already being written. Last step: connect your site so it can actually publish.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/geo?tab=settings')}>
                Connect my website <IcArrow />
              </button>
              <a
                className="btn-ghost"
                style={{ width: '100%', marginTop: 8, textAlign: 'center', display: 'block' }}
                href={`mailto:support@autopilotgeo.com?subject=${encodeURIComponent(
                  `Connect my site — ${bizName || 'my project'}`
                )}&body=${encodeURIComponent(
                  `Hi,\n\nCan you connect my CMS for me? Here are my details:\n\nProject: ${bizName || ''}\nWebsite: ${bizSite || ''}\n\nThanks!`
                )}`}
              >
                I need help — do it for me
              </a>
              <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => navigate('/geo')}>
                Skip for now, go to my dashboard
              </button>
              <div className="timeline">
                <div className="tl-row">
                  <span className="tl-dot" />
                  <div className="tl-text"><b>Now</b><span>Subscription active, your 30-day content plan is being built</span></div>
                </div>
                <div className="tl-row">
                  <span className="tl-dot" />
                  <div className="tl-text"><b>Every day</b><span>New GEO, SEO, AEO and Local AEO content publishes automatically, filling the next 30 days</span></div>
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
