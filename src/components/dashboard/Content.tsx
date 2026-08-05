import { useState, useMemo } from 'react'
import { useArticles } from '@/hooks/useArticles'
import { useAnswers } from '@/hooks/useAnswers'
import { useGeoContents } from '@/hooks/useGeoContents'
import { IconFlame, IconFile, IconMessage, IconTag, IconList, IconCalendar } from './Icons'

type Status = 'live' | 'wait' | 'draft'
type Filter = 'all' | Status

interface Row {
  id: string
  title: string
  format: string
  icon: JSX.Element
  where: string
  status: Status
  url: string | null
  date: string | null
}

const STATUS_LABEL: Record<Status, string> = { live: 'Live', wait: 'Waiting', draft: 'Draft' }

export function Content() {
  const [viewMode, setViewMode] = useState<'list' | 'cal'>('list')
  const [filter, setFilter] = useState<Filter>('all')

  const { data: articles = [], isLoading: la } = useArticles()
  const { data: answers = [], isLoading: lb } = useAnswers()
  const { data: geoContents = [], isLoading: lc } = useGeoContents()

  const loading = la || lb || lc

  const rows: Row[] = useMemo(() => {
    const fromArticles: Row[] = articles.map((a: any) => ({
      id: `art-${a.id}`,
      title: a.title,
      format: 'Article · GEO',
      icon: <IconFile />,
      where: a.gsc_indexed ? 'Your site · Google' : 'Your site',
      status: a.status === 'published' ? 'live' : a.scheduled_date ? 'wait' : 'draft',
      url: a.published_url || null,
      date: a.scheduled_date || a.created_at || null,
    }))

    const fromAnswers: Row[] = answers.map((a: any) => ({
      id: `ans-${a.id}`,
      title: a.question,
      format: 'Answer · GEO',
      icon: <IconMessage />,
      where: (a.platforms && a.platforms.length ? a.platforms : ['ChatGPT']).join(' · '),
      status: a.is_public ? 'live' : a.scheduled_date ? 'wait' : 'draft',
      url: a.published_url || null,
      date: a.scheduled_date || a.created_at || null,
    }))

    const fromGeo: Row[] = geoContents.map((g: any) => ({
      id: `geo-${g.id}`,
      title: g.title || g.topic,
      format: `${g.content_type === 'product' ? 'Product page' : 'Page'} · GEO`,
      icon: <IconTag />,
      where: g.website ? 'Your site' : '—',
      status: g.published_at ? 'live' : g.scheduled_date ? 'wait' : 'draft',
      url: g.published_url || null,
      date: g.scheduled_date || g.created_at || null,
    }))

    return [...fromArticles, ...fromAnswers, ...fromGeo].sort((x, y) => {
      if (!x.date) return 1
      if (!y.date) return -1
      return new Date(y.date).getTime() - new Date(x.date).getTime()
    })
  }, [articles, answers, geoContents])

  const counts = useMemo(
    () => ({
      live: rows.filter((r) => r.status === 'live').length,
      wait: rows.filter((r) => r.status === 'wait').length,
      draft: rows.filter((r) => r.status === 'draft').length,
    }),
    [rows]
  )

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  // Publishing streak: did anything go live on each of the last 5 days?
  const streak = useMemo(() => {
    const days: ('hit' | 'partial' | 'miss')[] = []
    for (let i = 4; i >= 0; i--) {
      const day = new Date()
      day.setHours(0, 0, 0, 0)
      day.setDate(day.getDate() - i)
      const next = day.getTime() + 86400000
      const live = rows.filter(
        (r) => r.status === 'live' && r.date && new Date(r.date).getTime() >= day.getTime() && new Date(r.date).getTime() < next
      ).length
      const planned = rows.filter(
        (r) => r.status === 'wait' && r.date && new Date(r.date).getTime() >= day.getTime() && new Date(r.date).getTime() < next
      ).length
      days.push(live > 0 ? 'hit' : planned > 0 ? 'partial' : 'miss')
    }
    return days
  }, [rows])

  const streakColor = (s: 'hit' | 'partial' | 'miss') =>
    s === 'hit' ? 'var(--green)' : s === 'partial' ? 'var(--amber)' : '#eceefa'

  const publishedLast30 = rows.filter(
    (r) => r.status === 'live' && r.date && Date.now() - new Date(r.date).getTime() < 30 * 86400000
  ).length
  const pace = (publishedLast30 / 30).toFixed(1)

  const history = rows
    .filter((r) => r.status === 'live' && r.date)
    .slice(0, 6)

  return (
    <section>
      <div className="top-header">
        <h1>Content</h1>
        <p>One single stream — your site, ChatGPT, Gemini and Perplexity all fed by the same asset</p>
      </div>

      <div
        className="card"
        style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="icon-tile gold" style={{ width: '46px', height: '46px' }}>
            <IconFlame />
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '14.5px' }}>
              Current pace: {pace} piece{pace === '1.0' ? '' : 's'} of content a day
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)' }}>
              {publishedLast30} published in the last 30 days. Each piece is written once and works
              everywhere — that's what GEO means.
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {streak.map((s, i) => (
            <span
              key={i}
              className="dot"
              style={{ width: '22px', height: '8px', borderRadius: '4px', background: streakColor(s) }}
            />
          ))}
        </div>
      </div>

      <div className="filters">
        <button className={`chip ${viewMode === 'list' ? '' : 'off'}`} onClick={() => setViewMode('list')}>
          <IconList /> List
        </button>
        <button className={`chip ${viewMode === 'cal' ? '' : 'off'}`} onClick={() => setViewMode('cal')}>
          <IconCalendar /> Calendar
        </button>
        <span style={{ flex: 1 }} />
        <button className={`chip ${filter === 'all' ? '' : 'off'}`} onClick={() => setFilter('all')}>
          All ({rows.length})
        </button>
        <button className={`chip ${filter === 'live' ? '' : 'off'}`} onClick={() => setFilter('live')}>
          Live ({counts.live})
        </button>
        <button className={`chip ${filter === 'wait' ? '' : 'off'}`} onClick={() => setFilter('wait')}>
          Waiting ({counts.wait})
        </button>
        <button className={`chip ${filter === 'draft' ? '' : 'off'}`} onClick={() => setFilter('draft')}>
          Draft ({counts.draft})
        </button>
      </div>

      {loading ? (
        <div className="card">
          <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', margin: 0 }}>Loading content…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card empty">
          <div className="icon-tile indigo" style={{ width: '52px', height: '52px', margin: '0 auto 14px' }}>
            <IconFile />
          </div>
          <h3>No content yet</h3>
          <p>
            Once your project starts generating, every article, answer and product page shows up here
            in one stream.
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="card">
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Content</th>
                  <th>Format</th>
                  <th>Where it works</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.slice(0, 100).map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td><span className="src-tag">{row.icon} {row.format}</span></td>
                    <td className="src-tag">{row.where}</td>
                    <td><span className={`status ${row.status}`}>{STATUS_LABEL[row.status]}</span></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={!row.url}
                        title={row.url ? 'Open published page' : 'Not published yet'}
                        onClick={() => row.url && window.open(row.url, '_blank', 'noopener')}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card">
          <h2>Scheduled</h2>
          <p className="sub">Upcoming pieces by date</p>
          {visible.filter((r) => r.status === 'wait').length === 0 ? (
            <p style={{ fontSize: '13.5px', color: 'var(--ink-soft)', margin: 0 }}>Nothing scheduled.</p>
          ) : (
            visible
              .filter((r) => r.status === 'wait')
              .slice(0, 30)
              .map((row) => (
                <div className="task-row" key={row.id}>
                  <span className="task-dot" style={{ background: 'var(--amber)' }} />
                  <span className="t-title">{row.title}</span>
                  <span className="t-meta">
                    {row.date ? new Date(row.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              ))
          )}
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="section-label">History</div>
          <div className="card">
            {history.map((row) => (
              <div className="task-row" key={`h-${row.id}`}>
                <span className="task-dot" style={{ background: 'var(--green)' }} />
                <span className="t-title">
                  {row.date ? new Date(row.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''} — “{row.title}” published
                </span>
                <span className="t-meta">GEO</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
