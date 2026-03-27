'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSemesterContext } from '@/components/SemesterContext'
import type { AnalyticsData, ClassInsights, SessionAnalyticsRow } from '@/types'
import { ReportConfigPanel } from '@/components/ReportConfigPanel'

type Tab = 'overview' | 'themes' | 'insights'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'themes', label: 'Themes' },
  { key: 'insights', label: 'AI Insights' },
]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<ClassInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReportConfig, setShowReportConfig] = useState(false)

  const { activeSemesterId, loading: semesterLoading } = useSemesterContext()

  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [tab, setTab] = useState<Tab>(TABS.some(t => t.key === initialTab) ? initialTab : 'overview')

  const switchTab = useCallback((t: Tab) => {
    setTab(t)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', t)
    window.history.replaceState({}, '', url.toString())
  }, [])

  useEffect(() => {
    if (semesterLoading) return

    setLoading(true)
    setError(null)

    const semParam = activeSemesterId ? `?semester=${encodeURIComponent(activeSemesterId)}` : ''

    Promise.all([
      fetch(`/api/analytics${semParam}`).then(r => { if (!r.ok) throw new Error('Failed to load analytics'); return r.json() }),
      fetch(`/api/analytics/insights${semParam}`).then(r => r.ok ? r.json() : { insights: null }),
    ])
      .then(([analyticsData, insightsData]: [AnalyticsData & { error?: string }, { insights: ClassInsights | null }]) => {
        if (analyticsData.error) { setError(analyticsData.error); setLoading(false); return }
        setData(analyticsData)
        setInsights(insightsData.insights ?? null)
        setLoading(false)
      })
      .catch((e: Error) => { setError(e.message); setLoading(false) })
  }, [activeSemesterId, semesterLoading])

  if (loading) return <LoadingSkeleton />
  if (error || !data) return <ErrorCard message={error ?? 'Failed to load analytics'} />
  if (data.sessions.length === 0) return <EmptyState />

  return (
    <div>
      {/* Header */}
      <div className="mb-6 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
              Class Intelligence Report
            </h1>
            <div className="h-0.5 w-12 bg-[var(--brand-orange)] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              Understanding what your students care about most.
            </p>
          </div>
          <button
            onClick={() => setShowReportConfig(true)}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--brand-orange)] text-white text-sm font-semibold hover:opacity-90 transition-opacity font-[family-name:var(--font-dm-sans)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate Semester Report
          </button>
        </div>
      </div>

      {/* Report Config Modal */}
      <ReportConfigPanel
        isOpen={showReportConfig}
        onClose={() => setShowReportConfig(false)}
        analyticsData={data}
      />

      {/* Tab bar */}
      <TabBar active={tab} onChange={switchTab} />

      {/* Tab content */}
      {tab === 'overview' && <OverviewTab data={data} insights={insights} onSwitchTab={switchTab} />}
      {tab === 'themes' && <ThemesTab data={data} insights={insights} />}
      {tab === 'insights' && <InsightsTab data={data} insights={insights} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tab Bar
// ---------------------------------------------------------------------------

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="flex gap-0 mb-6 border-b border-[var(--border)] animate-fade-up-delay-1">
      {TABS.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            active === t.key
              ? 'text-[var(--brand-orange)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          {t.label}
          {active === t.key && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-orange)]" />
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------

function OverviewTab({
  data,
  insights,
  onSwitchTab,
}: {
  data: AnalyticsData
  insights: ClassInsights | null
  onSwitchTab: (t: Tab) => void
}) {
  const uniqueThemeCount = insights
    ? new Set(insights.themeEvolution.flatMap(e => e.themes)).size
    : 0

  const latestSession = data.sessions.at(-1)
  const latestEvolution = insights?.themeEvolution.at(-1)

  return (
    <div className="space-y-4 animate-fade-up-delay-2">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sessions', value: String(data.meta.totalSessions) },
          { label: 'Unique Themes', value: uniqueThemeCount > 0 ? String(uniqueThemeCount) : '—' },
          { label: 'Students', value: String(data.meta.totalUniqueStudents) },
        ].map(p => (
          <div
            key={p.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4"
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">{p.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{p.label}</div>
          </div>
        ))}
      </div>

      {/* Two column: AI Summary + Latest Session */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Summary */}
        <InsightsBanner insights={insights} />

        {/* Latest Session */}
        {latestSession && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h3 className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[var(--text-primary)] mb-3">
              Latest Session
            </h3>
            <div className="text-sm font-medium text-[var(--text-primary)]">{latestSession.speakerName}</div>
            <div className="text-xs text-[var(--text-muted)] mb-3">
              {new Date(latestSession.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{latestSession.submissionCount} submissions
            </div>
            {latestEvolution && latestEvolution.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {latestEvolution.themes.slice(0, 3).map(theme => (
                  <Link
                    key={theme}
                    href={`/analytics/theme/${encodeURIComponent(theme)}`}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-[rgba(255,107,0,0.1)] border-[rgba(255,107,0,0.2)] text-[#fb923c] hover:bg-[rgba(255,107,0,0.2)] transition-colors"
                  >
                    {theme}
                  </Link>
                ))}
                {latestEvolution.themes.length > 3 && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.2)] text-[#60a5fa]">
                    +{latestEvolution.themes.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Top Themes Preview */}
      {insights && insights.topThemes.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-1">
            What Students Care About Most
          </h3>
          <div className="h-0.5 w-10 bg-[var(--brand-orange)] mb-4" />

          <div className="space-y-1">
            {insights.topThemes.slice(0, 3).map((t, i) => (
              <ThemeRow key={t.title} theme={t} rank={i + 1} totalSessions={data.meta.totalSessions} />
            ))}
          </div>

          {insights.topThemes.length > 3 && (
            <button
              onClick={() => onSwitchTab('themes')}
              className="mt-4 text-sm text-[var(--brand-orange)] hover:underline"
            >
              View all {insights.topThemes.length} themes →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Themes Tab
// ---------------------------------------------------------------------------

function ThemesTab({ data, insights }: { data: AnalyticsData; insights: ClassInsights | null }) {
  if (!insights || insights.topThemes.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center animate-fade-up-delay-2">
        <p className="text-sm text-[var(--text-secondary)]">
          No theme data yet. Themes will appear after your next session upload.
        </p>
      </div>
    )
  }

  const newThemes = insights.topThemes.filter(t => t.isNew).map(t => t.title)

  // Build a submission count lookup from analytics data
  const submissionMap = new Map(data.sessions.map(s => [s.sessionId, s.submissionCount]))

  return (
    <div className="space-y-6 animate-fade-up-delay-2">
      {/* All Themes Ranked */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-1">
          All Themes
        </h3>
        <div className="h-0.5 w-10 bg-[var(--brand-orange)] mb-1" />
        <p className="text-xs text-[var(--text-muted)] mb-4">Click any theme for AI-powered deep analysis</p>

        <div className="space-y-1">
          {insights.topThemes.map((t, i) => (
            <ThemeRow key={t.title} theme={t} rank={i + 1} totalSessions={data.meta.totalSessions} />
          ))}
        </div>
      </div>

      {/* Theme Evolution Timeline */}
      {insights.themeEvolution.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-1">
            How Themes Evolve Across Speakers
          </h3>
          <div className="h-0.5 w-10 bg-[rgba(130,80,255,0.6)] mb-4" />

          <div className="space-y-4">
            {insights.themeEvolution.map((entry, idx) => {
              const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const subs = submissionMap.get(entry.sessionId)

              return (
                <div
                  key={entry.sessionId}
                  className={`flex flex-col md:flex-row md:items-start gap-3 ${
                    idx < insights.themeEvolution.length - 1 ? 'pb-4 border-b border-[rgba(255,255,255,0.05)]' : ''
                  }`}
                >
                  <div className="shrink-0 w-28">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.speakerName}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {date}{subs != null ? ` · ${subs} subs` : ''}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {entry.themes.map(theme => {
                      const colorIdx = Math.abs(hashString(theme)) % THEME_COLORS.length
                      const c = THEME_COLORS[colorIdx]
                      const isNew = newThemes.includes(theme)
                      return (
                        <Link
                          key={theme}
                          href={`/analytics/theme/${encodeURIComponent(theme)}`}
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border hover:opacity-80 transition-opacity"
                          style={{ background: c.bg, borderColor: c.border, color: c.text }}
                        >
                          {isNew && <span className="text-[var(--brand-orange)]">★</span>}
                          {theme}
                        </Link>
                      )
                    })}
                    {entry.themes.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">No theme data</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Insights Tab
// ---------------------------------------------------------------------------

function InsightsTab({ data, insights }: { data: AnalyticsData; insights: ClassInsights | null }) {
  const [query, setQuery] = useState('')
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null)
  const [querySql, setQuerySql] = useState<string | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)
  const [queryError, setQueryError] = useState<string | null>(null)

  const handleQuery = async () => {
    const q = query.trim()
    if (!q) return
    setQueryLoading(true)
    setQueryAnswer(null)
    setQuerySql(null)
    setQueryError(null)
    try {
      const res = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const json = await res.json()
      if (json.error) { setQueryError(json.error) }
      else { setQueryAnswer(json.answer); setQuerySql(json.sql) }
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : 'Query failed')
    } finally {
      setQueryLoading(false)
    }
  }

  if (!insights) {
    return (
      <div className="space-y-6 animate-fade-up-delay-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-[var(--brand-orange)]">✦</span>
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)]">
              AI Insights
            </h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            AI insights will generate after your next session upload.
          </p>
        </div>

        {/* NL query still works even without insights */}
        <QueryBox
          query={query}
          setQuery={setQuery}
          onSubmit={handleQuery}
          loading={queryLoading}
          answer={queryAnswer}
          sql={querySql}
          error={queryError}
        />
      </div>
    )
  }

  const trendColor =
    insights.qualityTrend.direction === 'improving'
      ? 'var(--brand-green)'
      : insights.qualityTrend.direction === 'declining'
      ? '#ef4444'
      : 'var(--text-muted)'

  const trendIcon =
    insights.qualityTrend.direction === 'improving' ? '▲' :
    insights.qualityTrend.direction === 'declining' ? '▼' : '◆'

  // Derive cross-session patterns from topThemes
  const topPatterns = insights.topThemes.slice(0, 3).map(t => ({
    title: t.title,
    pct: data.meta.totalSessions > 0 ? Math.round((t.sessionCount / data.meta.totalSessions) * 100) : 0,
    sessionCount: t.sessionCount,
  }))

  return (
    <div className="space-y-4 animate-fade-up-delay-2">
      {/* Full Narrative */}
      <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[var(--brand-orange)]">✦</span>
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)]">
              Class Narrative
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap shrink-0">
            Updated {new Date(insights.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {insights.narrative}
        </p>
      </div>

      {/* Two column: Quality Trend + Cross-Session Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Quality Trend</h3>
          <div className="flex items-center gap-3">
            <span style={{ color: trendColor }} className="text-2xl font-bold">{trendIcon}</span>
            <div>
              <div style={{ color: trendColor }} className="text-sm font-semibold">
                {insights.qualityTrend.direction.charAt(0).toUpperCase() + insights.qualityTrend.direction.slice(1)}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{insights.qualityTrend.description}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Cross-Session Patterns</h3>
          <div className="space-y-2">
            {topPatterns.map(p => (
              <div key={p.title} className="text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{p.title}</span>
                {' — '}{p.pct}% of sessions ({p.sessionCount} of {data.meta.totalSessions})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NL Query */}
      <QueryBox
        query={query}
        setQuery={setQuery}
        onSubmit={handleQuery}
        loading={queryLoading}
        answer={queryAnswer}
        sql={querySql}
        error={queryError}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

const THEME_COLORS = [
  { bg: 'rgba(255,107,0,0.15)', border: 'rgba(255,107,0,0.4)', text: '#fb923c' },
  { bg: 'rgba(130,80,255,0.15)', border: 'rgba(130,80,255,0.4)', text: '#c084fc' },
  { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' },
  { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' },
]

function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}

function InsightsBanner({ insights }: { insights: ClassInsights | null }) {
  if (!insights) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[var(--brand-orange)]">✦</span>
          <h3 className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[var(--text-primary)]">
            What Students Want to Know
          </h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          AI analysis will appear here after your next session upload.
        </p>
      </div>
    )
  }

  const trendColor =
    insights.qualityTrend.direction === 'improving'
      ? 'var(--brand-green)'
      : insights.qualityTrend.direction === 'declining'
      ? '#ef4444'
      : 'var(--text-muted)'

  const trendIcon =
    insights.qualityTrend.direction === 'improving' ? '▲' :
    insights.qualityTrend.direction === 'declining' ? '▼' : '◆'

  return (
    <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[var(--brand-orange)]">✦</span>
        <h3 className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[var(--text-primary)]">
          What Students Want to Know
        </h3>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {new Date(insights.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
        {insights.narrative}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: trendColor }} className="font-semibold">
          {trendIcon} {insights.qualityTrend.direction.charAt(0).toUpperCase() + insights.qualityTrend.direction.slice(1)}
        </span>
        <span className="text-[var(--text-muted)]">—</span>
        <span className="text-[var(--text-secondary)]">{insights.qualityTrend.description}</span>
      </div>
    </div>
  )
}

function ThemeRow({
  theme,
  rank,
  totalSessions,
}: {
  theme: ClassInsights['topThemes'][number]
  rank: number
  totalSessions: number
}) {
  const pct = totalSessions > 0 ? Math.round((theme.sessionCount / totalSessions) * 100) : 0

  return (
    <Link
      href={`/analytics/theme/${encodeURIComponent(theme.title)}`}
      className="flex items-center gap-3 p-3 -mx-1 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
    >
      <span className="text-sm font-medium text-[var(--text-muted)] w-5 text-right shrink-0">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-orange)] transition-colors truncate">
            {theme.title}
          </span>
          {theme.isNew && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[rgba(255,107,0,0.1)] text-[#fb923c] border border-[rgba(255,107,0,0.2)] shrink-0">
              NEW
            </span>
          )}
        </div>
        <div className="h-1 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--brand-orange)] transition-all duration-500"
            style={{ width: `${pct}%`, opacity: 0.6 }}
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-[var(--text-primary)]">{pct}%</div>
        <div className="text-xs text-[var(--text-muted)]">{theme.sessionCount} session{theme.sessionCount !== 1 ? 's' : ''}</div>
      </div>
      <span className="text-[var(--brand-orange)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        →
      </span>
    </Link>
  )
}

function QueryBox({
  query,
  setQuery,
  onSubmit,
  loading,
  answer,
  sql,
  error,
}: {
  query: string
  setQuery: (q: string) => void
  onSubmit: () => void
  loading: boolean
  answer: string | null
  sql: string | null
  error: string | null
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Ask About Your Data</h3>
      <p className="text-xs text-[var(--text-muted)] mb-3">Ask questions in plain English — AI will query your session data</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          placeholder="e.g. What themes appear only with tech founders?"
          className="flex-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-orange)]"
          disabled={loading}
        />
        <button
          onClick={onSubmit}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-[var(--brand-orange)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>
      {error && (
        <div className="mt-3 text-xs text-red-400">{error}</div>
      )}
      {answer && (
        <div className="mt-3 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] p-3">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed">{answer}</p>
          {sql && (
            <details className="mt-2">
              <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">View SQL</summary>
              <pre className="mt-1 text-xs text-[var(--text-muted)] bg-[var(--surface)] rounded p-2 overflow-x-auto">{sql}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-10 w-64 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
      <div className="flex gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-20 w-36 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-48 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
      ))}
    </div>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <p className="text-[var(--text-secondary)] text-sm">Failed to load analytics: {message}</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
      <p className="text-[var(--text-secondary)] text-sm">
        No sessions yet.{' '}
        <a href="/dashboard" className="text-[var(--brand-orange)] hover:underline">
          Upload your first ZIP on the dashboard.
        </a>
      </p>
    </div>
  )
}
