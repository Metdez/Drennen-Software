/**
 * ComparativeNarrative — AI-generated narrative + key differences + recommendations panel.
 *
 * Renders the Gemini-powered comparative analysis between two sessions. Shows an
 * empty-state "Generate" button if no analysis exists yet, an animated skeleton
 * while generating, and the full narrative once complete.
 *
 * Rendered by: app/(app)/compare/page.tsx (narrative tab),
 *              app/(public)/shared/compare/[token]/page.tsx (read-only)
 * Data source: ComparativeAnalysis type from /api/compare/analysis
 */
'use client'

import type { ComparativeAnalysis } from '@/types'

/**
 * Props for ComparativeNarrative.
 * @prop analysis     - AI comparative analysis; null until generated.
 * @prop onGenerate   - Triggers the POST /api/compare/analysis call in the parent.
 * @prop isGenerating - True while the analysis API call is in-flight; shows skeleton.
 */
/**
 * Defines the shape of the properties (props) that the ComparativeNarrative component accepts.
 * 1. It specifies the expected inputs for the component.
 * 2. This interface is used to ensure type safety and provide clear documentation for the component's API, making it easier to understand and use.
 * 3. Key properties include `analysis` (the AI comparative analysis, which can be `null` initially), `onGenerate` (a callback function to trigger the analysis generation), and `isGenerating` (a boolean indicating if the analysis is currently being fetched or processed).
 */
interface ComparativeNarrativeProps {
  analysis: ComparativeAnalysis | null
  onGenerate: () => void
  isGenerating: boolean
}

/**
 * Color palette for key-difference dimension badges.
 * The AI returns dimension strings like "themes", "sentiment", etc.
 * Falls back to engagement colors for any unrecognised dimension.
 */
/**
 * Stores a predefined color palette for visually representing different dimensions of key differences in the AI comparative analysis.
 * 1. It maps specific analysis dimension strings (e.g., 'themes', 'sentiment') to unique background and text colors.
 * 2. This is used to provide a consistent and aesthetically pleasing way to highlight and categorize key differences in the user interface, improving readability and information hierarchy.
 * 3. It is a JavaScript object (Record) where keys are dimension names and values are objects containing `bg` (background color) and `text` (text color) properties, both as RGBA or hex color strings. A fallback color set (engagement) is provided for any dimension not explicitly listed.
 */
const DIMENSION_COLORS: Record<string, { bg: string; text: string }> = {
  themes: { bg: 'rgba(84,39,133,0.10)', text: '#542785' },
  sentiment: { bg: 'rgba(243,111,33,0.10)', text: '#f36f21' },
  participation: { bg: 'rgba(15,107,55,0.10)', text: '#0f6b37' },
  quality: { bg: 'rgba(59,130,246,0.10)', text: '#3b82f6' },
  engagement: { bg: 'rgba(168,85,247,0.10)', text: '#a855f7' },
}

/**
 * A React functional component that renders the AI-generated comparative analysis between two sessions.
 * 1. It displays the analysis's narrative, key differences, and recommendations in a structured format.
 * 2. This component is used to present complex AI analysis results to the user in an understandable and interactive way. It handles different UI states including an initial state with a call to action, a loading state, and the final display of the analysis.
 * 3. It is a client-side component ('use client'). It conditionally renders based on the `analysis` and `isGenerating` props: showing a 'Generate Analysis' button if no analysis exists, a skeleton loading state if `isGenerating` is true, and the full analysis content otherwise. It utilizes `DIMENSION_COLORS` to style key difference badges and includes a 'Powered by Gemini' footer. Styling is applied using Tailwind CSS classes and custom CSS variables.
 */
// Surfaces the AI narrative that appears in both the internal compare tab and the shared comparison link.
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
