'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ClassInsights } from '@/types'

interface ThemeExplorerProps {
  themes: ClassInsights['topThemes']
  totalSessions: number
}

const INITIAL_VISIBLE = 5

export function ThemeExplorer({ themes, totalSessions }: ThemeExplorerProps) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const visibleThemes = showAll ? themes : themes.slice(0, INITIAL_VISIBLE)

  return (
    <div className="mb-8">
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">
          Theme Explorer
        </h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          Click to expand · Full analysis available
        </span>
      </div>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)] rounded-sm mb-4" />

      {visibleThemes.map((theme, i) => {
        const rank = i + 1
        const pct = totalSessions > 0 ? Math.round((theme.sessionCount / totalSessions) * 100) : 0
        const isExpanded = expandedTheme === theme.title

        if (isExpanded) {
          return (
            <div
              key={theme.title}
              className="bg-[#1a1a24] border border-[rgba(255,107,0,0.12)] rounded-xl mb-1 p-4 px-5"
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[15px] font-semibold text-[var(--brand-orange)]">
                  {rank}. {theme.title}
                </span>
                <button
                  onClick={() => setExpandedTheme(null)}
                  className="text-xs text-[var(--text-muted)] cursor-pointer bg-transparent border-none hover:text-[var(--text-secondary)]"
                >
                  ▾ Collapse
                </button>
              </div>
              {theme.summary && (
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2.5">
                  {theme.summary}
                </p>
              )}
              {theme.sessions?.length > 0 && (
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  Appeared in: {theme.sessions.join(', ')} ({theme.sessionCount} of {totalSessions} sessions · {pct}%)
                </div>
              )}
              {theme.sampleQuestions?.length > 0 && (
                <ul className="text-xs text-[var(--text-secondary)] pl-4 list-disc mb-2.5">
                  {theme.sampleQuestions.map((q, qi) => (
                    <li key={qi} className="mb-1">{q}</li>
                  ))}
                </ul>
              )}
              <Link
                href={`/analytics/theme?title=${encodeURIComponent(theme.title)}`}
                className="text-xs text-[var(--brand-orange)] hover:underline"
              >
                See full analysis →
              </Link>
            </div>
          )
        }

        return (
          <button
            key={theme.title}
            onClick={() => setExpandedTheme(theme.title)}
            className="w-full flex items-center gap-3 p-3.5 px-4 -mx-1 rounded-xl hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group text-left bg-transparent border-none mb-1"
          >
            <span className="text-[13px] text-[var(--text-muted)] w-5 text-right shrink-0">{rank}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-orange)] transition-colors truncate">
                  {theme.title}
                </span>
                {theme.isNew && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.3)] shrink-0">
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
              <div className="text-[11px] text-[var(--text-muted)]">
                {theme.sessionCount} session{theme.sessionCount !== 1 ? 's' : ''}
              </div>
            </div>
            <span className="text-[var(--brand-orange)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[13px]">
              →
            </span>
          </button>
        )
      })}

      {!showAll && themes.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-[var(--brand-orange)] hover:underline px-4 bg-transparent border-none cursor-pointer"
        >
          View all {themes.length} themes →
        </button>
      )}
    </div>
  )
}
