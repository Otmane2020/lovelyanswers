import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIntegrations } from '@/hooks/useIntegrations'
import type { DashboardTab } from '@/views/GEODashboard'
import {
  IconSparkle, IconHome, IconWrite, IconPin, IconChart, IconGear
} from './Icons'

interface SidebarProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
}

const NAV: { id: DashboardTab; label: string; icon: JSX.Element }[] = [
  { id: 'today', label: 'Today', icon: <IconHome /> },
  { id: 'content', label: 'Content', icon: <IconWrite /> },
  { id: 'presence', label: 'Presence', icon: <IconPin /> },
  { id: 'results', label: 'Results', icon: <IconChart /> },
  { id: 'settings', label: 'Settings', icon: <IconGear /> },
]

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: integrations } = useIntegrations()

  // Publishing needs a CMS. Flag Settings when it isn't connected.
  const cmsConnected = (integrations || []).some(
    (i) => i.is_connected && !['google_business', 'google_search_console'].includes(i.platform)
  )
  const settingsAlerts = cmsConnected ? 0 : 1

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

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

      {NAV.map((item) => (
        <div
          key={item.id}
          className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onTabChange(item.id) }}
        >
          <span className="ic">{item.icon}</span>
          <span className="label-txt">{item.label}</span>
          {item.id === 'settings' && settingsAlerts > 0 && (
            <span className="flag flag-attn">{settingsAlerts}</span>
          )}
        </div>
      ))}

      <div className="sidebar-foot">
        <div className="signout" onClick={handleSignOut} role="button" tabIndex={0}>
          ⇥ Sign out
        </div>
      </div>
    </aside>
  )
}
