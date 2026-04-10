/**
 * ExecutiveSummary — Top section of the semester report with key metrics and highlights.
 *
 * Renders a narrative paragraph, a row of five stat cards (sessions, submissions,
 * students, avg per session, participation rate), and a bulleted highlights list.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (executive summary section),
 *              app/(public)/portfolio/[token]/reports/[reportId]/page.tsx
 * Data source: ExecutiveSummarySection from SemesterReport type
 */
'use client'

import type { ExecutiveSummarySection } from '@/types'

/**
 * Props for ExecutiveSummary.
 * @prop data - Executive summary section with keyMetrics, narrative, and highlights.
 */
/**
 * Defines the shape of the props object passed to the ExecutiveSummary component.
 * 1. What it does: Specifies the structure of the data object required by the component.
 * 2. Why it is used: Ensures type safety and provides clear documentation for the expected input to the ExecutiveSummary component.
 * 3. Important implementation details: It contains a single property, `data`, which is of type `ExecutiveSummarySection`, a custom type defining the content for the executive summary.
 */
interface Props {
  data: ExecutiveSummarySection
}

/**
 * Renders a comprehensive executive summary section for a report or dashboard.
 * 1. What it does: Displays key performance indicators (KPIs) as stat cards, a narrative summary, and a list of key highlights, all derived from the provided data.
 * 2. Why it is used: To present a high-level, easily digestible overview of critical information and insights, making it a crucial component for any report that needs to convey primary takeaways quickly.
 * 3. Important implementation details:
 *     - It is a client-side component, indicated by `'use client'`.
 *     - It accepts a `data` prop of type `ExecutiveSummarySection`, which dictates the content.
 *     - Key metrics (Sessions, Submissions, Students, Avg / Session, Participation) are calculated and formatted dynamically from `data.keyMetrics` and rendered as individual, stylized stat cards.
 *     - The narrative is rendered directly from `data.narrative`.
 *     - Highlights are conditionally rendered only if `data.highlights` contains elements, providing flexibility.
 *     - Uses Tailwind CSS for styling, including responsive grid layouts (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`) and custom CSS variables for consistent theming (e.g., `var(--font-playfair)`, `var(--text-primary)`, `var(--brand-orange)`).
 */
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
