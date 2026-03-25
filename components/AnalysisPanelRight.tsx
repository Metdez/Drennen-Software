// components/AnalysisPanelRight.tsx
import React from 'react'
import type { SessionAnalysis } from '@/types'
import { BRAND } from '@/lib/constants'

interface Props {
  analysis: SessionAnalysis | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
}

function SkeletonBlock({ h = 'h-24' }: { h?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] ${h} animate-pulse`} />
  )
}

const SENTIMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  aspirational: { label: 'Aspirational', color: '#5e9e6e', bg: 'rgba(15,107,55,0.15)' },
  curious:      { label: 'Curious',       color: '#a78bda', bg: 'rgba(84,39,133,0.2)'  },
  personal:     { label: 'Personal',      color: '#888',    bg: 'rgba(100,100,100,0.15)' },
  critical:     { label: 'Critical',      color: '#c47a3a', bg: 'rgba(243,111,33,0.12)' },
}

export function AnalysisPanelRight({ analysis, loading, error, onRetry }: Props) {
  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-1">
            Class Insights
          </p>
          <div className="h-px bg-gradient-to-r from-[#542785] via-[#f36f21] to-transparent" />
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            <SkeletonBlock h="h-8" />
            <SkeletonBlock h="h-48" />
            <SkeletonBlock h="h-32" />
            <SkeletonBlock h="h-32" />
          </div>
        )}

        {!loading && analysis && (
          <>
            {/* Gemini Suggests */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                ✦ Gemini Suggests
              </h2>
              <div className="flex flex-col gap-3">
                {analysis.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(13,24,24,0.8)', border: '1px solid rgba(26,48,48,0.8)' }}
                  >
                    <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: '#7dd4d4' }}>
                      {s.text}
                    </p>
                    <p className="text-xs mt-2 leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: '#4a8080' }}>
                      {s.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Blind Spots */}
            {analysis.blind_spots.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  🔍 Blind Spots
                </h2>
                <div className="flex flex-col gap-3">
                  {analysis.blind_spots.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-2xl p-5"
                      style={{ background: 'rgba(15,15,15,0.8)', border: '1px solid rgba(15,107,55,0.2)' }}
                    >
                      <p className="text-sm font-semibold mb-1.5 font-[family-name:var(--font-dm-sans)]" style={{ color: BRAND.GREEN }}>
                        {b.title}
                      </p>
                      <p className="text-sm leading-relaxed text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                        {b.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Student Sentiment */}
            <div className="flex flex-col gap-4">
              <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                Student Sentiment
              </h2>
              <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-4">
                {(Object.entries(analysis.sentiment) as [string, number][])
                  .filter(([key]) => SENTIMENT_META[key])
                  .map(([key, pct]) => {
                    const meta = SENTIMENT_META[key]
                    return (
                      <div key={key}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                            {meta.label}
                          </span>
                          <span
                            className="text-xs font-bold px-2.5 py-0.5 rounded-full tabular-nums font-[family-name:var(--font-dm-sans)]"
                            style={{ backgroundColor: meta.bg, color: meta.color }}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border-accent)]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: meta.color }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </>
        )}

        {!loading && !analysis && error && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-red-400 font-[family-name:var(--font-dm-sans)]">Insights failed to load</p>
            <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 text-xs px-4 py-1.5 rounded-full border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[#f36f21] hover:border-[#f36f21] transition-colors font-[family-name:var(--font-dm-sans)]"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !analysis && !error && (
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
              No submission data available for this session.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-accent)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7dd4d4] animate-pulse" />
          <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">Powered by Gemini</span>
        </div>

      </div>
    </div>
  )
}
