// components/AnalysisPanelLeft.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { SessionAnalysis } from '@/types'
import { BRAND, ROUTES } from '@/lib/constants'

interface Props {
  sessionId: string
  analysis: SessionAnalysis | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
  readOnly?: boolean
}

function SkeletonBlock({ h = 'h-24' }: { h?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] ${h} animate-pulse`} />
  )
}

export function AnalysisPanelLeft({ sessionId, analysis, loading, error, onRetry, readOnly }: Props) {
  const router = useRouter()

  function handleThemeClick(themeName: string) {
    const url = `${ROUTES.PREVIEW_THEME}?sessionId=${sessionId}&theme=${encodeURIComponent(themeName)}`
    router.push(url)
  }

  const maxCount = analysis
    ? Math.max(...analysis.theme_clusters.map((c) => c.question_count), 1)
    : 1

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-1">
            Question Analysis
          </p>
          <div className="h-px bg-gradient-to-r from-[#f36f21] via-[#542785] to-transparent" />
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            <SkeletonBlock h="h-8" />
            <SkeletonBlock h="h-48" />
            <SkeletonBlock h="h-32" />
          </div>
        )}

        {!loading && analysis && (
          <>
            {/* Theme Clusters */}
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  Theme Clusters
                </h2>
                {!readOnly && (
                  <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    click any to deep-dive →
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {analysis.theme_clusters.map((cluster, i) => {
                  const barWidth = Math.round((cluster.question_count / maxCount) * 100)
                  const isTop = i === 0
                  const Wrapper = readOnly ? 'div' : 'button'
                  return (
                    <Wrapper
                      key={cluster.name}
                      {...(!readOnly ? { onClick: () => handleThemeClick(cluster.name) } : {})}
                      className={`w-full text-left rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 group transition-all duration-200${readOnly ? '' : ' hover:border-[#f36f21]'}`}
                      style={{ background: isTop ? 'rgba(243,111,33,0.04)' : undefined }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#f36f21] transition-colors leading-snug font-[family-name:var(--font-dm-sans)]">
                          {cluster.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full tabular-nums font-[family-name:var(--font-dm-sans)]"
                            style={{
                              background: isTop ? 'rgba(243,111,33,0.15)' : 'rgba(255,255,255,0.06)',
                              color: isTop ? BRAND.ORANGE : 'var(--text-secondary)',
                            }}
                          >
                            {cluster.question_count}
                          </span>
                          {!readOnly && <span className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 rounded-full bg-[var(--border-accent)] mb-3">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: isTop
                              ? `linear-gradient(90deg, ${BRAND.ORANGE}, ${BRAND.PURPLE})`
                              : `linear-gradient(90deg, ${BRAND.PURPLE}, rgba(84,39,133,0.3))`,
                          }}
                        />
                      </div>

                      {/* Top question preview */}
                      <p className="text-xs text-[var(--text-muted)] italic leading-relaxed line-clamp-2 font-[family-name:var(--font-dm-sans)]">
                        &ldquo;{cluster.top_question}&rdquo;
                      </p>
                    </Wrapper>
                  )
                })}
              </div>
            </div>

            {/* Underlying Tensions */}
            {analysis.tensions.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  ⚡ Underlying Tensions
                </h2>
                <div className="flex flex-col gap-3">
                  {analysis.tensions.map((t) => (
                    <div
                      key={t.label}
                      className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#a78bda] text-base">↔</span>
                        <span className="text-sm font-semibold text-[#a78bda] font-[family-name:var(--font-dm-sans)]">
                          {t.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !analysis && error && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-red-400 font-[family-name:var(--font-dm-sans)]">Analysis failed to load</p>
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
