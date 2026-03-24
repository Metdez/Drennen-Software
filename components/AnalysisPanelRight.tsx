// components/AnalysisPanelRight.tsx
import React from 'react'
import type { SessionAnalysis } from '@/types'
import { BRAND } from '@/lib/constants'

interface Props {
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

const SENTIMENT_COLORS: Record<string, React.CSSProperties> = {
  aspirational: { backgroundColor: 'rgba(15,107,55,0.15)', color: '#5e9e6e' },
  curious: { backgroundColor: 'rgba(84,39,133,0.2)', color: '#a78bda' },
  personal: { backgroundColor: 'rgba(100,100,100,0.15)', color: '#888' },
  critical: { backgroundColor: 'rgba(243,111,33,0.12)', color: '#c47a3a' },
}

export function AnalysisPanelRight({ analysis, loading }: Props) {
  return (
    <div className="flex flex-col gap-3 py-10 px-4">
      <p className="text-[0.6rem] uppercase tracking-widest text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Class Insights
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
          {/* Gemini Suggestions */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              ✦ Gemini Suggests
            </p>
            <div className="flex flex-col gap-1.5">
              {analysis.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2"
                  style={{ background: 'rgba(13,24,24,0.8)', border: '1px solid rgba(26,48,48,0.8)' }}
                >
                  <p className="text-[0.62rem] leading-relaxed" style={{ color: '#7dd4d4' }}>{s.text}</p>
                  <p className="text-[0.58rem] mt-1" style={{ color: '#4a8080' }}>{s.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Blind Spots */}
          {analysis.blind_spots.length > 0 && (
            <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
              <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
                🔍 Blind Spots
              </p>
              <div className="flex flex-col gap-1.5">
                {analysis.blind_spots.map((b, i) => (
                  <div
                    key={i}
                    className="rounded-md p-2"
                    style={{ background: 'rgba(15,15,15,0.8)', border: '1px solid rgba(26,36,26,0.8)' }}
                  >
                    <p className="text-[0.63rem] font-semibold" style={{ color: BRAND.GREEN }}>{b.title}</p>
                    <p className="text-[0.6rem] mt-1 leading-snug text-[var(--text-muted)]">{b.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Sentiment */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              Student Sentiment
            </p>
            <div className="divide-y divide-[var(--border-accent)]">
              {(Object.entries(analysis.sentiment) as [keyof typeof SENTIMENT_COLORS, number][]).map(([key, pct]) => (
                <div key={key} className="flex justify-between items-center py-1.5 first:pt-0 last:pb-0">
                  <span className="text-[0.63rem] text-[var(--text-muted)] capitalize font-[family-name:var(--font-dm-sans)]">
                    {key}
                  </span>
                  <span
                    className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full"
                    style={SENTIMENT_COLORS[key]}
                  >
                    {pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>
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
