/**
 * StudentEngagement — Student participation stats, top contributors, and drop-off list.
 *
 * Three participation tiers (high ≥ 80%, medium 50–80%, low < 50%) are shown as
 * stat cards with BRAND.GREEN/ORANGE/red colours. Top contributors are ranked by
 * rate with the same colour-coding. Drop-off students show the last session they
 * participated in.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (student engagement section)
 * Data source: StudentEngagementSection from SemesterReport type
 */
'use client'

import type { StudentEngagementSection } from '@/types'
import { BRAND } from '@/lib/constants'

/**
 * Props for StudentEngagement.
 * @prop data - Student engagement section with participationTiers, topContributors, dropoff.
 */
/**
 * What it does: Defines the shape of the props object for the StudentEngagement component.
 * Why it is used: To enforce type safety and provide clear documentation for the data expected by the StudentEngagement component.
 * Important implementation details: It includes a single property, `data`, which must conform to the `StudentEngagementSection` type, containing information about participation tiers, top contributors, and student drop-off.
 */
interface Props {
  data: StudentEngagementSection
}

/**
 * What it does: Renders a comprehensive section displaying various student engagement metrics within a report, including participation breakdown by tiers, a list of top contributing students, and students who have dropped off.
 * Why it is used: To provide a clear, organized, and interactive overview of how students are engaging with the content or sessions, helping educators or administrators identify trends and individual student performance.
 * Important implementation details:
 * - It's a client-side React component (`'use client'` directive).
 * - It consumes `StudentEngagementSection` data, which includes `participationTiers`, `topContributors`, and `dropoff` information.
 * - Participation tiers are categorized into High, Medium, and Low, each assigned a specific brand color for visual distinction.
 * - Top contributors are displayed in a table, showing student name, session count, and a calculated contribution rate, with rate percentages color-coded based on performance thresholds (e.g., green for high, orange for medium, red for low).
 * - Students who dropped off are listed with their last seen speaker and a formatted date.
 * - Sections for "Top Contributors" and "Students Who Dropped Off" are conditionally rendered only if there is data available, preventing empty sections from appearing.
 * - Styling is primarily handled via Tailwind CSS classes and custom CSS variables for theme consistency.
 */
export function StudentEngagement({ data }: Props) {
  const tierStats = [
    { label: 'High (80%+)', value: data.participationTiers.high, color: BRAND.GREEN },
    { label: 'Medium (50-80%)', value: data.participationTiers.medium, color: BRAND.ORANGE },
    { label: 'Low (<50%)', value: data.participationTiers.low, color: '#ef4444' },
  ]

  return (
    <section id="student-engagement" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Student Engagement
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Participation tier stats */}
      <div className="grid grid-cols-3 gap-3">
        {tierStats.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-center"
          >
            <div className="text-2xl font-bold" style={{ color: t.color }}>
              {t.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Top contributors */}
      {data.topContributors.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Top Contributors</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Student
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Sessions
                  </th>
                  <th className="text-right py-2 pl-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.topContributors.map((c) => (
                  <tr key={c.studentName} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{c.studentName}</td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-secondary)]">
                      {c.sessionCount} / {c.totalSessions}
                    </td>
                    <td className="py-2.5 pl-4 text-right">
                      <span
                        className="font-semibold"
                        style={{ color: c.rate >= 0.8 ? BRAND.GREEN : c.rate >= 0.5 ? BRAND.ORANGE : '#ef4444' }}
                      >
                        {Math.round(c.rate * 100)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dropoff list */}
      {data.dropoff.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Students Who Dropped Off</h3>
          <div className="space-y-2">
            {data.dropoff.map((d) => (
              <div
                key={d.studentName}
                className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
              >
                <span className="text-sm text-[var(--text-primary)] font-medium">{d.studentName}</span>
                <span className="text-xs text-[var(--text-muted)]">
                  Last seen: {d.lastSeenSpeaker} ({new Date(d.lastSeenDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
