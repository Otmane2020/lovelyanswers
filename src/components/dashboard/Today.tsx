export function Today() {
  return (
    <section>
      <div className="top-header">
        <h1>Good morning, Pierre</h1>
        <p>Here's what's worth your attention today</p>
      </div>

      <div className="impact-hero">
        <div className="split">
          <div>
            <div className="num mono">27</div>
            <div className="lbl">people found your store through an AI this month</div>
          </div>
          <div>
            <div className="num mono">+3×</div>
            <div className="lbl">visibility vs. last month</div>
          </div>
        </div>
        <button className="btn btn-primary" style={{background:'#fff', color:'var(--primary-deep)'}}>
          See details →
        </button>
      </div>

      <div className="action-banner">
        <div className="icon">⚠</div>
        <div className="body">
          <h3>169 pieces of content are ready, but your site isn't connected</h3>
          <p>Nothing publishes until it's linked. Takes about 5 minutes, or we'll do it for you.</p>
        </div>
        <button className="btn btn-ghost amber btn-sm">Do it for me</button>
        <button className="btn btn-primary btn-sm">Connect my site</button>
      </div>

      <div className="card" style={{marginBottom:'20px'}}>
        <div className="card-head">
          <div>
            <h2>Published automatically</h2>
            <p className="sub">Nothing to approve — everything goes live on its own, every morning at 6am</p>
          </div>
          <span className="pill">✓ 2 today</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--green)'}}></span>
          <span className="t-title">Article "How to choose the right corner sofa" — published to your site at 6:02am</span>
          <span className="t-meta">Content →</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--green)'}}></span>
          <span className="t-title">Answer "Do you deliver to homes?" — live on ChatGPT and Perplexity</span>
          <span className="t-meta">Content →</span>
        </div>
      </div>

      <div className="card" style={{marginBottom:'20px'}}>
        <h2>Needs your input</h2>
        <p className="sub">Only the calls an AI shouldn't make on your behalf</p>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--red)'}}></span>
          <span className="t-title">Your Sunday hours don't match between Google and your site</span>
          <span className="t-meta">Presence →</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--amber)'}}></span>
          <span className="t-title">Reply to Sophie M.'s Google review (3★) — that's your voice, not ours</span>
          <span className="t-meta">Presence →</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Potential reach</h2>
              <p className="sub">Estimated monthly impressions</p>
            </div>
          </div>
          <svg viewBox="0 0 560 150" width="100%" height="130">
            <polyline points="0,110 90,88 180,74 270,60 360,46 450,32 540,18" fill="none" stroke="#c3c8ef" strokeWidth="2.5" strokeDasharray="6,5"/>
            <polyline points="0,120 90,116 180,113 270,109 360,105 450,100 540,95" fill="none" stroke="#2e3a8c" strokeWidth="3"/>
            <circle cx="540" cy="95" r="4.5" fill="#2e3a8c"/>
          </svg>
          <div className="legend">
            <span><i className="dot" style={{background:'#2e3a8c'}}></i>Current pace</span>
            <span><i className="dot" style={{background:'#c3c8ef'}}></i>Once your content is live</span>
          </div>
        </div>
        <div className="card">
          <h2>What this means</h2>
          <p className="sub">In plain terms</p>
          <p style={{fontSize:'13.5px', color:'var(--ink-soft)', lineHeight:'1.6'}}>
            Your reach could triple in 6 months — but the dotted line only kicks in once your 169 waiting pieces of content actually go live on your site.
          </p>
        </div>
      </div>
    </section>
  )
}
