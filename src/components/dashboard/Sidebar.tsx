import {
  IconSparkle, IconHome, IconWrite, IconPin, IconChart, IconGear
} from './Icons'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <IconSparkle />
        </div>
        <div className="brand-text">
          <div className="eyebrow">AUTOPILOT</div>
          <div className="name">GEO</div>
        </div>
      </div>

      <div
        className={`nav-item ${activeTab === 'today' ? 'active' : ''}`}
        onClick={() => onTabChange('today')}
      >
        <span className="ic"><IconHome /></span>
        <span className="label-txt">Today</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'content' ? 'active' : ''}`}
        onClick={() => onTabChange('content')}
      >
        <span className="ic"><IconWrite /></span>
        <span className="label-txt">Content</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'presence' ? 'active' : ''}`}
        onClick={() => onTabChange('presence')}
      >
        <span className="ic"><IconPin /></span>
        <span className="label-txt">Presence</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'results' ? 'active' : ''}`}
        onClick={() => onTabChange('results')}
      >
        <span className="ic"><IconChart /></span>
        <span className="label-txt">Results</span>
      </div>

      <div
        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        <span className="ic"><IconGear /></span>
        <span className="label-txt">Settings</span>
        <span className="flag flag-attn">1</span>
      </div>

      <div className="sidebar-foot">
        <div className="signout">⇥ Sign out</div>
      </div>
    </aside>
  )
}
