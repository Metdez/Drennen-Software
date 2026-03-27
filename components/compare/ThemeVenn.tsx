'use client'

import type { ThemeOverlapResult } from '@/types'

interface ThemeVennProps {
  themeOverlap: ThemeOverlapResult
  speakerA: string
  speakerB: string
}

export function ThemeVenn({ themeOverlap, speakerA, speakerB }: ThemeVennProps) {
  return (
    <div className="grid grid-cols-3 gap-6 font-[family-name:var(--font-dm-sans)]">
      {/* Unique to A */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Only in {speakerA}
        </h3>
        <div className="space-y-2">
          {themeOverlap.uniqueToA.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic">None — all themes shared</p>
          ) : (
            themeOverlap.uniqueToA.map((theme, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm font-medium"
                style={{ background: 'rgba(243,111,33,0.08)', color: '#f36f21' }}
              >
                {theme}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Shared */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 text-center">
          Shared Themes ({themeOverlap.shared.length})
        </h3>
        <div className="space-y-2">
          {themeOverlap.shared.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic text-center">No shared themes</p>
          ) : (
            themeOverlap.shared.map((pair, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm text-center"
                style={{ background: 'rgba(84,39,133,0.08)', color: '#542785' }}
              >
                <div className="font-medium">{pair.themeA}</div>
                {pair.themeA !== pair.themeB && (
                  <div className="text-xs opacity-70 mt-0.5">↔ {pair.themeB}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Unique to B */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 text-right">
          Only in {speakerB}
        </h3>
        <div className="space-y-2">
          {themeOverlap.uniqueToB.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] italic text-right">None — all themes shared</p>
          ) : (
            themeOverlap.uniqueToB.map((theme, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg text-sm font-medium text-right"
                style={{ background: 'rgba(15,107,55,0.08)', color: '#0f6b37' }}
              >
                {theme}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
