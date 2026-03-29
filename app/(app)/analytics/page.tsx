'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { ReportConfigPanel } from '@/components/layout/ReportConfigPanel'
import { WhatChangedBanner } from '@/components/analytics/WhatChangedBanner'
import { ThemeExplorer } from '@/components/analytics/ThemeExplorer'
import { CollapsiblePanel } from '@/components/analytics/CollapsiblePanel'
import type { AnalyticsData, ClassInsights } from '@/types'

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<ClassInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showReportConfig, setShowReportConfig] = useState(false)

  const { activeSemesterId, loading: semesterLoading } = useSemesterContext()

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

  const uniqueThemeCount = insights
    ? new Set(insights.topThemes.map(t => t.title)).size
    : 0

  return (
    <>
      {/* Report Config Modal — rendered outside main content for correct z-index stacking */}
      <ReportConfigPanel
        isOpen={showReportConfig}
        onClose={() => setShowReportConfig(false)}
        analyticsData={data}
      />

      <div className="animate-fade-up">
      {/* Header */}
      <div className="mb-6">
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

      {/* What Changed Banner */}
      {insights && (
        <WhatChangedBanner insights={insights} semesterId={activeSemesterId} />
      )}

      {/* AI Narrative */}
      {insights ? (
        <div className="bg-[var(--surface)] border border-[rgba(255,107,0,0.15)] rounded-xl p-6 mb-7">
          <div className="text-[10px] text-[var(--brand-orange)] tracking-widest uppercase mb-3 flex items-center gap-1.5">
            <span className="text-sm">✦</span> AI SYNTHESIS
          </div>
          <h2 className="font-[family-name:var(--font-playfair)] text-[22px] font-bold text-[var(--text-primary)] mb-3.5">
            What Your Students Want to Know
          </h2>
          {insights.narrative.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-sm text-[var(--text-secondary)] leading-[1.75] mb-3">
              {paragraph}
            </p>
          ))}
          <div className="text-[11px] text-[var(--text-muted)] mt-4 flex items-center gap-3">
            <span>Updated {new Date(insights.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Based on {data.meta.totalSessions} sessions, {data.meta.totalUniqueStudents} students</span>
          </div>
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center mb-7">
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
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Sessions', value: String(data.meta.totalSessions) },
          { label: 'Students', value: String(data.meta.totalUniqueStudents) },
          { label: 'Unique Themes', value: uniqueThemeCount > 0 ? String(uniqueThemeCount) : '—' },
          {
            label: 'Quality',
            value: insights
              ? insights.qualityTrend.direction === 'improving' ? '▲' : insights.qualityTrend.direction === 'declining' ? '▼' : '◆'
              : '—',
            color: insights
              ? insights.qualityTrend.direction === 'improving' ? 'var(--brand-green)' : insights.qualityTrend.direction === 'declining' ? '#ef4444' : undefined
              : undefined,
            sub: insights?.qualityTrend.direction
              ? insights.qualityTrend.direction.charAt(0).toUpperCase() + insights.qualityTrend.direction.slice(1)
              : undefined,
          },
        ].map(p => (
          <div
            key={p.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4 text-center"
          >
            <div
              className="text-2xl font-bold text-[var(--text-primary)]"
              style={'color' in p && p.color ? { color: p.color } : undefined}
            >
              {p.value}
            </div>
            <div className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-wide">{p.label}</div>
            {'sub' in p && p.sub && (
              <div
                className="text-[11px] mt-1"
                style={'color' in p && p.color ? { color: p.color } : { color: 'var(--text-muted)' }}
              >
                {p.sub}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Theme Explorer */}
      {insights && insights.topThemes.length > 0 && (
        <ThemeExplorer themes={insights.topThemes} totalSessions={data.meta.totalSessions} />
      )}

      {/* Supporting Intelligence */}
      <SupportingIntelligence data={data} insights={insights} />
    </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Supporting Intelligence
// ---------------------------------------------------------------------------

function SupportingIntelligence({ data, insights }: { data: AnalyticsData; insights: ClassInsights | null }) {
  const topLeader = data.leaderboard[0]

  // Build submission count lookup for timeline
  const submissionMap = new Map(data.sessions.map(s => [s.sessionId, s.submissionCount]))

  return (
    <div className="mb-8">
      <div className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-3">
        SUPPORTING INTELLIGENCE
      </div>

      {/* Leaderboard */}
      <CollapsiblePanel
        icon="📊"
        title="Engagement Leaderboard"
        preview={topLeader ? `Top: ${topLeader.studentName} (${topLeader.submissionCount} submissions)` : 'No data yet'}
      >
        {data.leaderboard.length > 0 ? (
          <div>
            {data.leaderboard.map((entry, i) => {
              const maxCount = data.leaderboard[0]?.submissionCount ?? 1
              const barPct = Math.round((entry.submissionCount / maxCount) * 100)
              return (
                <div key={entry.studentName} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-b-0">
                  <span className="text-xs text-[var(--text-muted)] w-6">{i + 1}</span>
                  <Link
                    href={`/roster/${encodeURIComponent(entry.studentName)}`}
                    className="text-[13px] text-[var(--text-secondary)] flex-1 hover:text-[var(--brand-orange)] transition-colors"
                  >
                    {entry.studentName}
                  </Link>
                  <div className="w-[120px] h-1 bg-[var(--surface-elevated)] rounded-full overflow-hidden mx-3">
                    <div className="h-full bg-[var(--brand-orange)] rounded-full opacity-50" style={{ width: `${barPct}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--brand-orange)] w-20 text-right">
                    {entry.submissionCount} submission{entry.submissionCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">No submission data yet.</p>
        )}
      </CollapsiblePanel>

      {/* Drop-off Watch */}
      <CollapsiblePanel
        icon="⚠️"
        title="Drop-off Watch"
        preview={data.dropoff.length > 0 ? `${data.dropoff.length} student${data.dropoff.length !== 1 ? 's' : ''} absent from recent sessions` : 'No drop-offs detected'}
      >
        {data.dropoff.length > 0 ? (
          <div>
            {data.dropoff.map(entry => (
              <div key={entry.studentName} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-b-0">
                <Link
                  href={`/roster/${encodeURIComponent(entry.studentName)}`}
                  className="text-[13px] text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors"
                >
                  {entry.studentName}
                </Link>
                <span className="text-xs text-[var(--text-muted)]">
                  Last seen: {entry.lastSeenSpeaker}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--text-muted)]">All students are active — no drop-offs detected.</p>
        )}
      </CollapsiblePanel>

      {/* Theme Evolution Timeline */}
      {insights && insights.themeEvolution.length > 0 && (
        <CollapsiblePanel
          icon="📈"
          title="Theme Evolution Timeline"
          preview={`How themes shifted across ${insights.themeEvolution.length} sessions`}
        >
          <div>
            {insights.themeEvolution.map((entry, idx) => {
              const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const subs = submissionMap.get(entry.sessionId)
              return (
                <div
                  key={entry.sessionId}
                  className={`flex gap-3.5 py-2.5 ${idx < insights.themeEvolution.length - 1 ? 'border-b border-[rgba(255,255,255,0.03)]' : ''}`}
                >
                  <div className="w-[90px] shrink-0">
                    <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{entry.speakerName}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{date}{subs != null ? ` · ${subs} subs` : ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {entry.themes.map(theme => (
                      <Link
                        key={theme}
                        href={`/analytics/theme?title=${encodeURIComponent(theme)}`}
                        className="text-[11px] px-2 py-0.5 rounded-full border bg-[rgba(255,107,0,0.1)] border-[rgba(255,107,0,0.25)] text-[#fb923c] hover:opacity-80 transition-opacity"
                      >
                        {theme}
                      </Link>
                    ))}
                    {entry.themes.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">No theme data</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsiblePanel>
      )}

      {/* Session Effectiveness */}
      {insights?.sessionEffectiveness && insights.sessionEffectiveness.length > 0 && (
        <CollapsiblePanel
          icon="🎯"
          title="Session Effectiveness"
          preview="Which speakers resonated most"
        >
          <div>
            {insights.sessionEffectiveness.map(entry => (
              <div key={entry.speakerName} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.03)] last:border-b-0">
                <span className="text-[13px] text-[var(--text-secondary)]">{entry.speakerName}</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[var(--text-muted)]">Rating: <strong className="text-[var(--text-primary)]">{entry.rating}/5</strong></span>
                  <span className="text-[#4ade80]">🎯 {entry.homeRunCount} home runs</span>
                  {entry.flatCount > 0 && (
                    <span className="text-[var(--text-muted)]">{entry.flatCount} flat</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsiblePanel>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utility Components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-10 w-64 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
      <div className="h-48 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
      <div className="flex gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-20 flex-1 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} className="h-16 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
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
