import { IconCheck } from './Icons'

export function Presence() {
  return (
    <section>
      <div className="top-header">
        <h1>Presence</h1>
        <p>Checked automatically every week — this isn't content, it's upkeep</p>
      </div>

      <div className="presence-grid">
        <div className="card">
          <h2>Business listing</h2>
          <p className="sub">Consistency of your information</p>
          <div className="check-row">
            <span className="check-ic ok">✓</span>
            <span>Name, address and phone match everywhere</span>
          </div>
          <div className="check-row">
            <span className="check-ic ok">✓</span>
            <span>Photos up to date (12)</span>
          </div>
          <div className="check-row">
            <span className="check-ic warn">!</span>
            <span>Sunday hours differ between Google and your site</span>
          </div>
          <div className="check-row">
            <span className="check-ic ok">✓</span>
            <span>Category and description optimized</span>
          </div>
          <button className="btn btn-primary btn-sm" style={{marginTop:'14px'}}>Fix the hours</button>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Recent reviews</h2>
              <p className="sub">4.6 ★ from 87 reviews</p>
            </div>
            <button className="btn btn-ghost btn-sm">See all</button>
          </div>
          <div className="review">
            <div className="review-top">
              <span>Sophie M.</span>
              <span className="stars">★★★☆☆</span>
            </div>
            <p>Lovely store but delivery took a while. — A suggested reply is ready</p>
          </div>
          <div className="review">
            <div className="review-top">
              <span>Karim D.</span>
              <span className="stars">★★★★★</span>
            </div>
            <p>Great advice, found exactly what we were looking for!</p>
          </div>
        </div>
      </div>

      <div className="section-label">If nothing needs attention</div>
      <div className="card empty">
        <div className="icon-tile green" style={{width:'52px', height:'52px', margin:'0 auto 14px'}}>
          <IconCheck />
        </div>
        <h3>All clear</h3>
        <p>Your listing is consistent everywhere and there are no new reviews to respond to. We'll flag anything that needs you here.</p>
      </div>
    </section>
  )
}
