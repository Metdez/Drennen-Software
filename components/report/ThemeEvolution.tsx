'use client'

import type { ThemeEvolutionSection } from '@/types'

interface Props {
  data: ThemeEvolutionSection
}

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

export function ThemeEvolution({ data }: Props) {
  return (
    <section id="theme-evolution" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Theme Evolution
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Narrative */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {data.narrative}
      </p>

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Session Timeline</h3>
          <div className="space-y-4">
            {data.timeline.map((entry, idx) => {
              const date = new Date(entry.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={entry.sessionId}
                  className={`flex flex-col md:flex-row md:items-start gap-3 ${
                    idx < data.timeline.length - 1
                      ? 'pb-4 border-b border-[var(--border)]'
                      : ''
                  }`}
                >
                  <div className="shrink-0 w-32">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {entry.speakerName}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{date}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {entry.themes.map((theme) => {
                      const colorIdx = Math.abs(hashString(theme)) % THEME_COLORS.length
                      const c = THEME_COLORS[colorIdx]
                      return (
                        <span
                          key={theme}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                          style={{ background: c.bg, borderColor: c.border, color: c.text }}
                        >
                          {theme}
                        </span>
                      )
                    })}
                    {entry.themes.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">No themes recorded</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dominant themes table */}
      {data.dominantThemes.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Dominant Themes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Theme
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Count
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    First Seen
                  </th>
                  <th className="text-center py-2 pl-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dominantThemes.map((t) => (
                  <tr key={t.title} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{t.title}</td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-secondary)]">{t.totalCount}</td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-muted)] text-xs">
                      {new Date(t.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5 pl-4 text-center text-[var(--text-muted)] text-xs">
                      {new Date(t.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
