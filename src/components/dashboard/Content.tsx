import { useState } from 'react'
import { IconFlame, IconFile, IconMessage, IconTag, IconList, IconCalendar } from './Icons'

export function Content() {
  const [viewMode, setViewMode] = useState<'list' | 'cal'>('list')

  return (
    <section>
      <div className="top-header">
        <h1>Content</h1>
        <p>One single stream, one piece a day — no more choosing between SEO, AEO or GEO, it's all just GEO now</p>
      </div>

      <div className="card" style={{marginBottom:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'14px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
          <div className="icon-tile gold" style={{width:'46px', height:'46px'}}>
            <IconFlame />
          </div>
          <div>
            <div style={{fontWeight:'700', fontSize:'14.5px'}}>Current pace: 1 piece of content a day</div>
            <div style={{fontSize:'12.5px', color:'var(--ink-soft)'}}>
              Each piece is written once and works everywhere — your site, ChatGPT, Gemini, Perplexity. That's what GEO means: one asset, optimized for every generative engine at once.
            </div>
          </div>
        </div>
        <div style={{display:'flex', gap:'5px'}}>
          <span className="dot" style={{width:'22px', height:'8px', borderRadius:'4px', background:'var(--green)'}}></span>
          <span className="dot" style={{width:'22px', height:'8px', borderRadius:'4px', background:'var(--green)'}}></span>
          <span className="dot" style={{width:'22px', height:'8px', borderRadius:'4px', background:'var(--green)'}}></span>
          <span className="dot" style={{width:'22px', height:'8px', borderRadius:'4px', background:'var(--amber)'}}></span>
          <span className="dot" style={{width:'22px', height:'8px', borderRadius:'4px', background:'#eceefa'}}></span>
        </div>
      </div>

      <div className="filters">
        <button
          className={`chip ${viewMode === 'list' ? '' : 'off'}`}
          onClick={() => setViewMode('list')}
        >
          <IconList />
          List
        </button>
        <button
          className={`chip ${viewMode === 'cal' ? '' : 'off'}`}
          onClick={() => setViewMode('cal')}
        >
          <IconCalendar />
          Calendar
        </button>
        <span style={{flex:1}}></span>
        <span className="chip off">Live (169)</span>
        <span className="chip off">Waiting (169)</span>
        <span className="chip off">Draft (12)</span>
      </div>

      {viewMode === 'list' && (
        <div className="card" id="view-list">
          <div className="tbl-wrap">
            <table>
              <tr>
                <th>Content</th>
                <th>Format</th>
                <th>Where it works</th>
                <th>Status</th>
                <th></th>
              </tr>
              <tr>
                <td>How to choose the right corner sofa</td>
                <td><span className="src-tag"><IconFile /> Article · GEO</span></td>
                <td className="src-tag">Your site · ChatGPT</td>
                <td><span className="status wait">Waiting</span></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
              <tr>
                <td>Do you deliver furniture to homes?</td>
                <td><span className="src-tag"><IconMessage /> Answer · GEO</span></td>
                <td className="src-tag">ChatGPT · Perplexity</td>
                <td><span className="status live">Live</span></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
              <tr>
                <td>Product page — Solid oak coffee table</td>
                <td><span className="src-tag"><IconTag /> Product page · GEO</span></td>
                <td className="src-tag">Your site · Google</td>
                <td><span className="status live">Live</span></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
              <tr>
                <td>Design furniture in Montreuil: the 2026 guide</td>
                <td><span className="src-tag"><IconFile /> Article · GEO</span></td>
                <td className="src-tag">Your site</td>
                <td><span className="status draft">Draft</span></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
              <tr>
                <td>What are your weekend hours?</td>
                <td><span className="src-tag"><IconMessage /> Answer · GEO</span></td>
                <td className="src-tag">Google · Gemini</td>
                <td><span className="status live">Live</span></td>
                <td><button className="btn btn-ghost btn-sm">View</button></td>
              </tr>
            </table>
          </div>
        </div>
      )}

      <div className="section-label">History</div>
      <div className="card">
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--green)'}}></span>
          <span className="t-title">Aug 4 — "Do you deliver furniture to homes?" published</span>
          <span className="t-meta">GEO</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--green)'}}></span>
          <span className="t-title">Aug 3 — "Solid oak coffee table" published</span>
          <span className="t-meta">GEO</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--green)'}}></span>
          <span className="t-title">Aug 2 — "Weekend hours" published</span>
          <span className="t-meta">GEO</span>
        </div>
        <div className="task-row">
          <span className="task-dot" style={{background:'var(--amber)'}}></span>
          <span className="t-title">Aug 1 — "Design furniture in Montreuil guide" waiting</span>
          <span className="t-meta">GEO</span>
        </div>
      </div>
    </section>
  )
}
