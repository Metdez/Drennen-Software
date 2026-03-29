'use client'

import { useEffect, useState } from 'react'
import type { ThemeFrequency } from '@/lib/db/themes'

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
