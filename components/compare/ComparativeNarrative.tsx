'use client'

import type { ComparativeAnalysis } from '@/types'

interface ComparativeNarrativeProps {
  analysis: ComparativeAnalysis | null
  onGenerate: () => void
  isGenerating: boolean
}

const DIMENSION_COLORS: Record<string, { bg: string; text: string }> = {
  themes: { bg: 'rgba(84,39,133,0.10)', text: '#542785' },
  sentiment: { bg: 'rgba(243,111,33,0.10)', text: '#f36f21' },
  participation: { bg: 'rgba(15,107,55,0.10)', text: '#0f6b37' },
  quality: { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6' },
  engagement: { bg: 'rgba(168,85,247,0.10)', text: '#a855f7' },
}

export function ComparativeNarrative({ analysis, onGenerate, isGenerating }: ComparativeNarrativeProps) {
  if (!analysis && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-[var(--text-muted)] mb-4 font-[family-name:var(--font-dm-sans)]">
          Generate an AI-powered comparative analysis of these two sessions.
        </p>
        <button
          onClick={onGenerate}
          className="px-6 py-2.5 rounded-full bg-[#f36f21] text-white text-sm font-semibold font-[family-name:var(--font-dm-sans)] hover:bg-[#e0611a] transition-colors"
        >
          Generate Comparative Analysis
        </button>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="rounded-xl p-6" style={{ background: 'var(--surface-elevated)' }}>
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-[var(--border)]" />
            <div className="h-4 w-5/6 rounded bg-[var(--border)]" />
            <div className="h-4 w-4/6 rounded bg-[var(--border)]" />
            <div className="h-4 w-full rounded bg-[var(--border)]" />
            <div className="h-4 w-3/4 rounded bg-[var(--border)]" />
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--surface-elevated)' }}>
              <div className="h-3 w-24 rounded bg-[var(--border)] mb-2" />
              <div className="h-3 w-full rounded bg-[var(--border)]" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-[family-name:var(--font-dm-sans)]">
      {/* Narrative */}
      <div className="rounded-xl p-6" style={{ background: 'var(--surface-elevated)' }}>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Comparative Analysis
        </h3>
        <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
          {analysis!.narrative}
        </div>
      </div>

      {/* Key Differences */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Key Differences
        </h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {analysis!.key_differences.map((diff, i) => {
            const colors = DIMENSION_COLORS[diff.dimension] ?? DIMENSION_COLORS.engagement
            return (
              <div key={i} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {diff.dimension}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  {diff.title}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {diff.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
          Recommendations
        </h3>
        <div className="space-y-3">
          {analysis!.recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-xl p-4 border-l-2 border-l-[#f36f21]"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{rec.text}</p>
              <p className="text-xs text-[var(--text-muted)]">{rec.reason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 justify-center pt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f36f21] animate-pulse" />
        <span className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
          Powered by Gemini
        </span>
      </div>
    </div>
  )
}
