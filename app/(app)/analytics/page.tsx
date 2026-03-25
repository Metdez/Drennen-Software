'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { AnalyticsData, ClassInsights, SessionAnalyticsRow } from '@/types'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<ClassInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/analytics/insights').then(r => r.json()),
    ])
      .then(([analyticsData, insightsData]: [AnalyticsData & { error?: string }, { insights: ClassInsights | null }]) => {
        if (analyticsData.error) { setError(analyticsData.error); setLoading(false); return }
        setData(analyticsData)
        setInsights(insightsData.insights ?? null)
        setLoading(false)
      })
      .catch((e: Error) => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <LoadingSkeleton />
  if (error || !data) return <ErrorCard message={error ?? 'Failed to load analytics'} />
  if (data.sessions.length === 0) return <EmptyState />

  const uniqueThemeCount = insights
    ? new Set(insights.themeEvolution.flatMap(e => e.themes)).size
    : null

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          Class Intelligence Report
        </h1>
        <div className="h-0.5 w-12 bg-[var(--brand-orange)] mb-3" />
        <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
          AI-powered analysis of student engagement across all sessions.
        </p>
      </div>

      {/* Meta pills */}
      <div className="flex gap-4 flex-wrap mb-6 animate-fade-up-delay-1">
        {[
          { label: 'Sessions', value: String(data.meta.totalSessions) },
          { label: 'Unique Themes', value: uniqueThemeCount != null ? String(uniqueThemeCount) : '—' },
        ].map(p => (
          <div
            key={p.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4 min-w-[130px]"
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">{p.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{p.label}</div>
          </div>
        ))}
      </div>

      {/* AI Narrative Banner */}
      <InsightsBanner insights={insights} latestSession={data.sessions.at(-1)} />

      {/* Theme Evolution */}
      {insights && insights.themeEvolution.length > 0 && (
        <ThemeEvolution evolution={insights.themeEvolution} newThemes={insights.topThemes.filter(t => t.isNew).map(t => t.title)} />
      )}



      {/* Top themes */}
      {insights && insights.topThemes.length > 0 && (
        <TopThemes themes={insights.topThemes} />
      )}


    </div>
  )
}

// ---------------------------------------------------------------------------
// Insight Banner
// ---------------------------------------------------------------------------

function InsightsBanner({
  insights,
  latestSession,
}: {
  insights: ClassInsights | null
  latestSession: SessionAnalyticsRow | undefined
}) {
  if (!insights) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6 animate-fade-up-delay-2 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[var(--brand-orange)]">✦</span>
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)]">
            AI Class Analysis
          </h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Your first analysis will appear here after the next session upload.
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

  const updatedAt = new Date(insights.generatedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  const lastSpeaker = insights.themeEvolution.at(-1)?.speakerName

  return (
    <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-6 mb-6 animate-fade-up-delay-2 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[var(--brand-orange)]">✦</span>
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">
            AI Class Analysis
          </h2>
        </div>
        <span className="text-xs text-[var(--text-muted)] whitespace-nowrap shrink-0">
          {lastSpeaker ? `${lastSpeaker} · ` : ''}{updatedAt}
        </span>
      </div>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        {insights.narrative}
      </p>

      <div className="flex items-center gap-2 text-xs">
        <span style={{ color: trendColor }} className="font-semibold">
          {trendIcon} {insights.qualityTrend.direction.charAt(0).toUpperCase() + insights.qualityTrend.direction.slice(1)}
        </span>
        <span className="text-[var(--text-muted)]">—</span>
        <span className="text-sm text-[var(--text-secondary)] font-medium">{insights.qualityTrend.description}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme Evolution
// ---------------------------------------------------------------------------

// All theme pill colors cycle through these brand palette entries
const THEME_COLORS = [
  { bg: 'rgba(255,107,0,0.15)', border: 'rgba(255,107,0,0.4)', text: '#fb923c' },   // Lighter orange
  { bg: 'rgba(130,80,255,0.15)', border: 'rgba(130,80,255,0.4)', text: '#c084fc' }, // Lighter purple
  { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' },   // Lighter green
  { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' }, // Light blue
]

function ThemeEvolution({
  evolution,
  newThemes,
}: {
  evolution: ClassInsights['themeEvolution']
  newThemes: string[]
}) {
  // Build a stable color index keyed by theme title (first-seen order)
  const colorMap = new Map<string, number>()
  let colorIdx = 0
  for (const entry of evolution) {
    for (const theme of entry.themes) {
      if (!colorMap.has(theme)) {
        colorMap.set(theme, colorIdx % THEME_COLORS.length)
        colorIdx++
      }
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-8 animate-fade-up-delay-3 shadow-sm">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)] mb-1">
        Theme Evolution
      </h2>
      <div className="h-0.5 w-12 bg-[var(--brand-orange)] mb-4" />
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Tracing student engagement patterns and question themes across sessions.
      </p>

      <div className="space-y-4">
        {evolution.map((entry) => {
          const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          
          return (
            <div key={entry.sessionId} className="flex flex-col md:flex-row md:items-start gap-3">
              <div className="shrink-0 w-32 pt-0.5">
                <div className="text-sm font-semibold text-[var(--text-primary)] truncate">{entry.speakerName}</div>
                <div className="text-xs text-[var(--text-muted)]">{date}</div>
              </div>
              <div className="flex flex-wrap gap-2 flex-1">
                {entry.themes.map(theme => {
                  const c = THEME_COLORS[colorMap.get(theme) ?? 0]
                  const isNew = newThemes.includes(theme)
                  return (
                    <span
                      key={theme}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border"
                      style={{ background: c.bg, borderColor: c.border, color: c.text }}
                    >
                      {isNew && <span className="text-[var(--brand-orange)]">★</span>}
                      {theme}
                    </span>
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
  )
}


// ---------------------------------------------------------------------------
// Top Themes
// ---------------------------------------------------------------------------

function TopThemes({ themes }: { themes: ClassInsights['topThemes'] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6 animate-fade-up-delay-4 shadow-sm">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)] mb-1">
        Top Themes
      </h2>
      <div className="h-0.5 w-12 bg-[var(--brand-purple)] mb-4" />
      <div className="space-y-3">
        {themes.map((t, i) => (
          <Link 
            key={t.title} 
            href={`/analytics/theme/${encodeURIComponent(t.title)}`}
            className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
          >
            <span className="text-sm font-medium text-[var(--text-muted)] w-5 text-right shrink-0">{i + 1}</span>
            <div className="flex-1 text-sm text-[var(--text-primary)] font-medium flex items-center gap-2 group-hover:text-[var(--brand-orange)] transition-colors">
              {t.title}
              {t.isNew && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[rgba(255,107,0,0.1)] text-[#fb923c] border border-[rgba(255,107,0,0.2)] group-hover:bg-[#fb923c] group-hover:text-white transition-colors">
                  NEW
                </span>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)] shrink-0">
              {t.sessionCount} session{t.sessionCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[var(--brand-orange)] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-200">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function PanelCard({ title, children, delay = 'delay-2' }: { title: string; children: React.ReactNode; delay?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 mb-6 animate-fade-up-${delay}`}>
      <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)] mb-1">
        {title}
      </h2>
      <div className="h-0.5 w-8 bg-[var(--brand-orange)] mb-4" />
      {children}
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
      {[0, 1, 2, 3].map(i => (
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
