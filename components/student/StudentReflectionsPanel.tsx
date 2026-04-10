'use client'

/**
 * StudentReflectionsPanel — Debrief-analysis display panel.
 *
 * Renders a fully structured view of AI-generated student reflection insights:
 *  - Reflection summary (count + prose)
 *  - Reflection themes (expandable bar-chart rows with per-student quotes)
 *  - Key moments (sentiment-dot + mention count)
 *  - What surprised students (quote list)
 *  - Career connections (per-student career area + quote)
 *  - Student sentiment breakdown (horizontal progress bars)
 *
 * Does not fetch data itself; receives a pre-loaded `StudentDebriefAnalysis`
 * object from the parent.  Powered by Gemini.
 *
 * Rendered by: app/(app)/preview/page.tsx (debrief tab, reflections sub-tab)
 */

import { useState } from 'react'
import type { StudentDebriefAnalysis } from '@/types'

/**
 * Stores metadata for different student sentiments, including their display label, foreground color, and background color.
 * It is used to ensure consistent styling and labeling across the UI when displaying sentiment breakdowns.
 * Each key represents a sentiment category (e.g., 'inspired', 'reflective'), and its value is an object containing `label` for display, `color` for text, and `bg` for background styling.
 */
const SENTIMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  inspired: { label: 'Inspired', color: '#0f6b37', bg: 'rgba(15,107,55,0.12)' },
  reflective: { label: 'Reflective', color: '#542785', bg: 'rgba(84,39,133,0.12)' },
  challenged: { label: 'Challenged', color: '#f36f21', bg: 'rgba(243,111,33,0.12)' },
  indifferent: { label: 'Indifferent', color: '#666', bg: 'rgba(128,128,128,0.12)' },
}

/**
 * Maps sentiment types for key moments to specific hexadecimal color codes.
 * It is used to visually represent the sentiment (positive, neutral, mixed) of individual key moments with a distinct color dot.
 * This constant provides a quick lookup for styling based on the sentiment string received from the analysis data.
 */
const MOMENT_SENTIMENT_COLORS: Record<string, string> = {
  positive: '#0f6b37',
  neutral: '#666',
  mixed: '#f36f21',
}

/**
 * Defines the shape of the properties accepted by the `StudentReflectionsPanel` component.
 * It is used to strongly type the input data for the component, ensuring that the `analysis` object and `fileCount` are provided in the expected format.
 * `analysis`: Contains all the structured data derived from student reflections, such as summary, themes, key moments, and sentiment breakdown. `fileCount`: Represents the total number of reflection files analyzed.
 */
interface Props {
  analysis: StudentDebriefAnalysis
  fileCount: number
}

/**
 * A React functional component that displays a comprehensive analysis of student reflections.
 * It is used to present insights derived from student feedback in a structured and visually appealing manner, making it easier for educators or administrators to understand student experiences and sentiments.
 * This component uses the `useState` hook to manage the expansion state of reflection themes. It renders various sections including a summary, collapsible reflection themes with student quotes, key moments, student surprises, career connections, and a sentiment breakdown, all dynamically populated from the `analysis` prop. Styling is primarily handled using Tailwind CSS classes and inline styles based on predefined color constants.
 */
export function StudentReflectionsPanel({ analysis, fileCount }: Props) {
  // This panel renders the same aggregated debrief analysis that the detail view references when labelling reflections inside the submissions tab.
  const [expandedTheme, setExpandedTheme] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Summary */}
      <div className="rounded-2xl border border-[rgba(84,39,133,0.2)] bg-[rgba(84,39,133,0.03)] p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#542785]" />
          <h2 className="text-sm font-semibold text-[#542785] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
            Reflection Summary
          </h2>
          <span className="ml-auto text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            {fileCount} {fileCount === 1 ? 'reflection' : 'reflections'}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-line">
          {analysis.summary}
        </p>
      </div>

      {/* Reflection Themes */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
          Reflection Themes
        </h2>
        <div className="flex flex-col gap-3">
          {analysis.reflection_themes.map((theme, i) => {
            const isExpanded = expandedTheme === i
            const maxCount = Math.max(...analysis.reflection_themes.map(t => t.student_count))
            const barWidth = maxCount > 0 ? (theme.student_count / maxCount) * 100 : 0

            return (
              <div
                key={i}
                className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => setExpandedTheme(isExpanded ? null : i)}
                  className="w-full p-4 text-left flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                      {theme.name}
                    </span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full font-[family-name:var(--font-dm-sans)]"
                      style={{ backgroundColor: 'rgba(84,39,133,0.12)', color: '#542785' }}
                    >
                      {theme.student_count} {theme.student_count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border-accent)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, backgroundColor: '#542785' }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    {theme.description}
                  </p>
                </button>

                {isExpanded && theme.quotes.length > 0 && (
                  <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[var(--border-accent)] pt-3">
                    {theme.quotes.map((q, qi) => (
                      <div key={qi} className="flex gap-2 text-xs font-[family-name:var(--font-dm-sans)]">
                        <span className="text-[#542785] font-medium shrink-0">{q.student_name}:</span>
                        <span className="text-[var(--text-secondary)] italic">&ldquo;{q.text}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Key Moments */}
      {analysis.key_moments.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Key Moments
          </h2>
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-3">
            {analysis.key_moments.map((moment, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: MOMENT_SENTIMENT_COLORS[moment.sentiment] ?? '#666' }}
                />
                <div className="flex-1">
                  <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                    {moment.moment}
                  </p>
                  <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    Mentioned by {moment.mentioned_by} {moment.mentioned_by === 1 ? 'student' : 'students'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Surprises */}
      {analysis.surprises.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            What Surprised Students
          </h2>
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-3">
            {analysis.surprises.map((s, i) => (
              <div key={i} className="flex gap-2 text-sm font-[family-name:var(--font-dm-sans)]">
                <span className="text-[#f36f21] font-medium shrink-0">{s.student_name}:</span>
                <span className="text-[var(--text-secondary)] italic">&ldquo;{s.text}&rdquo;</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Connections */}
      {analysis.career_connections.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Career Connections
          </h2>
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-3">
            {analysis.career_connections.map((c, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                    {c.student_name}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-[family-name:var(--font-dm-sans)]"
                    style={{ backgroundColor: 'rgba(15,107,55,0.12)', color: '#0f6b37' }}
                  >
                    {c.career_area}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] italic">
                  &ldquo;{c.text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment Breakdown */}
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

      {/* Powered by */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#542785] animate-pulse" />
        <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Powered by Gemini
        </span>
      </div>
    </div>
  )
}
