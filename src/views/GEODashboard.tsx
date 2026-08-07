import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveProject } from '@/hooks/useProjects'
import { useSubscription } from '@/hooks/useSubscription'
import { useIntegrations } from '@/hooks/useIntegrations'
import { useArticles } from '@/hooks/useArticles'
import { useAnswers } from '@/hooks/useAnswers'
import { supabase } from '@/integrations/supabase/client'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Today } from '@/components/dashboard/Today'
import { Content } from '@/components/dashboard/Content'
import { Presence } from '@/components/dashboard/Presence'
import { Results } from '@/components/dashboard/Results'
import { Settings } from '@/components/dashboard/Settings'
import { DoItForMeModal } from '@/components/dashboard/DoItForMeModal'
import { IconAlert } from '@/components/dashboard/Icons'
import '@/styles/dashboard.css'

export type DashboardTab = 'today' | 'content' | 'presence' | 'results' | 'settings'

export default function GEODashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()
  const { project, isLoading: projectLoading } = useActiveProject()
  const { subscribed, trial, isLoading: subLoading } = useSubscription()
  const { data: integrations = [] } = useIntegrations()
  const { data: articles = [] } = useArticles()
  const { data: answers = [] } = useAnswers()
  const [searchParams] = useSearchParams()
  const [generating, setGenerating] = useState(false)
  const [showDoItForMe, setShowDoItForMe] = useState(false)
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
      // Generating a full 30-day backlog before the site is even connected
      // to publish to just piles up a scary "76 waiting" wall with nothing
      // going live. Keep a small buffer until there's somewhere for it to
      // actually go.
      const cmsConnectedNow = integrations.some(
        (i: any) => i.is_connected && !['google_business', 'google_search_console'].includes(i.platform)
      )
      const windowDays = cmsConnectedNow ? 30 : 7

      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const endDateStr = new Date(today.getTime() + windowDays * 86400000).toISOString().split('T')[0]

      const [{ count: totalRows }, { count: incompleteRows }] = await Promise.all([
        supabase.from('planning').select('id', { count: 'exact', head: true })
          .eq('project_id', project.id).gte('day', todayStr).lt('day', endDateStr),
        supabase.from('planning').select('id', { count: 'exact', head: true })
          .eq('project_id', project.id).gte('day', todayStr).lt('day', endDateStr)
          .or('answer_id.is.null,article_id.is.null'),
      ])

      if ((totalRows || 0) >= windowDays && (incompleteRows || 0) === 0) return

      setGenerating(true)
      try {
        // generate-30-days-content writes answers/articles but never touches
        // `planning` — daily-planning-fill is the one that actually upserts
        // planning rows and links answer_id/article_id back onto them, which
        // is what the completeness check above (and the cron) both rely on.
        // Each day costs 3 sequential OpenRouter calls; since the model was
        // switched to slower, rate-limited free tiers, 3 days/call (9 calls)
        // was blowing past Supabase's 150s hard timeout. 1 day/call keeps
        // real headroom even when a call is slow — call it more times in a
        // row instead to still catch a mostly-empty project up in one visit.
        let totalCompleted = 0
        for (let i = 0; i < 8; i++) {
          const { data, error } = await supabase.functions.invoke('daily-planning-fill', {
            body: { projectId: project.id, days: windowDays, maxDaysToFill: 1 },
          })
          if (error) throw error
          const result = data?.results?.[0]
          totalCompleted += result?.daysCompleted || 0
          if (!result || (!result.stoppedEarly && result.daysTouched === 0)) break
        }
        if (totalCompleted > 0) {
          toast.success(`${totalCompleted} piece${totalCompleted > 1 ? 's' : ''} of content generated`)
        } else {
          toast.error('Content generation ran but produced nothing — check the edge function logs')
        }
        queryClient.invalidateQueries({ queryKey: ['articles'] })
        queryClient.invalidateQueries({ queryKey: ['answers'] })
      } catch (e) {
        console.error('[GEODashboard] auto-fill generation failed', e)
        toast.error(e instanceof Error ? e.message : 'Content generation failed')
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

  const cmsConnected = integrations.some(
    (i) => i.is_connected && !['google_business', 'google_search_console'].includes(i.platform)
  )
  const waiting =
    articles.filter((a: any) => a.status !== 'published').length +
    answers.filter((a: any) => !a.is_public).length

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
        {!cmsConnected && waiting > 0 && (
          <div className="action-banner" style={{ marginBottom: 20, position: 'sticky', top: 0, zIndex: 15 }}>
            <div className="icon"><IconAlert /></div>
            <div className="body">
              <h3>{waiting} piece{waiting > 1 ? 's' : ''} of content ready, but your site isn't connected</h3>
              <p>Nothing publishes until it's linked. Takes about 5 minutes, or we'll do it for you.</p>
            </div>
            <button className="btn btn-ghost amber btn-sm" onClick={() => setShowDoItForMe(true)}>
              Do it for me
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('settings')}>
              Connect my site
            </button>
          </div>
        )}
        {showDoItForMe && <DoItForMeModal onClose={() => setShowDoItForMe(false)} />}
        {/* One banner at a time — CMS-not-connected is the more actionable,
            persistent one, so it wins over the transient "generating" state
            instead of stacking both. */}
        {generating && !(!cmsConnected && waiting > 0) && (
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
