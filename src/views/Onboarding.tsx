import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useCreateProject } from '@/hooks/useProjects'
import { useAnalytics } from '@/hooks/useAnalytics'
import { BrandMark, themeVars } from '@/components/brand/BrandMark'

interface Analysis {
  domain: string
  brandName: string
  description: string
  competitors: string[]
  targetAudiences: string[]
  keywords: { keyword: string; volume?: number }[] | string[]
  language: string
}

function normalizeUrl(raw: string) {
  const t = raw.trim()
  if (!t) return ''
  return /^https?:\/\//i.test(t) ? t : `https://${t}`
}

function isValidUrl(raw: string) {
  try {
    const u = new URL(normalizeUrl(raw))
    return !!u.hostname && u.hostname.includes('.')
  } catch {
    return false
  }
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const createProject = useCreateProject()
  const { track } = useAnalytics()

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [phase, setPhase] = useState('')

  // Already signed in with a project? Straight to the dashboard.
  useEffect(() => {
    if (authLoading || !user) return
    supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) navigate('/geo', { replace: true })
      })
  }, [authLoading, user, navigate])

  const runAnalysis = async () => {
    setStep(3)
    setError('')
    try {
      setPhase('Fetching your site…')
      const { data, error: fnError } = await supabase.functions.invoke('analyze-website', {
        body: { url: normalizeUrl(websiteUrl) },
      })
      if (fnError) throw new Error(fnError.message || 'Could not analyze your site')
      if (!data?.success) throw new Error(data?.error || 'Could not analyze your site')

      setPhase('Creating your project…')
      const project = await createProject.mutateAsync({
        name: data.brandName || data.domain,
        website_url: normalizeUrl(websiteUrl),
        domain: data.domain,
        language: data.language || 'en',
        business_description: data.description || undefined,
        brand_name: data.brandName || undefined,
        competitors: Array.isArray(data.competitors) ? data.competitors : undefined,
      })

      track('signup_completed', { domain: data.domain })
      setAnalysis(data as Analysis)
      if (project) setStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep(2)
    }
  }

  const handleUrlSubmit = () => {
    if (!isValidUrl(websiteUrl)) {
      setError('Enter a valid website address, e.g. yourstore.com')
      return
    }
    setError('')
    track('signup_started', { domain: websiteUrl })
    // Analysis needs an authenticated session — sign in first if needed.
    if (user) runAnalysis()
    else setStep(2)
  }

  const handleSignup = async () => {
    if (!email || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters')
      return
    }
    setBusy(true)
    setError('')
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split('@')[0] } },
      })

      // Existing account? Sign in instead of failing.
      if (signUpError) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw new Error(signUpError.message)
      }

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        setError('Check your inbox to confirm your email, then sign in to continue.')
        setBusy(false)
        return
      }

      setBusy(false)
      await runAnalysis()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account')
      setBusy(false)
    }
  }

  const keywordList = (analysis?.keywords || []).map((k: any) =>
    typeof k === 'string' ? k : k.keyword
  )

  return (
    <div style={{ ...themeVars, minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', fontFamily: 'Inter, sans-serif', color: 'var(--ink)' }}>
      {/* progress */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', background: 'var(--line)' }}>
        <div style={{ height: '100%', width: `${step * 25}%`, background: 'linear-gradient(90deg,#2e3a8c,#5f6ce0)', transition: 'width .4s ease' }} />
      </div>

      <div style={{ marginTop: '44px', marginBottom: '32px' }}>
        <BrandMark size={40} withText />
      </div>

      <div style={{ maxWidth: '520px', width: '100%' }}>
        {error && (
          <div style={{ background: 'var(--red-soft)', color: 'var(--red)', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', border: '1px solid #f1cccc' }}>
            {error}
          </div>
        )}

        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', margin: '0 0 10px' }}>
              What's your website?
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', margin: '0 0 24px' }}>
              We'll analyze it and show you how AI assistants currently see your business.
            </p>
            <input
              type="url"
              autoFocus
              placeholder="yourstore.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              style={inputStyle}
            />
            <button onClick={handleUrlSubmit} style={goldBtn} disabled={!websiteUrl.trim()}>
              Analyze my site →
            </button>
            <p style={{ fontSize: '12px', color: 'var(--ink-soft)', textAlign: 'center', marginTop: '14px' }}>
              Free · No credit card required
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', margin: '0 0 10px' }}>
              Create your account
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', margin: '0 0 24px' }}>
              So we can save the analysis of <b style={{ color: 'var(--ink)' }}>{websiteUrl}</b> to your workspace.
            </p>
            <input type="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="Choose a password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSignup()} style={inputStyle} />
            <button onClick={handleSignup} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Creating account…' : 'Create account & analyze →'}
            </button>
            <button onClick={() => navigate('/auth')} style={ghostBtn}>I already have an account</button>
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <svg style={{ width: '72px', height: '72px', margin: '0 auto 24px', animation: 'apgspin 1.4s linear infinite' }} viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="var(--line)" strokeWidth="4" />
              <circle cx="25" cy="25" r="20" fill="none" stroke="#2e3a8c" strokeWidth="4" strokeDasharray="90 130" strokeLinecap="round" />
            </svg>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '22px', margin: '0 0 8px' }}>Analyzing your site…</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-soft)', margin: 0 }}>{phase || 'This takes about 30 seconds'}</p>
            <style>{`@keyframes apgspin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {step === 4 && analysis && (
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', margin: '0 0 10px' }}>
              Here's what we found
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--ink-soft)', margin: '0 0 22px' }}>
              Your workspace for <b style={{ color: 'var(--ink)' }}>{analysis.brandName || analysis.domain}</b> is ready.
            </p>

            <div style={cardStyle}>
              <div style={cardLabel}>Business</div>
              <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0, color: 'var(--ink-soft)' }}>
                {analysis.description || 'No description detected — you can add one in Settings.'}
              </p>
            </div>

            {keywordList.length > 0 && (
              <div style={cardStyle}>
                <div style={cardLabel}>Keywords we'll target ({keywordList.length})</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {keywordList.slice(0, 8).map((k: string) => (
                    <span key={k} style={{ fontSize: '12.5px', fontWeight: 600, padding: '5px 11px', borderRadius: '20px', background: 'var(--primary-soft)', color: 'var(--primary)' }}>{k}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.competitors?.length > 0 && (
              <div style={cardStyle}>
                <div style={cardLabel}>Competitors detected</div>
                <div style={{ fontSize: '13.5px', color: 'var(--ink-soft)' }}>{analysis.competitors.slice(0, 5).join(' · ')}</div>
              </div>
            )}

            <button onClick={() => navigate('/geo')} style={{ ...goldBtn, marginTop: '8px' }}>
              Go to my dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px', fontSize: '15px', border: '1px solid var(--line)',
  borderRadius: '10px', marginBottom: '12px', boxSizing: 'border-box', fontFamily: 'inherit',
  background: 'var(--surface)', color: 'var(--ink)',
}

const goldBtn: React.CSSProperties = {
  width: '100%', padding: '13px', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
  background: 'linear-gradient(120deg,#f3e3ad,#c79a2e)', color: '#3a2c05', border: 'none',
  borderRadius: '10px', cursor: 'pointer',
}

const ghostBtn: React.CSSProperties = {
  width: '100%', padding: '13px', fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
  background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)',
  borderRadius: '10px', cursor: 'pointer', marginTop: '10px',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '14px',
  padding: '18px', marginBottom: '12px',
}

const cardLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase',
  color: 'var(--ink-soft)', marginBottom: '10px',
}
