export default function Landing() {
  return (
    <div style={{minHeight:'100vh',background:'var(--paper)'}}>
      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:30,background:'rgba(245,246,251,.9)',backdropFilter:'blur(10px)',borderBottom:'1px solid var(--line)'}}>
        <div style={{maxWidth:'1180px',margin:'0 auto',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'10px',background:'linear-gradient(150deg,#5f6ce0,#1a2058)',display:'flex',alignItems:'center',justifyContent:'center',color:'#e9dfa8',fontSize:'16px'}}>
              <svg viewBox="0 0 100 100" style={{width:'18px',height:'18px'}}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="#e9dfa8" strokeWidth="1.6" opacity=".85"/>
                <path d="M50 8 C54.5 32 57.5 39 84 44 C57.5 49 54.5 56 50 80 C45.5 56 42.5 49 16 44 C42.5 39 45.5 32 50 8 Z" fill="#e9dfa8"/>
              </svg>
            </div>
            <div><div style={{fontSize:'9.5px',letterSpacing:'.18em',color:'#c79a2e',fontWeight:'700'}}>AUTOPILOT</div><div style={{fontWeight:'700',fontSize:'16px',color:'var(--ink)'}}>GEO</div></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <a href="/auth" style={{fontWeight:'600',fontSize:'13.5px',padding:'10px 15px',borderRadius:'10px',border:'1px solid var(--line)',background:'transparent',color:'var(--ink)',textDecoration:'none'}}>Open App</a>
            <a href="/onboarding" style={{fontWeight:'600',fontSize:'13.5px',padding:'10px 15px',borderRadius:'10px',border:'none',background:'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:'#3a2c05',textDecoration:'none'}}>Start free trial →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header style={{padding:'44px 0 24px',textAlign:'center',maxWidth:'1180px',margin:'0 auto',paddingLeft:'20px',paddingRight:'20px'}}>
        <h1 style={{fontSize:'30px',maxWidth:'820px',margin:'0 auto 16px',fontFamily:'Space Grotesk',fontWeight:'700'}}>
          The #1 GEO platform.<br/>Win <span style={{background:'linear-gradient(120deg,#4550b0,#8992d6)',backgroundClip:'text',WebkitBackgroundClip:'text',color:'transparent'}}>generative search</span>
        </h1>
        <p style={{fontSize:'15px',color:'var(--ink-soft)',maxWidth:'620px',margin:'0 auto 26px'}}>
          AutopilotGEO creates, optimizes and publishes content that ChatGPT, Gemini, and Perplexity cite — so customers find you when they ask AI.
        </p>
        <div style={{display:'flex',justifyContent:'center',gap:'10px',marginBottom:'12px'}}>
          <a href="/onboarding" style={{fontWeight:'600',fontSize:'13.5px',padding:'10px 15px',borderRadius:'10px',border:'none',background:'linear-gradient(120deg,#f3e3ad,#c79a2e)',color:'#3a2c05',textDecoration:'none'}}>Start GEO free trial →</a>
          <a href="#" style={{fontWeight:'600',fontSize:'13.5px',padding:'10px 15px',borderRadius:'10px',border:'1px solid var(--line)',background:'transparent',color:'var(--ink)',textDecoration:'none'}}>See in action</a>
        </div>
        <div style={{display:'flex',justifyContent:'center',gap:'26px',marginTop:'36px',flexWrap:'wrap'}}>
          <div><div style={{fontFamily:'Space Grotesk',fontSize:'21px',fontWeight:'700'}}>500+</div><div style={{fontSize:'11.5px',color:'var(--ink-soft)'}}>active sites on AI</div></div>
          <div><div style={{fontFamily:'Space Grotesk',fontSize:'21px',fontWeight:'700'}}>4.9/5</div><div style={{fontSize:'11.5px',color:'var(--ink-soft)'}}>founder reviews</div></div>
          <div><div style={{fontFamily:'Space Grotesk',fontSize:'21px',fontWeight:'700'}}>+60%</div><div style={{fontSize:'11.5px',color:'var(--ink-soft)'}}>avg traffic growth</div></div>
        </div>
      </header>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid var(--line)',padding:'60px 0 30px',textAlign:'center',color:'var(--ink-soft)',fontSize:'12.5px'}}>
        © 2026 AutopilotGEO. All rights reserved.
      </footer>
    </div>
  )
}
