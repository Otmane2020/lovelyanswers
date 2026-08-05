import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveProject } from '@/hooks/useProjects'
import { useSubscription } from '@/hooks/useSubscription'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Today } from '@/components/dashboard/Today'
import { Content } from '@/components/dashboard/Content'
import { Presence } from '@/components/dashboard/Presence'
import { Results } from '@/components/dashboard/Results'
import { Settings } from '@/components/dashboard/Settings'
import '@/styles/dashboard.css'

export type DashboardTab = 'today' | 'content' | 'presence' | 'results' | 'settings'

export default function GEODashboard() {
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()
  const { project, isLoading: projectLoading } = useActiveProject()
  const { subscribed, trial, isLoading: subLoading } = useSubscription()
  const [searchParams] = useSearchParams()
  // ?tab=settings lets other screens deep-link straight to a panel instead of
  // bouncing the user out to a separate page.
  const requestedTab = searchParams.get('tab') as DashboardTab | null
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    requestedTab && ['today', 'content', 'presence', 'results', 'settings'].includes(requestedTab)
      ? requestedTab
      : 'today'
  )

  // Not signed in -> auth. Signed in but no project yet -> onboarding.
  // Signed in with a project but never paid -> back to onboarding's paywall
  // step: payment happens before dashboard access, there's no free tier that
  // lands here, so an unpaid project is treated the same as an incomplete signup.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/auth', { replace: true })
      return
    }
    if (projectLoading || subLoading) return
    if (!project) {
      navigate('/onboarding', { replace: true })
      return
    }
    if (!subscribed && !trial) {
      navigate('/onboarding', { replace: true })
    }
  }, [authLoading, user, projectLoading, project, subLoading, subscribed, trial, navigate])

  if (authLoading || (user && (projectLoading || subLoading))) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper)' }}>
        <div className="mono" style={{ color: 'var(--ink-soft)', fontSize: '13.5px' }}>Loading your workspace…</div>
      </div>
    )
  }

  if (!user || !project || (!subscribed && !trial)) return null

  const renderPanel = () => {
    switch (activeTab) {
      case 'content': return <Content />
      case 'presence': return <Presence onNavigate={setActiveTab} />
      case 'results': return <Results />
      case 'settings': return <Settings />
      default: return <Today onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="geo-dashboard">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main>{renderPanel()}</main>
    </div>
  )
}
