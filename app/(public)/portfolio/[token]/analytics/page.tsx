'use client'

import { useEffect, useState } from 'react'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'
import type { ClassInsights } from '@/types'

interface ThemeFrequencyItem {
  themeTitle: string
  count: number
  lastSeen: string
}

interface ThemeEvolutionItem {
  sessionId: string
  speakerName: string
  createdAt: string
  themes: string[]
}

interface AnalyticsData {
  themeFrequency: ThemeFrequencyItem[]
  classInsights: ClassInsights | null
  themeEvolution: ThemeEvolutionItem[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PortfolioAnalyticsPage() {
  const { data: portfolio } = usePortfolio()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!portfolio) return
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/portfolio/${portfolio!.token}/analytics`)
        if (!res.ok) return
        const data = await res.json()
        setAnalytics(data)
      } catch {
        // non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [portfolio])

  if (loading || !portfolio) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading analytics...</p>
  }

  if (!analytics) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Analytics not available.</p>
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          Analytics
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
      </div>

      {/* Class Insights narrative */}
      {analytics.classInsights && (
        <div
          className="rounded-xl p-6 animate-fade-up-delay-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">
            Class Insights
          </h2>
          <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
            {analytics.classInsights.narrative}
          </p>
          {analytics.classInsights.qualityTrend && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                Quality Trend
              </span>
              <span
                className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                style={{
                  color: analytics.classInsights.qualityTrend.direction === 'improving' ? '#0f6b37' : analytics.classInsights.qualityTrend.direction === 'declining' ? '#dc2626' : 'var(--text-secondary)',
                  background: analytics.classInsights.qualityTrend.direction === 'improving' ? 'rgba(15,107,55,0.12)' : analytics.classInsights.qualityTrend.direction === 'declining' ? 'rgba(220,38,38,0.12)' : 'var(--surface-hover)',
                }}
              >
                {analytics.classInsights.qualityTrend.direction}
              </span>
              <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                {analytics.classInsights.qualityTrend.description}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Theme frequency */}
      {analytics.themeFrequency.length > 0 && (
        <div className="animate-fade-up-delay-2">
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
            Theme Frequency
          </h2>
          <div className="flex flex-col gap-2">
            {analytics.themeFrequency.map((theme, i) => {
              const maxCount = analytics.themeFrequency[0].count
              const widthPct = Math.max(10, (theme.count / maxCount) * 100)
              return (
                <div
                  key={theme.themeTitle}
                  className="rounded-lg p-3 flex items-center justify-between"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-xs font-semibold font-[family-name:var(--font-dm-sans)] w-6 text-center" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] truncate">
                        {theme.themeTitle}
                      </p>
                      <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-hover)' }}>
                        <div className="h-full rounded-full bg-[#f36f21]" style={{ width: `${widthPct}%` }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold font-[family-name:var(--font-dm-sans)] ml-4 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {theme.count} session{theme.count !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Theme evolution timeline */}
      {analytics.themeEvolution.length > 0 && (
        <div className="animate-fade-up-delay-3">
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
            Theme Evolution
          </h2>
          <div className="flex flex-col gap-3">
            {analytics.themeEvolution.map((entry) => (
              <div
                key={entry.sessionId}
                className="rounded-lg p-4"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">
                    {entry.speakerName}
                  </p>
                  <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entry.themes.map((theme) => (
                    <span
                      key={theme}
                      className="text-xs rounded-full px-2.5 py-0.5 font-[family-name:var(--font-dm-sans)]"
                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
