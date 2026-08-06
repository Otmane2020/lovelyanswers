import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveProject } from '@/hooks/useProjects'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/integrations/supabase/client'
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
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const { project, isLoading: projectLoading } = useActiveProject()
  const { subscribed, trial, isLoading: subLoading } = useSubscription()
  const [searchParams] = useSearchParams()
  const [generating, setGenerating] = useState(false)
  const generationCheckedFor = useRef<string | null>(null)
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

  // The cron that's supposed to fill the next 30 days of content runs
  // server-side on a schedule — but if it's ever behind (or not yet
  // deployed), someone landing on the dashboard would see nothing without
  // this: check once per project whether the next 30 days are actually
  // planned, and if not, generate the gap right now instead of waiting for
  // the next scheduled run.
  useEffect(() => {
    if (!project || !subscribed && !trial) return
    if (generationCheckedFor.current === project.id) return
    generationCheckedFor.current = project.id

    const checkAndFill = async () => {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const endDateStr = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0]

      const [{ count: totalRows }, { count: incompleteRows }] = await Promise.all([
        supabase.from('planning').select('id', { count: 'exact', head: true })
          .eq('project_id', project.id).gte('day', todayStr).lt('day', endDateStr),
        supabase.from('planning').select('id', { count: 'exact', head: true })
          .eq('project_id', project.id).gte('day', todayStr).lt('day', endDateStr)
          .or('answer_id.is.null,article_id.is.null'),
      ])

      if ((totalRows || 0) >= 30 && (incompleteRows || 0) === 0) return

      setGenerating(true)
      try {
        const { data: sess } = await supabase.auth.getSession()
        if (!sess.session?.access_token) return
        await supabase.functions.invoke('generate-30-days-content', {
          body: {
            projectId: project.id,
            language: project.language || 'en',
            days: 30,
            overwrite: false,
            questionsPerDay: 1,
          },
          headers: { Authorization: `Bearer ${sess.session.access_token}` },
        })
        queryClient.invalidateQueries({ queryKey: ['articles'] })
        queryClient.invalidateQueries({ queryKey: ['answers'] })
      } catch (e) {
        console.error('[GEODashboard] auto-fill generation failed', e)
      } finally {
        setGenerating(false)
      }
    }
    checkAndFill()
  }, [project, subscribed, trial, queryClient])

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
      <main>
        {generating && (
          <div className="action-banner" style={{ marginBottom: 20 }}>
            <div className="icon">
              <svg className="spinner" width="18" height="18" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" opacity=".35" />
                <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="body">
              <h3>Generating your content…</h3>
              <p>Filling in the next 30 days — this can take a minute the first time.</p>
            </div>
          </div>
        )}
        {renderPanel()}
      </main>
    </div>
  )
}
