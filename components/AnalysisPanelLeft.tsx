// components/AnalysisPanelLeft.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { SessionAnalysis } from '@/types'
import { BRAND, ROUTES } from '@/lib/constants'

interface Props {
  sessionId: string
  analysis: SessionAnalysis | null
  loading: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3 animate-pulse">
      <div className="h-2.5 bg-[var(--border-accent)] rounded w-2/3 mb-3" />
      <div className="h-2 bg-[var(--border-accent)] rounded w-full mb-2" />
      <div className="h-2 bg-[var(--border-accent)] rounded w-4/5" />
    </div>
  )
}

export function AnalysisPanelLeft({ sessionId, analysis, loading }: Props) {
  const router = useRouter()

  function handleThemeClick(themeName: string) {
    const url = `${ROUTES.PREVIEW_THEME}?sessionId=${sessionId}&theme=${encodeURIComponent(themeName)}`
    router.push(url)
  }

  const maxCount = analysis
    ? Math.max(...analysis.theme_clusters.map((c) => c.question_count), 1)
    : 1

  return (
    <div className="flex flex-col gap-3 py-10 px-4">
      <p className="text-[0.6rem] uppercase tracking-widest text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Question Analysis
      </p>

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {!loading && analysis && (
        <>
          {/* Theme Clusters */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              Theme Clusters
              <span className="text-[var(--text-muted)] font-normal ml-1">— click to explore</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {analysis.theme_clusters.map((cluster, i) => {
                const barWidth = Math.round((cluster.question_count / maxCount) * 100)
                const isTop = i === 0
                return (
                  <button
                    key={cluster.name}
                    onClick={() => handleThemeClick(cluster.name)}
                    className="w-full text-left rounded-lg border border-[var(--border-accent)] bg-[var(--bg)] p-2 group hover:border-[#f36f21] hover:bg-[rgba(243,111,33,0.05)] transition-all duration-150"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[0.65rem] font-medium text-[var(--text-secondary)] group-hover:text-[#f36f21] transition-colors">
                        {cluster.name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: isTop ? 'rgba(243,111,33,0.12)' : 'rgba(255,255,255,0.05)',
                            color: isTop ? BRAND.ORANGE : 'var(--text-muted)',
                          }}
                        >
                          {cluster.question_count}
                        </span>
                        <span className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity text-xs">→</span>
                      </div>
                    </div>
                    <div className="h-[3px] rounded-full bg-[var(--border-accent)] mb-1.5">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${barWidth}%`,
                          background: isTop
                            ? `linear-gradient(90deg, ${BRAND.ORANGE}, ${BRAND.PURPLE})`
                            : `linear-gradient(90deg, ${BRAND.PURPLE}, #333)`,
                        }}
                      />
                    </div>
                    <p className="text-[0.58rem] text-[var(--text-muted)] italic truncate">
                      &ldquo;{cluster.top_question}&rdquo;
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Underlying Tensions */}
          {analysis.tensions.length > 0 && (
            <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
              <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
                ⚡ Underlying Tensions
              </p>
              <div className="flex flex-col divide-y divide-[var(--border-accent)]">
                {analysis.tensions.map((t) => (
                  <div key={t.label} className="flex gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="text-[#542785] text-[0.7rem] flex-shrink-0 mt-0.5">↔</span>
                    <div>
                      <span className="text-[0.62rem] text-[#a78bda] font-medium">{t.label}</span>
                      <span className="text-[0.62rem] text-[var(--text-muted)]"> — {t.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !analysis && (
        <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
          <p className="text-[0.65rem] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            No submission data available for this session.
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#7dd4d4] animate-pulse" />
        <span className="text-[0.58rem] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">Powered by Gemini</span>
      </div>
    </div>
  )
}
