import { IconGlobe, IconPin, IconCart, IconUser, IconCard } from './Icons'

export function Settings() {
  return (
    <section>
      <div className="top-header">
        <h1>Settings</h1>
        <p>Connections, access and billing</p>
      </div>

      <div className="section-label">Connections</div>
      <div className="card" style={{marginBottom:'20px'}}>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo">
              <IconGlobe />
            </div>
            <div>
              <div className="setting-name">Website (CMS)</div>
              <div className="setting-meta">Required to publish automatically</div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            <span className="badge-missing">Not connected</span>
            <button className="btn btn-primary btn-sm">Connect</button>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo">
              <IconPin />
            </div>
            <div>
              <div className="setting-name">Google Business Profile</div>
              <div className="setting-meta">Business listing and reviews</div>
            </div>
          </div>
          <span className="badge-connected">Connected</span>
        </div>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo">
              <IconCart />
            </div>
            <div>
              <div className="setting-name">Product catalog</div>
              <div className="setting-meta">Shopify — 214 products synced</div>
            </div>
          </div>
          <span className="badge-connected">Connected</span>
        </div>
      </div>

      <div className="section-label">Account</div>
      <div className="card">
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo">
              <IconUser />
            </div>
            <div>
              <div className="setting-name">Pierre B.</div>
              <div className="setting-meta">pierre@sweet-deco.fr</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Edit</button>
        </div>
        <div className="setting-row">
          <div className="setting-l">
            <div className="setting-ic icon-tile indigo">
              <IconCard />
            </div>
            <div>
              <div className="setting-name">Plan</div>
              <div className="setting-meta">Growth plan — €99/month</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">Manage</button>
        </div>
      </div>
    </section>
  )
}
