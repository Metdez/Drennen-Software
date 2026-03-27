'use client'

import type { ExecutiveSummarySection } from '@/types'

interface Props {
  data: ExecutiveSummarySection
}

export function ExecutiveSummary({ data }: Props) {
  const metrics = [
    { label: 'Sessions', value: String(data.keyMetrics.totalSessions) },
    { label: 'Submissions', value: String(data.keyMetrics.totalSubmissions) },
    { label: 'Students', value: String(data.keyMetrics.totalStudents) },
    { label: 'Avg / Session', value: data.keyMetrics.avgSubmissionsPerSession.toFixed(1) },
    { label: 'Participation', value: `${Math.round(data.keyMetrics.participationRate * 100)}%` },
  ]

  return (
    <section id="executive-summary" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Executive Summary
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Narrative */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {data.narrative}
      </p>

      {/* Key metrics stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-center"
          >
            <div className="text-xl font-bold text-[var(--text-primary)]">{m.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {data.highlights.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Key Highlights</h3>
          <ul className="space-y-2">
            {data.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--brand-orange)] mt-0.5 shrink-0">&#9670;</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
