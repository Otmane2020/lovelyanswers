import { IconMessage, IconChart } from './Icons'

export function Results() {
  return (
    <section>
      <div className="top-header">
        <h1>Results</h1>
        <p>Where you show up, and what AI actually says about you</p>
      </div>

      <div className="section-label">Visibility by assistant</div>
      <div className="gauges">
        <div className="gauge-card">
          <div className="ring" style={{background:'conic-gradient(#1f8a5f 0% 95%, #eceefa 95% 100%)'}}>
            <span className="ring-val">95%</span>
          </div>
          <div>
            <div className="g-name">ChatGPT</div>
            <div className="g-check">✓ Up to date</div>
          </div>
        </div>
        <div className="gauge-card">
          <div className="ring" style={{background:'conic-gradient(#2e3a8c 0% 89%, #eceefa 89% 100%)'}}>
            <span className="ring-val">89%</span>
          </div>
          <div>
            <div className="g-name">Gemini</div>
            <div className="g-check">✓ Up to date</div>
          </div>
        </div>
        <div className="gauge-card">
          <div className="ring" style={{background:'conic-gradient(#4a58c9 0% 82%, #eceefa 82% 100%)'}}>
            <span className="ring-val">82%</span>
          </div>
          <div>
            <div className="g-name">Perplexity</div>
            <div className="g-check">✓ Up to date</div>
          </div>
        </div>
      </div>

      <div className="section-label">What AI is actually saying</div>
      <div className="answer-mock">
        <div className="q">
          <IconMessage />
          "Where can I get a custom corner sofa in Montreuil?"
        </div>
        <div className="a">
          Several shops in the area offer custom builds, including <b>Sweet Déco</b>, known for personal guidance and clearly stated build times...
        </div>
      </div>
      <div className="answer-mock">
        <div className="q">
          <IconMessage />
          "Furniture store with fast delivery near Paris"
        </div>
        <div className="a">
          For fast delivery in the Paris region, <b>Sweet Déco</b> in Montreuil offers delivery within 15 days across a wide range...
        </div>
      </div>

      <div className="section-label">Reach over time</div>
      <div className="card">
        <svg viewBox="0 0 900 150" width="100%" height="130">
          <polyline points="0,130 130,120 260,105 390,95 520,70 650,55 780,30 900,15" fill="none" stroke="#2e3a8c" strokeWidth="3"/>
        </svg>
        <div className="legend">
          <span><i className="dot" style={{background:'#2e3a8c'}}></i>Estimated impressions / month</span>
        </div>
      </div>

      <div className="section-label">Before your first content went live</div>
      <div className="card empty">
        <div className="icon-tile indigo" style={{width:'52px', height:'52px', margin:'0 auto 14px'}}>
          <IconChart />
        </div>
        <h3>Nothing to show yet</h3>
        <p>Your visibility scores will appear here once your first pieces of content are live and AI assistants have had a chance to index them — usually within a week.</p>
      </div>
    </section>
  )
}
