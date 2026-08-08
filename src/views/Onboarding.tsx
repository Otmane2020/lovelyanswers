import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useSubscription } from '@/hooks/useSubscription'
import { BrandMark } from '@/components/brand/BrandMark'
import '@/styles/onboarding.css'

const TOTAL_STEPS = 6

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

const LANGUAGES: { code: string; name: string }[] = [
  { code: 'en', name: 'English' }, { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' }, { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' }, { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
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
  aiEnriched?: boolean
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

/* supabase.functions.invoke() errors carry only a generic "Edge Function
   returned a non-2xx status code" as .message — the actual { error: "..." }
   body our functions return lives on the raw Response at .context. Prefer
   that so a real failure reason reaches the screen instead of the SDK's
   unhelpful default. */
const describeFnError = async (error: unknown, fallback: string): Promise<string> => {
  const ctx = (error as { context?: Response })?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json()
      if (body?.error && typeof body.error === 'string') return body.error
    } catch {
      // response body wasn't JSON — fall through to the generic message below
    }
  }
  const message = error instanceof Error ? error.message : ''
  return message && message !== 'Edge Function returned a non-2xx status code' ? message : fallback
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

/* ---------- Stripe card form (paywall step) ---------- */
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
  const { user, isLoading: authLoading, signOut } = useAuth()
  const { subscribed, trial, isLoading: subLoading } = useSubscription()

  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [bizName, setBizName] = useState('')
  const [bizSite, setBizSite] = useState('')
  const [country, setCountry] = useState(guessCountryFromLocale)
  const [countryOpen, setCountryOpen] = useState(false)
  const [category, setCategory] = useState('')
  const [language, setLanguage] = useState('en')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [phase, setPhase] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  // Which normalized URL analysis has already been kicked off for — guards
  // the debounced auto-start below against firing twice for the same site
  // (e.g. once from typing, once from clicking Continue right after).
  const analysisStartedForUrl = useRef<string | null>(null)
  // Whether the person has manually picked a category chip themselves —
  // once true, the AI's own classification (arriving later, from the
  // slower analyze-website call) no longer overwrites their choice.
  const categoryTouchedRef = useRef(false)
  // Quick unauthenticated scrape fired right after step 2, so the category
  // guess and brand name are already reasonable — "Sweet Déco", not
  // "sweet-deco" (the raw domain slug analyze-website falls back to) —
  // before the full AI pass even starts.
  const [preScraped, setPreScraped] = useState<{ brandName: string; description: string; language: string; cms: string; favicon: string } | null>(null)
  const [faviconFailed, setFaviconFailed] = useState(false)
  // runAnalysis can be triggered from a background timer (see the debounced
  // effect below) and keeps running across renders that happen while it's
  // in flight — reading language/country/category/preScraped directly off
  // its own useCallback closure would risk using whatever those were at the
  // moment it was scheduled, not the freshest values once the pre-scrape
  // that's meant to fill them actually resolves. This ref is always current
  // regardless of which render's closure ends up calling it.
  const latestFormRef = useRef({ language, country, category, preScraped })
  useEffect(() => {
    latestFormRef.current = { language, country, category, preScraped }
  })

  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')
  const [promoInput, setPromoInput] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; percentOff: number | null; amountOff: number | null } | null>(null)

  // Already has a project: paid (or trialing) -> dashboard, nothing left to
  // do here. A project without a subscription is an incomplete signup —
  // but "incomplete" now also covers projects the background auto-analysis
  // created from just a typed URL, before the person ever saw or confirmed
  // anything. Resume at the review step (5), not straight at checkout —
  // jumping straight to payment for something they never actually reviewed
  // is exactly the "why am I suddenly being asked to pay" complaint this
  // was causing.
  const [resumedBilling, setResumedBilling] = useState(false)
  useEffect(() => {
    if (authLoading || !user || subLoading || resumedBilling) return
    supabase.from('projects')
      .select('id, brand_name, name, website_url, domain, business_description, business_type, language, country, detected_cms, competitors, recommendation_example')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1)
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
        setBizSite(existing.website_url || '')
        if (existing.business_type) setCategory(existing.business_type)
        if (existing.language) setLanguage(existing.language)
        if (existing.country && COUNTRIES.some((c) => c.code === existing.country)) setCountry(existing.country)
        setPreScraped({
          brandName: existing.brand_name || existing.name || '',
          description: existing.business_description || '',
          language: existing.language || 'en',
          cms: existing.detected_cms || '',
          favicon: '',
        })
        setAnalysis({
          domain: existing.domain || '',
          brandName: existing.brand_name || existing.name || '',
          description: existing.business_description || '',
          competitors: Array.isArray(existing.competitors) ? existing.competitors : [],
          targetAudiences: [],
          keywords: [],
          language: existing.language || 'en',
          recommendationExample: existing.recommendation_example || '',
          aiEnriched: !!existing.recommendation_example,
        })
        setStep(5)
        // The projects table never stored a favicon column, so a resumed
        // project always came back with none — re-run just the lightweight
        // scrape to backfill it instead of showing the letter fallback.
        if (existing.website_url) {
          setFaviconFailed(false)
          supabase.functions.invoke('internal-scraper', { body: { url: normalizeUrl(existing.website_url) } })
            .then(({ data: scraped }) => {
              if (scraped?.success && scraped.data?.favicon) {
                setPreScraped((prev) => (prev ? { ...prev, favicon: scraped.data.favicon } : prev))
              }
            })
            .catch((e) => console.error('[ONBOARDING] resume favicon backfill failed', e))
        }
        // Older/interrupted projects have no stored recommendation_example
        // (added after they were created) — re-run the real AI analysis so
        // the "what ChatGPT would say" preview always shows genuine AI
        // output instead of permanently falling back to generic copy.
        if (existing.website_url && !existing.recommendation_example) {
          supabase.functions.invoke('analyze-website', { body: { url: normalizeUrl(existing.website_url) } })
            .then(({ data: reanalyzed }) => {
              if (reanalyzed?.success && reanalyzed.aiEnriched && reanalyzed.recommendationExample) {
                setAnalysis((prev) => (prev ? { ...prev, recommendationExample: reanalyzed.recommendationExample, aiEnriched: true } : prev))
                supabase.from('projects').update({ recommendation_example: reanalyzed.recommendationExample }).eq('id', existing.id)
              }
            })
            .catch((e) => console.error('[ONBOARDING] resume recommendation backfill failed', e))
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, subLoading, subscribed, trial, navigate, resumedBilling])

  // Account already exists (fresh signup just resolved, or an OAuth redirect
  // landed back here with a session) and there's no project yet — skip the
  // create-account step instead of showing it again.
  useEffect(() => {
    if (!authLoading && user && step === 1) setStep(2)
  }, [authLoading, user, step])

  // Step 4 (the "reading your site" wait screen) was removed — step 3 now
  // waits inline for the analysis. Keep the numbering of later steps and
  // just collapse it for the progress indicator.
  const displayStep = step > 4 ? step - 1 : step


  /** Cheap keyword heuristic against the scraped description/domain (and,
   * when known, the detected CMS) — a pre-filled guess the user can still
   * override, not a forced choice. The CMS is checked first: a real
   * WooCommerce/Shopify/etc. storefront is a far more reliable e-commerce
   * signal than hoping the homepage copy happens to say "shop" or "cart" —
   * a B2B wholesaler's description ("grossiste en meubles pour
   * professionnels") won't contain either. */
  const guessCategory = (text: string, cms?: string): string => {
    const t = text.toLowerCase()
    const ecommerceCms = ['woocommerce', 'shopify', 'bigcommerce', 'magento', 'prestashop', 'wix']
    if (cms && ecommerceCms.includes(cms.toLowerCase())) return 'E-commerce'
    if (/restaurant|café|resto|food|cuisine|menu|traiteur/.test(t)) return 'Restaurant'
    if (/saas|software|logiciel|platform|plateforme|application saas|api\b/.test(t)) return 'SaaS'
    if (/shop|store|boutique|magasin|e-?commerce|panier|cart|livraison|grossiste|wholesale|mobilier|meuble|produit/.test(t)) return 'E-commerce'
    if (/service|consult|agence|agency|artisan|plombier|électricien|coiffeur|réparation/.test(t)) return 'Local service'
    if (/retail|vente au détail|showroom/.test(t)) return 'Retail store'
    return ''
  }

  /* --- step 1: create the account first — everything after this has a
     real session, so no anonymous-auth workarounds are needed downstream --- */
  const createAccount = async () => {
    if (!email || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters')
      return
    }
    setBusy(true); setError('')
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: email.split('@')[0] } },
      })
      if (signUpError) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw new Error(signUpError.message)
      }
      const { data: sess } = await supabase.auth.getSession()
      if (!sess.session) {
        setError('Check your inbox to confirm your email, then sign in to continue.')
        return
      }
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
    } finally {
      setBusy(false)
    }
  }

  const oauth = async (provider: 'google' | 'apple') => {
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/onboarding` },
    })
    if (e) setError(e.message)
  }

  // Escape hatch for someone signed into the wrong account, or restarting
  // after getting stuck mid-flow — otherwise there's no way out of the
  // wizard once step 1 has passed.
  const handleSignOut = async () => {
    await signOut()
    navigate('/onboarding', { replace: true })
  }

  /* --- right after step 2: no-auth scrape so the category guess and step 5
     preview aren't blank while the full analysis is still loading --- */
  const preScrapeSite = useCallback(async () => {
    const url = normalizeUrl(bizSite)
    if (!url) return
    try {
      // Our own fetch-and-regex scraper — free, no third-party quota, no
      // external API dependency. Firecrawl is kept only as analyze-website's
      // own internal fallback, not called directly from onboarding anymore.
      const { data } = await supabase.functions.invoke('internal-scraper', { body: { url } })
      if (data?.success && data.data) {
        const { brandName, metaDescription, language: detectedLanguage, cms, country: detectedCountry, favicon } = data.data
        setPreScraped({ brandName, description: metaDescription || '', language: detectedLanguage || 'en', cms: cms || '', favicon: favicon || '' })
        setFaviconFailed(false)
        setLanguage(detectedLanguage && LANGUAGES.some((l) => l.code === detectedLanguage) ? detectedLanguage : 'en')
        // Site-stated location (address / hreflang / ccTLD) beats the
        // visitor's own browser locale — the default this state started
        // with — for guessing where the *business* actually is.
        if (detectedCountry && COUNTRIES.some((c) => c.code === detectedCountry)) {
          setCountry(detectedCountry)
        }
        if (!category) {
          const guessed = guessCategory(`${metaDescription || ''} ${url}`, cms)
          if (guessed) setCategory(guessed)
        }
      }
    } catch (e) {
      console.error('[ONBOARDING] pre-scrape failed', e)
    }
  }, [bizSite, category])

  /* --- analyse the site and create the project. Runs in the background as
     soon as a full URL is typed (see the debounced effect below) rather
     than waiting for step 4 — by the time someone clicks through category/
     country/language it's often already done. The account already exists
     by this point (step 1), so this always has a real session — no
     anonymous-call auth drama. Competitor and keyword research (DataForSEO,
     real money) is deliberately NOT triggered here: it only runs once
     payment is confirmed, via the Stripe webhook, so a signup that never
     converts never costs anything beyond this one lightweight AI pass.
     Doesn't navigate on its own — callers (the debounce trigger, step 4's
     entry effect) decide what to do with the result, since this can finish
     while the person is sitting on any step from 2 to 4. --- */
  const runAnalysis = useCallback(async () => {
    if (analyzing || projectId) return
    setAnalyzing(true)
    setError('')
    try {
      setPhase('Reading your website…')
      let data: Record<string, unknown> & { success?: boolean; domain?: string; brandName?: string; description?: string; language?: string; competitors?: string[]; keywords?: unknown[]; recommendationExample?: string; category?: string; aiEnriched?: boolean } = {}
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('analyze-website', {
          body: { url: normalizeUrl(bizSite || bizName) },
        })
        if (fnError) throw fnError
        if (!fnData?.success) throw new Error(fnData?.error || 'Could not analyze your site')
        data = fnData
      } catch (e) {
        console.error('[ONBOARDING] analyze-website failed, falling back to a direct scrape', e)
        const url = normalizeUrl(bizSite || bizName)
        const { data: scraped } = await supabase.functions.invoke('internal-scraper', { body: { url } })
        if (!scraped?.success || !scraped.data) throw e
        data = {
          success: true,
          domain: url.replace(/^https?:\/\//, '').replace(/\/.*$/, ''),
          brandName: scraped.data.brandName,
          description: scraped.data.metaDescription || '',
          language: scraped.data.language || 'en',
          competitors: [],
          keywords: [],
        }
      }

      // Read the freshest values, not whatever this closure had at the
      // moment it was scheduled — see latestFormRef's own comment above.
      const { language: curLanguage, country: curCountry, category: curCategory, preScraped: curPreScraped } = latestFormRef.current

      // The AI actually understands what the business does ("site vitrine
      // professionnel, livré en 48h" -> a web design service, not retail),
      // unlike the fast pre-scrape's keyword-matching guess. Prefer it —
      // but never fight someone who already picked a chip themselves.
      let effectiveCategory = curCategory
      if (data.category && CATEGORIES.includes(data.category) && !categoryTouchedRef.current) {
        effectiveCategory = data.category
        setCategory(data.category)
      }

      // Language normally comes from the pre-scrape (preScrapeSite), which
      // runs as its own separate, earlier call — if that one silently
      // failed (network hiccup, timeout), `language` is still sitting at
      // its hardcoded 'en' default even though this analysis succeeded and
      // knows better. Only step in when there's no pre-scrape result at
      // all — when it did succeed, its content-based detection is already
      // more reliable than analyze-website's own (which just trusts
      // whatever <html lang> the page declares).
      let effectiveLanguage = curLanguage
      if (!curPreScraped && data.language && LANGUAGES.some((l) => l.code === data.language)) {
        effectiveLanguage = data.language
        setLanguage(data.language)
      }

      // analyze-website's AI pass never returns a brandName field at all — only
      // its own naive regex fallback does, and that's the raw domain slug
      // ("sweet-deco") whenever the page's <title> can't be parsed from a
      // plain fetch (any JS-rendered site). Never trust that fallback: prefer
      // what the user actually typed, then the properly-cased name firecrawl
      // already found ("Sweet Déco").
      const goodBrandName = bizName || curPreScraped?.brandName || data.brandName || data.domain
      const fullAnalysis = { ...data, brandName: goodBrandName } as Analysis
      setAnalysis(fullAnalysis)

      setPhase('Creating your workspace…')
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess.session?.user.id
      if (!userId) throw new Error('Session expired — please sign in again')

      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name: goodBrandName,
          website_url: normalizeUrl(bizSite || `https://${data.domain}`),
          domain: data.domain,
          language: effectiveLanguage,
          country: curCountry,
          business_description: data.description || curPreScraped?.description || null,
          business_type: effectiveCategory || null,
          brand_name: goodBrandName,
          competitors: Array.isArray(data.competitors) ? data.competitors : null,
          detected_cms: curPreScraped?.cms || null,
          recommendation_example: data.recommendationExample || null,
          is_active: true,
        })
        .select()
        .single()
      if (projError) throw projError
      setProjectId(project.id)
      setPhase('')

      // Backend orchestration, fire-and-forget: multi-page scraping,
      // competitor keywords, DataForSEO enrichment, then the project_context
      // snapshot every generation function reads from. Without this the
      // context stays empty until someone finds "Refresh project context" in
      // Settings — every piece of content generated in the meantime reads
      // from a near-empty snapshot and gets cached that way. Business
      // analysis itself is skipped inside the pipeline since it just ran
      // above; this only fills in what runAnalysis() doesn't do.
      supabase.functions.invoke('onboarding-pipeline', {
        body: { projectId: project.id, mode: 'full' },
      }).catch((e) => console.error('[ONBOARDING] onboarding-pipeline failed', e))
    } catch (err) {
      setError(await describeFnError(err, 'Something went wrong — please try again'))
      setPhase('')
    } finally {
      setAnalyzing(false)
    }
  }, [analyzing, projectId, bizSite, bizName])

  // Start analysing as soon as a full business name + URL is typed — don't
  // wait for someone to click through category/country/language first.
  // Debounced so it fires once typing settles, not on every keystroke, and
  // guarded by analysisStartedForUrl so it never fires twice for the same
  // site (e.g. once from typing, once from step 2's Continue button below).
  useEffect(() => {
    if (step < 2 || step > 3 || !user) return
    if (!bizName.trim() || !isValidUrl(bizSite)) return
    const url = normalizeUrl(bizSite)
    if (analysisStartedForUrl.current === url) return
    const timer = setTimeout(() => {
      analysisStartedForUrl.current = url
      // Run together instead of sequentially — the AI call is the slow
      // part (several seconds), the plain scrape is sub-second, so it's
      // always done well before runAnalysis reaches its project insert
      // (which is what actually needs its language/country/cms state).
      preScrapeSite()
      runAnalysis()
    }, 700)
    return () => clearTimeout(timer)
  }, [step, user, bizName, bizSite, preScrapeSite, runAnalysis])

  // Sitting on step 4 (either because analysis hasn't finished yet, or the
  // debounce above never got a chance to fire before someone clicked
  // through) → make sure it's actually running, then leave the moment it's
  // done — from here or from wherever the person actually is.
  useEffect(() => {
    if (step === 3 && !analyzing && !projectId) runAnalysis()
  }, [step, analyzing, projectId, runAnalysis])


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
      if (e) throw e
      if (data?.error) throw new Error(data.error)

      if (data.alreadySubscribed) {
        setAppliedDiscount(data.discount ?? null)
        finish()
        return
      }
      setClientSecret(data.clientSecret)
      setAppliedDiscount(data.discount ?? null)
      return true
    } catch (err) {
      setError(await describeFnError(err, 'Could not start checkout — please try again'))
      return false
    } finally {
      setBusy(false)
    }
  }

  /* --- step 5 -> step 6: persist edits, then open the paywall.
     Accepts an explicit id because a caller that just created the project
     in the same tick (runAnalysis via setProjectId) can't rely on the
     `projectId` state closure having caught up yet. --- */
  const openPaywall = async (pid?: string) => {
    const id = pid ?? projectId
    if (id) {
      await supabase.from('projects').update({
        business_type: category || null,
        country,
        language,
      }).eq('id', id)
    }
    if (await refreshSubscription(plan, promoCode)) setStep(6)
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
      if (e) throw e
      if (data?.error) throw new Error(data.error)
      // A 100%-off code settles the invoice at $0 — Stripe activates the
      // subscription immediately with nothing left to confirm, so there's
      // no card form to show at all. Same finish() the CardForm itself
      // calls after a real payment.
      if (data.alreadySubscribed) {
        setAppliedDiscount(data.discount ?? null)
        setPromoCode(code)
        finish()
        return
      }
      setClientSecret(data.clientSecret)
      setAppliedDiscount(data.discount ?? null)
      setPromoCode(code)
    } catch (err) {
      setPromoError(await describeFnError(err, 'Could not apply that code'))
    } finally {
      setPromoBusy(false)
    }
  }

  /* --- step 6 -> step 7: seed the 30-day plan now instead of waiting on the
     cron's small per-tick batches. generate-30-gso-contents is the single
     source of truth for the calendar — one piece/day rotating through
     geo/seo/aeo/local_aeo/shopping. It used to run alongside
     generate-30-days-content(titlesOnly:true), which stamped a real AEO
     answer+article row ("Content locked — subscribe to unlock.") on every
     one of the 30 days regardless of that day's rotation type — that's what
     buried the GEO/SEO/Local AEO/Shopping content under a wall of AEO
     placeholders. 16 slots (4 full days) is as much as one request can
     safely generate before risking a function timeout;
     check-planning-completeness's hourly cron tops up the rest of the
     30-day window from here. Real competitor/keyword research (DataForSEO)
     is NOT triggered here — the Stripe webhook does that once the payment
     this step just took is actually confirmed. --- */
  const finish = async () => {
    setStep(7)
    if (!projectId) return
    try {
      await supabase.functions.invoke('generate-30-gso-contents', {
        body: { projectId, maxSlots: 16 },
      })
    } catch (e) {
      console.error('[ONBOARDING] first generation failed', e)
    }
  }

  const canStartAnalysis = !!bizName.trim() && isValidUrl(bizSite)

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
  const brandDescription = analysis?.description || preScraped?.description || ''
  const brandLanguage = language

  return (
    <div className="apg-wizard-page">
      <div className="apg-wizard">
        <div className="wiz-head">
          <div className="wiz-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BrandMark size={26} />
              <div className="brand-name">AutopilotGEO</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="step-count">Step {displayStep}/{TOTAL_STEPS}</div>
              {user && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', fontFamily: 'inherit',
                  }}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
          <div className="progress">
            <div className="progress-bar" style={{ width: `${(displayStep / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        <div className="step" key={step}>
          {error && <div className="err">{error}</div>}

          {/* STEP 1 — create account first; everything after this has a real session */}
          {step === 1 && (
            <>
              <h1>Create your account</h1>
              <p className="sub">Just this — no card yet. This lets us save your progress as you go.</p>
              <button className="btn btn-social" onClick={() => oauth('google')}>
                <IcGoogle /> Continue with Google
              </button>
              <div className="divider"><span /><em>or</em><span /></div>
              <label className="first">Email</label>
              <input type="email" value={email} placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)} />
              <label>Password</label>
              <input type="password" value={password} placeholder="6+ characters"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createAccount()} />
              <div className="foot-nav">
                <span />
                <button className="btn btn-primary" disabled={busy} onClick={createAccount}>
                  {busy ? 'Creating account…' : <>Continue <IcArrow /></>}
                </button>
              </div>
            </>
          )}

          {/* STEP 2 — business name + website */}
          {step === 2 && (
            <>
              <h1>Let's see how AI talks about your business today</h1>
              <p className="sub">
                No setup — tell us who you are and we'll show you what ChatGPT and Gemini
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
                  disabled={!canStartAnalysis || busy}
                  onClick={async () => {
                    setError(''); setBusy(true)
                    // The debounced effect above already starts both the
                    // scrape and the full analysis shortly after typing
                    // stops — this only actually does anything if someone
                    // clicks through faster than that 700ms window, so the
                    // category guess is still ready by the time step 3 shows.
                    const url = normalizeUrl(bizSite)
                    if (analysisStartedForUrl.current !== url) {
                      analysisStartedForUrl.current = url
                      await preScrapeSite()
                      runAnalysis()
                    }
                    setBusy(false)
                    setStep(3)
                  }}
                >
                  {busy ? 'Reading your site…' : <>Continue <IcArrow /></>}
                </button>
              </div>
              <p className="fine">
                {!canStartAnalysis
                  ? 'We need your business name and site to run the analysis.'
                  : 'Description, sector and language get detected automatically next.'}
              </p>
            </>
          )}

          {/* STEP 3 — category */}
          {step === 3 && (
            <>
              <h1>What kind of business is it?</h1>
              <p className="sub">
                {category
                  ? <>Detected from your site — tap to change if it's off.</>
                  : 'This shapes the tone and the questions we optimize your content for.'}
              </p>

              <div className="card-box" style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 2 }}>
                  {!analysis?.description
                    ? 'Analyzing'
                    : analysis.aiEnriched
                    ? 'What our AI understood'
                    : 'From your site'}
                </div>
                <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>
                  {analysis?.description
                    ? (analysis.description.length > 140
                        ? `${analysis.description.slice(0, 140).trimEnd()}…`
                        : analysis.description)
                    : <span style={{ color: 'var(--ink-soft)' }}>Analyzing your site…</span>}
                </div>
              </div>

              <label className="first">Business category</label>
              <div className="chip-grid" style={{ marginBottom: 14 }}>
                {CATEGORIES.map((c) => (
                  <button key={c} className={`chip-opt${category === c ? ' sel' : ''}`}
                    onClick={() => { categoryTouchedRef.current = true; setCategory(c) }}>{c}</button>
                ))}
              </div>

              <label>Content language — detected from your site</label>
              <div className="chip-grid" style={{ marginBottom: 14 }}>
                {LANGUAGES.map((l) => (
                  <button key={l.code} className={`chip-opt${language === l.code ? ' sel' : ''}`}
                    onClick={() => setLanguage(l.code)}>{l.name}</button>
                ))}
              </div>

              <div className="foot-nav">
                <button className="btn-ghost" onClick={() => setStep(2)}>Back</button>
                <button className="btn btn-primary" disabled={!projectId} onClick={() => setStep(5)}>
                  {projectId ? <>Continue <IcArrow /></> : (phase || 'Reading your site…')}
                </button>
              </div>

            </>
          )}




          {/* STEP 5 — the "wow" preview, still before payment */}
          {step === 5 && (analysis || preScraped) && (
            <>
              <h1>Here's what we found for {brand}</h1>
              <p className="sub">This is a real preview generated from your site — this is what's at stake.</p>

              <div className="brand-snap">
                <div className="brand-snap-logo">
                  {preScraped?.favicon && !faviconFailed ? (
                    <img
                      src={preScraped.favicon}
                      alt=""
                      style={{ width: '70%', height: '70%', objectFit: 'contain', borderRadius: 4 }}
                      onError={() => setFaviconFailed(true)}
                    />
                  ) : (
                    brand.trim().charAt(0).toUpperCase() || '?'
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="brand-snap-name">{brand}</div>
                  <div className="brand-snap-desc">
                    {brandDescription || `Detected from ${bizSite.replace(/^https?:\/\//, '')}`}
                  </div>
                  <div className="brand-snap-tags">
                    {category && <span className="snap-tag">{category}</span>}
                    {brandLanguage && <span className="snap-tag">{brandLanguage.toUpperCase()}</span>}
                    {preScraped?.cms && <span className="snap-tag">Built with {preScraped.cms}</span>}
                  </div>
                </div>
              </div>

              <div className="compare-preview">
                <div className="prev-card before">
                  <div className="lbl">{language === 'fr' ? "Aujourd'hui, sans AutopilotGEO" : 'Today, without AutopilotGEO'}</div>
                  <div className="txt">
                    {language === 'fr' ? (
                      <>ChatGPT n'a jamais entendu parler de <b>{brand}</b>. Quand on lui demande une recommandation,
                      c'est un concurrent qui est cité{analysis?.competitors?.length ? <> — à commencer par <b>{analysis.competitors[0]}</b></> : null}.</>
                    ) : (
                      <>ChatGPT has never heard of <b>{brand}</b>. When someone asks for a recommendation,
                      a competitor gets named instead
                      {analysis?.competitors?.length ? <> — starting with <b>{analysis.competitors[0]}</b></> : null}.</>
                    )}
                  </div>
                </div>
                <div className="prev-card after">
                  <div className="lbl">{language === 'fr' ? 'Avec AutopilotGEO, dans ~2 semaines' : 'With AutopilotGEO, in ~2 weeks'}</div>
                  <div className="txt">
                    {analysis?.aiEnriched && analysis?.recommendationExample ? (
                      <>"{analysis.recommendationExample}"</>
                    ) : language === 'fr' ? (
                      <>Une vraie recommandation rédigée par l'IA pour <b>{brand}</b> — générée à partir de votre vrai site, pas un texte générique.</>
                    ) : (
                      <>A real AI-written recommendation for <b>{brand}</b> — generated from your actual site, not a placeholder.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Honest skeleton teaser — no fabricated competitor names or
                  keyword numbers. The real report (DataForSEO) only runs once
                  payment is confirmed, via the Stripe webhook — showing fake
                  specifics here would risk not matching what gets generated. */}
              <div className="locked-card">
                <div className="locked-blur">
                  <div className="skel-logos">
                    <span className="skel-circle" /><span className="skel-circle" /><span className="skel-circle" />
                  </div>
                  <div className="skel-row"><span className="skel-bar" style={{ width: '38%' }} /><span className="skel-bar" style={{ width: '28%' }} /><span className="skel-bar" style={{ width: '22%' }} /></div>
                  <div className="skel-row"><span className="skel-bar" style={{ width: '46%' }} /><span className="skel-bar" style={{ width: '20%' }} /><span className="skel-bar" style={{ width: '18%' }} /></div>
                  <div className="skel-row"><span className="skel-bar" style={{ width: '34%' }} /><span className="skel-bar" style={{ width: '24%' }} /><span className="skel-bar" style={{ width: '26%' }} /></div>
                </div>
                <div className="locked-overlay">
                  <IcLock />
                  <div>
                    <strong>Competitor &amp; keyword report not run yet</strong>
                    <span>We generate this from your real site right after payment — no guessing beforehand</span>
                  </div>
                </div>
              </div>

              <div className="foot-nav">
                <button className="btn-ghost" onClick={() => setStep(3)}>Back</button>
                <button className="btn btn-gold" disabled={busy} onClick={() => openPaywall()}>
                  {busy ? 'Preparing…' : <>Claim this visibility <IcArrow /></>}
                </button>
              </div>
            </>
          )}

          {/* STEP 6 — paywall with Stripe Elements, no trial */}
          {step === 6 && (
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

              <button className="btn-ghost" style={{ width: '100%', marginTop: 6 }} onClick={() => setStep(5)}>
                Back
              </button>
            </>
          )}

          {/* STEP 7 — success, technical connection happens after this */}
          {step === 7 && (
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
