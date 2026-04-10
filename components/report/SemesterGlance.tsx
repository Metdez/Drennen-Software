/**
 * SemesterGlance — "Semester at a Glance" stats section of the semester report.
 *
 * Renders four stat cards, a submissions-over-time bar chart (BRAND.ORANGE bars),
 * and a tier distribution bar chart with percentage annotations.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (semester at a glance section)
 * Data source: SemesterGlanceSection from SemesterReport type
 */
'use client'

import type { SemesterGlanceSection } from '@/types'
import { BRAND } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

/**
 * Props for SemesterGlance.
 * @prop data - Semester glance section with stats, sessionsOverTime, tierDistribution.
 */
/**
 * Defines the shape of the props accepted by the SemesterGlance component.
 *
 * What it does: It ensures that the `SemesterGlance` component receives the necessary data structure to render its content.
 * Why it is used: It provides type safety and clarity for the component's input, making the component easier to use and maintain.
 * Important implementation details: It contains a single property, `data`, which is of type `SemesterGlanceSection`.
 */
interface Props {
  data: SemesterGlanceSection
}

/**
 * A React functional component that displays an "Semester at a Glance" section, providing a summary of key statistics, a bar chart of submissions over time, and a distribution of tiers.
 *
 * What it does: It takes `SemesterGlanceSection` data as input and renders various visual components to present a comprehensive overview of a semester's performance. This includes summary stat cards, a bar chart visualizing submissions per session over time, and a progress bar visualization for tier distribution.
 * Why it is used: This component is crucial for providing administrators or instructors with a quick, high-level understanding of activity and performance metrics within a given semester, serving as a key part of a larger report page.
 * Important implementation details:
 * - It's a client-side component (`'use client'`) due to interactive elements like tooltips in the chart.
 * - It processes raw `data` into derived states like `stats`, `timelineData`, and `tierEntries` for easier rendering.
 * - It uses `recharts` for the `Submissions Over Time` bar chart, including `ResponsiveContainer`, `BarChart`, `XAxis`, `YAxis`, `Tooltip`, `Bar`, and `Cell`.
 * - Custom tooltips are implemented for the bar chart to show full speaker names and dates.
 * - Tier distribution is rendered using progress bars, dynamically calculating percentages.
 * - All sections are conditionally rendered based on whether there is data available (`timelineData.length > 0` and `tierEntries.length > 0`).
 * - It leverages utility constants like `BRAND` for consistent styling (e.g., bar colors).
 */
export function SemesterGlance({ data }: Props) {
  // Derive the stat cards directly from the totals so the display mirrors the provided aggregate numbers.
  const stats = [
    { label: 'Sessions', value: String(data.totalSessions) },
    { label: 'Submissions', value: String(data.totalSubmissions) },
    { label: 'Students', value: String(data.totalStudents) },
    { label: 'Avg / Session', value: data.avgSubmissionsPerSession.toFixed(1) },
  ]

  // Build the bar chart data with shortened speaker names and formatted dates for readability.
  const timelineData = data.sessionsOverTime.map((s) => ({
    name: s.speakerName.length > 12 ? s.speakerName.slice(0, 12) + '...' : s.speakerName,
    fullName: s.speakerName,
    submissions: s.submissionCount,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  // Sort the tier distribution buckets for a stable order and capture the total for percentage bars.
  const tierEntries = Object.entries(data.tierDistribution).sort(([a], [b]) => a.localeCompare(b))
  const tierTotal = tierEntries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <section id="semester-at-a-glance" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Semester at a Glance
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-center"
          >
            <div className="text-xl font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Submissions over time bar chart */}
      {timelineData.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Submissions Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(_: unknown, payload: ReadonlyArray<{ payload?: { fullName?: string; date?: string } }>) => {
                    const item = payload?.[0]?.payload
                    return item ? `${item.fullName} (${item.date})` : ''
                  }}
                />
                <Bar dataKey="submissions" radius={[4, 4, 0, 0]}>
                  {timelineData.map((_, index) => (
                    <Cell key={index} fill={BRAND.ORANGE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tier distribution */}
      {tierEntries.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tier Distribution</h3>
          <div className="space-y-3">
            {tierEntries.map(([tier, count]) => {
              const pct = tierTotal > 0 ? Math.round((count / tierTotal) * 100) : 0
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[var(--text-primary)] font-medium">{tier}</span>
                    <span className="text-[var(--text-muted)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: BRAND.PURPLE }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
