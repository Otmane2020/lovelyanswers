import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [businessCategory, setBusinessCategory] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Auto-advance from loading step after 3 seconds
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => setStep(4), 3000)
      return () => clearTimeout(timer)
    }
  }, [step])

  const categories = [
    'E-commerce', 'SaaS', 'Local Business', 'Agency', 'Marketplace', 'Content',
    'Service Provider', 'Consulting', 'Education', 'Healthcare', 'Finance', 'Other'
  ]

  const handleSignup = async () => {
    if (!email || !password) {
      setError('Email and password required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: businessName,
            business_category: businessCategory,
          }
        }
      })

      if (signupError) throw signupError
      setStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--paper)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
      {/* Progress bar */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:'4px',background:'linear-gradient(90deg,#2e3a8c 0%,#2e3a8c ' + (step*16.67) + '%,#e4e5f0 ' + (step*16.67) + '%,#e4e5f0 100%)'}}>
      </div>

      <div style={{maxWidth:'540px',width:'100%'}}>
        {/* Step 1: Business Name */}
        {step === 1 && (
          <div style={{textAlign:'center',animation:'fadeIn 0.3s ease'}}>
            <div style={{width:'60px',height:'60px',borderRadius:'16px',background:'linear-gradient(150deg,#5f6ce0,#1a2058)',display:'flex',alignItems:'center',justifyContent:'center',color:'#e9dfa8',margin:'0 auto 24px'}}>
              <svg viewBox="0 0 100 100" style={{width:'32px',height:'32px'}}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e9dfa8" strokeWidth="1.6" opacity=".85"/>
                <path d="M50 8 C54.5 32 57.5 39 84 44 C57.5 49 54.5 56 50 80 C45.5 56 42.5 49 16 44 C42.5 39 45.5 32 50 8 Z" fill="#e9dfa8"/>
              </svg>
            </div>
            <h1 style={{fontSize:'28px',fontWeight:'700',margin:'0 0 12px',color:'var(--ink)'}}>What's your business name?</h1>
            <p style={{fontSize:'15px',color:'var(--ink-soft)',margin:'0 0 28px'}}>We'll use this to customize your AI visibility audit</p>
            <input type="text" placeholder="Your business name..." value={businessName} onChange={(e) => setBusinessName(e.target.value)} style={{width:'100%',padding:'12px 16px',fontSize:'15px',border:'1px solid var(--line)',borderRadius:'10px',marginBottom:'16px'}} />
            <button onClick={() => businessName.trim() && setStep(2)} style={{width:'100%',padding:'12px',fontSize:'15px',fontWeight:'600',background:'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:'#3a2c05',border:'none',borderRadius:'10px',cursor:'pointer'}} disabled={!businessName.trim()}>Continue →</button>
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div style={{textAlign:'center',animation:'fadeIn 0.3s ease'}}>
            <h1 style={{fontSize:'28px',fontWeight:'700',margin:'0 0 12px',color:'var(--ink)'}}>What category best fits?</h1>
            <p style={{fontSize:'15px',color:'var(--ink-soft)',margin:'0 0 24px'}}>Help us tailor your content strategy</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              {categories.map(cat => (
                <button key={cat} onClick={() => {setBusinessCategory(cat); setStep(3)}} style={{padding:'16px',border:businessCategory === cat ? 'none' : '1px solid var(--line)',background:businessCategory === cat ? 'linear-gradient(120deg,#2e3a8c,#1f2761)' : 'var(--surface)',color:businessCategory === cat ? '#fff' : 'var(--ink)',borderRadius:'10px',fontSize:'14px',fontWeight:'600',cursor:'pointer',transition:'all 0.2s'}}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Loading */}
        {step === 3 && (
          <div style={{textAlign:'center',animation:'fadeIn 0.3s ease',paddingTop:'60px'}}>
            <div style={{width:'80px',height:'80px',margin:'0 auto 24px',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg style={{width:'80px',height:'80px',animation:'spin 2s linear infinite'}} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="url(#grad)" strokeWidth="3"/>
                <defs><linearGradient id="grad"><stop offset="0%" style={{stopColor:'#2e3a8c',stopOpacity:1}}/><stop offset="100%" style={{stopColor:'#2e3a8c',stopOpacity:0.1}}/></linearGradient></defs>
              </svg>
            </div>
            <h2 style={{fontSize:'24px',fontWeight:'700',margin:'0 0 8px'}}>Analyzing your business...</h2>
            <p style={{fontSize:'14px',color:'var(--ink-soft)',margin:'0'}}>This usually takes 30-45 seconds</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Step 4: Before/After Preview */}
        {step === 4 && (
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <h1 style={{fontSize:'28px',fontWeight:'700',margin:'0 0 24px',color:'var(--ink)'}}>Here's your potential</h1>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'28px'}}>
              <div style={{background:'var(--red-soft)',border:'1px solid var(--line)',borderRadius:'12px',padding:'20px',textAlign:'center'}}>
                <div style={{fontSize:'36px',fontWeight:'700',color:'var(--red)',marginBottom:'8px'}}>0</div>
                <div style={{fontSize:'13px',color:'var(--ink-soft)'}}>AI mentions today</div>
              </div>
              <div style={{background:'var(--green-soft)',border:'1px solid var(--line)',borderRadius:'12px',padding:'20px',textAlign:'center'}}>
                <div style={{fontSize:'36px',fontWeight:'700',color:'var(--green)',marginBottom:'8px'}}>12-15</div>
                <div style={{fontSize:'13px',color:'var(--ink-soft)'}}>In 90 days</div>
              </div>
            </div>
            <div style={{background:'var(--primary-soft)',border:'1px solid var(--line)',borderRadius:'12px',padding:'16px',marginBottom:'28px'}}>
              <div style={{fontSize:'13px',fontWeight:'600',color:'var(--primary)',marginBottom:'8px'}}>📈 Expected impact</div>
              <div style={{fontSize:'15px',color:'var(--ink)'}}>
                Your {businessCategory} will be recommended by ChatGPT, Gemini & Perplexity within 90 days
              </div>
            </div>
            <button onClick={() => setStep(5)} style={{width:'100%',padding:'12px',fontSize:'15px',fontWeight:'600',background:'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:'#3a2c05',border:'none',borderRadius:'10px',cursor:'pointer',marginBottom:'12px'}}>Get Started Free →</button>
            <button onClick={() => navigate('/auth')} style={{width:'100%',padding:'12px',fontSize:'15px',fontWeight:'600',background:'transparent',color:'var(--ink)',border:'1px solid var(--line)',borderRadius:'10px',cursor:'pointer'}}>I already have an account</button>
          </div>
        )}

        {/* Step 5: Create Account */}
        {step === 5 && (
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <h1 style={{fontSize:'28px',fontWeight:'700',margin:'0 0 8px',color:'var(--ink)'}}>Create your account</h1>
            <p style={{fontSize:'14px',color:'var(--ink-soft)',margin:'0 0 20px'}}>No credit card required • Cancel anytime</p>
            {error && <div style={{background:'var(--red-soft)',color:'var(--red)',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px'}}>{error}</div>}
            <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{width:'100%',padding:'12px 16px',fontSize:'15px',border:'1px solid var(--line)',borderRadius:'10px',marginBottom:'12px',boxSizing:'border-box'}} />
            <input type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} style={{width:'100%',padding:'12px 16px',fontSize:'15px',border:'1px solid var(--line)',borderRadius:'10px',marginBottom:'20px',boxSizing:'border-box'}} />
            <button onClick={handleSignup} disabled={loading} style={{width:'100%',padding:'12px',fontSize:'15px',fontWeight:'600',background:loading ? '#ccc' : 'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:loading ? 'var(--ink-soft)' : '#3a2c05',border:'none',borderRadius:'10px',cursor:loading ? 'default' : 'pointer'}}>
              {loading ? 'Creating account...' : 'Get Free Access →'}
            </button>
            <div style={{fontSize:'12px',color:'var(--ink-soft)',textAlign:'center',marginTop:'16px'}}>
              By signing up, you agree to our Terms • Privacy Policy
            </div>
          </div>
        )}

        {/* Step 6: Success */}
        {step === 6 && (
          <div style={{textAlign:'center',animation:'fadeIn 0.3s ease',paddingTop:'60px'}}>
            <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'var(--green-soft)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="var(--green)" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h1 style={{fontSize:'28px',fontWeight:'700',margin:'0 0 12px',color:'var(--ink)'}}>Welcome to AutoPilot GEO!</h1>
            <p style={{fontSize:'15px',color:'var(--ink-soft)',margin:'0 0 28px'}}>Your account is ready. Let's get you ranking.</p>
            <button onClick={() => navigate('/geo')} style={{width:'100%',padding:'12px',fontSize:'15px',fontWeight:'600',background:'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:'#3a2c05',border:'none',borderRadius:'10px',cursor:'pointer'}}>Go to Dashboard →</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        :root { --paper: #f5f6fb; --surface: #ffffff; --line: #e4e5f0; --ink: #14162e; --ink-soft: #585b78; --primary: #2e3a8c; --primary-soft: #eef0fb; --green: #1f8a5f; --green-soft: #e9f7f0; --red: #c23b3b; --red-soft: #fbeaea; }
      `}</style>
    </div>
  )
}
