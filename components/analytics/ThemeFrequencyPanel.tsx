/**
 * ThemeFrequencyPanel — Collapsible ranked-bar chart of theme recurrence across all sessions.
 *
 * Fetches theme frequency data on mount from /api/analytics/themes and renders a
 * ranked list with proportional bars. Each entry shows the theme title, last-seen
 * date, and total session count. The entire panel can be collapsed by clicking the
 * header toggle.
 *
 * Rendered by: app/(app)/analytics/page.tsx (Theme Frequency sidebar section)
 * Calls: GET /api/analytics/themes
 */
'use client'

import { useEffect, useState } from 'react'
import type { ThemeFrequency } from '@/lib/db/themes'

/**
 * Self-contained panel — no external props.
 * Fetches its own data via /api/analytics/themes on mount.
 */
/**
 * A self-contained React client component that displays the frequency of various themes. It fetches its own data from the `/api/analytics/themes` endpoint upon mounting.
 *
 * What it does: Renders a collapsible panel showing a list of themes, their usage counts, the last time they were seen, and a visual bar indicating their relative frequency.
 * Why it is used: To provide users with insights into the most frequently used themes within the application, aiding in understanding user engagement or content popularity.
 * Important implementation details:
 * - It's a client-side component, indicated by `'use client'`.
 * - Manages its own state for `themes` (the fetched data), `loading` (to indicate data fetching status), and `open` (to control the panel's collapsed state).
 * - Uses the `useEffect` hook to fetch theme data asynchronously from `/api/analytics/themes` once the component mounts.
 * - Handles loading and empty data states gracefully, displaying appropriate messages.
 * - Calculates a `maxCount` from the most frequent theme to normalize the width of the frequency bars.
 * - Formats the `lastSeen` date for better readability.
 * - Styling is applied using Tailwind CSS classes and CSS variables for theming.
 */
export function ThemeFrequencyPanel() {
  const [themes, setThemes] = useState<ThemeFrequency[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/themes')
      .then(r => r.json())
      .then(data => setThemes(data.themes ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Normalize every bar against the highest-count theme so relative lengths stay proportional.
  const maxCount = themes[0]?.count ?? 1

  return (
    <div
      className="rounded-xl border font-[family-name:var(--font-dm-sans)]"
      style={{ borderColor: 'var(--border-accent)', background: 'var(--surface)' }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          Theme Frequency
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {open ? '▲ hide' : '▼ show'}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[var(--border-accent)]">
          {loading ? (
            <p className="pt-4 text-sm text-[var(--text-muted)]">Loading…</p>
          ) : themes.length === 0 ? (
            <p className="pt-4 text-sm text-[var(--text-muted)]">
              No theme data yet — generate a session to start tracking.
            </p>
          ) : (
            <div className="pt-4 flex flex-col gap-2.5">
              {themes.map((theme, i) => {
                const barPct = Math.round((theme.count / maxCount) * 100)
                const lastSeen = new Date(theme.lastSeen).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
                return (
                  <div key={theme.themeTitle}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--text-muted)] w-5 text-right tabular-nums shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {theme.themeTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-xs text-[var(--text-muted)]">last {lastSeen}</span>
                        <span className="text-sm font-semibold text-[#f36f21] tabular-nums w-6 text-right">
                          {theme.count}
                        </span>
                      </div>
                    </div>
                    <div className="ml-7 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-accent)' }}>
                      <div
                        className="h-full rounded-full bg-[#f36f21]"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
