'use client'

import { useState } from 'react'
import type { StudentSpeakerAnalysis } from '@/types'

const SOPHISTICATION_META: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: 'High', color: '#0f6b37', bg: 'rgba(15,107,55,0.12)' },
  moderate: { label: 'Moderate', color: '#f36f21', bg: 'rgba(243,111,33,0.12)' },
  surface: { label: 'Surface', color: '#666', bg: 'rgba(128,128,128,0.12)' },
}

const AGREEMENT_SENTIMENT_COLORS: Record<string, string> = {
  positive: '#0f6b37',
  negative: '#e53e3e',
  neutral: '#666',
}

interface Props {
  analysis: StudentSpeakerAnalysis
  fileCount: number
}

export function SpeakerAnalysisPanel({ analysis, fileCount }: Props) {
  const [expandedTheme, setExpandedTheme] = useState<number | null>(null)
  const [expandedQuality, setExpandedQuality] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Summary */}
      <div className="rounded-2xl border border-[rgba(15,107,55,0.2)] bg-[rgba(15,107,55,0.03)] p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#0f6b37]" />
          <h2 className="text-sm font-semibold text-[#0f6b37] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
            Speaker Analysis Summary
          </h2>
          <span className="ml-auto text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            {fileCount} {fileCount === 1 ? 'analysis' : 'analyses'}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-line">
          {analysis.summary}
        </p>
      </div>

      {/* Evaluation Themes */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
          Evaluation Themes
        </h2>
        <div className="flex flex-col gap-3">
          {analysis.evaluation_themes.map((theme, i) => {
            const isExpanded = expandedTheme === i
            const maxCount = Math.max(...analysis.evaluation_themes.map(t => t.student_count))
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
                      style={{ backgroundColor: 'rgba(15,107,55,0.12)', color: '#0f6b37' }}
                    >
                      {theme.student_count} {theme.student_count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border-accent)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, backgroundColor: '#0f6b37' }}
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
                        <span className="text-[#0f6b37] font-medium shrink-0">{q.student_name}:</span>
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

      {/* Leadership Qualities */}
      {analysis.leadership_qualities.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Leadership Qualities Identified
          </h2>
          <div className="flex flex-col gap-3">
            {analysis.leadership_qualities.map((quality, i) => {
              const isExpanded = expandedQuality === i
              return (
                <div
                  key={i}
                  className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setExpandedQuality(isExpanded ? null : i)}
                    className="w-full p-4 text-left flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                        {quality.quality}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                        {quality.mentioned_by} {quality.mentioned_by === 1 ? 'student' : 'students'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                      {quality.description}
                    </p>
                  </button>

                  {isExpanded && quality.quotes.length > 0 && (
                    <div className="px-4 pb-4 flex flex-col gap-2 border-t border-[var(--border-accent)] pt-3">
                      {quality.quotes.map((q, qi) => (
                        <div key={qi} className="flex gap-2 text-xs font-[family-name:var(--font-dm-sans)]">
                          <span className="text-[#0f6b37] font-medium shrink-0">{q.student_name}:</span>
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
      )}

      {/* Course Concept Connections */}
      {analysis.course_concept_connections.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Course Concept Connections
          </h2>
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-4">
            {analysis.course_concept_connections.map((conn, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full font-[family-name:var(--font-dm-sans)]"
                    style={{ backgroundColor: 'rgba(15,107,55,0.12)', color: '#0f6b37' }}
                  >
                    {conn.concept}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    {conn.student_count} {conn.student_count === 1 ? 'student' : 'students'}
                  </span>
                </div>
                {conn.examples.map((ex, ei) => (
                  <div key={ei} className="flex gap-2 text-xs font-[family-name:var(--font-dm-sans)] ml-1">
                    <span className="text-[#0f6b37] font-medium shrink-0">{ex.student_name}:</span>
                    <span className="text-[var(--text-secondary)] italic">&ldquo;{ex.text}&rdquo;</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Areas of Agreement & Disagreement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agreement */}
        {analysis.areas_of_agreement.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
              Areas of Agreement
            </h2>
            <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-3">
              {analysis.areas_of_agreement.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: AGREEMENT_SENTIMENT_COLORS[item.sentiment] ?? '#666' }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                      {item.point}
                    </p>
                    <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                      {item.student_count} {item.student_count === 1 ? 'student' : 'students'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disagreement */}
        {analysis.areas_of_disagreement.length > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
              Areas of Disagreement
            </h2>
            <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-4">
              {analysis.areas_of_disagreement.map((item, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                    {item.point}
                  </p>
                  {item.perspectives.map((p, pi) => (
                    <div key={pi} className="flex gap-2 text-xs font-[family-name:var(--font-dm-sans)] ml-2">
                      <span className="text-[#f36f21] font-medium shrink-0">{p.student_name}:</span>
                      <span className="text-[var(--text-secondary)] italic">&ldquo;{p.position}&rdquo;</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Analytical Sophistication */}
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
          Analytical Sophistication
        </h2>
        <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-4">
          {(Object.entries(analysis.analytical_sophistication) as [string, number | string][])
            .filter(([key]) => SOPHISTICATION_META[key])
            .map(([key, pct]) => {
              const meta = SOPHISTICATION_META[key]
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
          {analysis.analytical_sophistication.summary && (
            <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] italic mt-1">
              {analysis.analytical_sophistication.summary}
            </p>
          )}
        </div>
      </div>

      {/* Notable Observations */}
      {analysis.notable_observations.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Notable Observations
          </h2>
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 flex flex-col gap-4">
            {analysis.notable_observations.map((obs, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex gap-2 text-sm font-[family-name:var(--font-dm-sans)]">
                  <span className="text-[#0f6b37] font-medium shrink-0">{obs.student_name}:</span>
                  <span className="text-[var(--text-secondary)] italic">&ldquo;{obs.text}&rdquo;</span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] ml-1">
                  {obs.why_notable}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Powered by */}
      <div className="flex items-center justify-center gap-2 pt-2 pb-4">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0f6b37] animate-pulse" />
        <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Powered by Gemini
        </span>
      </div>
    </div>
  )
}
