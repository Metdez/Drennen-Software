'use client'

/**
 * RosterTable — Clickable student roster with participation badges and follow-up flags.
 *
 * Splits students into two sections: "flagged for follow-up" (top, highlighted) and
 * the main roster. Participation rate drives the Badge variant via participationVariant().
 * Row click navigates to app/(app)/roster/[studentName].
 *
 * Rendered by: app/(app)/roster/page.tsx,
 *              app/(public)/portfolio/[token]/roster/page.tsx
 * Calls: None (data passed as props: students, totalSessions)
 */

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatStudentName } from '@/lib/utils/format'
import type { StudentSummary } from '@/types'

/**
 * Determines the visual variant for a participation badge based on the student's session count.
 *
 * What it does: Calculates a participation rate and returns a string ('success', 'orange', or 'default') that corresponds to a `Badge` component's variant prop.
 *
 * Why it is used: To visually categorize student participation levels at a glance within the RosterTable, making it easy to identify students who are participating well, moderately, or poorly.
 *
 * Important implementation details: If `total` sessions are zero, it defaults to 'default'. A rate of 0.8 or higher is 'success', 0.5 or higher is 'orange', otherwise it's 'default'.
 */
function participationVariant(count: number, total: number): 'success' | 'orange' | 'default' {
  if (total === 0) return 'default'
  const rate = count / total
  if (rate >= 0.8) return 'success'
  if (rate >= 0.5) return 'orange'
  return 'default'
}

/**
 * A presentational component that displays a student's growth signal within a styled pill.
 *
 * What it does: Renders a `<span>` element with specific background, text, and border styles based on the provided `signal` string. It acts as a visual indicator for different growth statuses.
 *
 * Why it is used: To provide a clear, color-coded visual representation of a student's academic growth trend (e.g., Accelerating, Plateauing) in a compact format within the roster table.
 *
 * Important implementation details: It uses a `variants` object to map signal strings to corresponding Tailwind CSS classes. If a signal is not explicitly defined, it defaults to the 'New' variant's styling. The font is explicitly set to `var(--font-dm-sans)`.
 */
function GrowthSignalPill({ signal }: { signal: string }) {
  const variants: Record<string, string> = {
    Accelerating: 'bg-[#0f6b37]/20 text-[#4ae168] border-[#0f6b37]/40',
    Deepening: 'bg-[#0f6b37]/20 text-[#4ae168] border-[#0f6b37]/40',
    Emerging: 'bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40',
    Consistent: 'bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40',
    Plateauing: 'bg-[#f36f21]/20 text-[#f36f21] border-[#f36f21]/40',
    New: 'bg-[#555]/20 text-[#999] border-[#555]/40',
  }
  const classes = variants[signal] ?? variants.New
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[10px] rounded-full border font-medium font-[family-name:var(--font-dm-sans)] ${classes}`}>
      {signal}
    </span>
  )
}

/**
 * A React component that renders a single row in the student roster table.
 *
 * What it does: Displays detailed information for an individual student, including their name, session counts, growth signal, and participation rate. It also provides navigation to the student's individual page when clicked.
 *
 * Why it is used: To encapsulate the rendering logic and interactive behavior for each student entry in the `RosterTable`, improving modularity and reusability.
 *
 * Important implementation details: It utilizes `next/navigation`'s `useRouter` hook to navigate to a dynamic student detail page. Student names are formatted using `formatStudentName`. It conditionally displays a 'flagged for follow-up' icon and uses `GrowthSignalPill` and `Badge` components for visual elements. The row itself is clickable.
 */
function StudentRow({ student }: { student: StudentSummary }) {
  const router = useRouter()

  return (
    <tr
      onClick={() => router.push(`/roster/${encodeURIComponent(student.studentName)}`)}
      className="border-t border-[var(--border)] cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
    >
      <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
        <span className="flex items-center gap-2">
          {formatStudentName(student.studentName)}
          {student.flaggedForFollowup && (
            <span className="text-[#f36f21] text-xs" title="Flagged for follow-up">&#x2691;</span>
          )}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
        {student.sessionCount} of {student.totalSessions}
      </td>
      <td className="px-5 py-4">
        {student.growthSignal ? (
          <GrowthSignalPill signal={student.growthSignal} />
        ) : (
          <span className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">&mdash;</span>
        )}
      </td>
      <td className="px-5 py-4">
        <Badge variant={participationVariant(student.sessionCount, student.totalSessions)}>
          {student.totalSessions > 0
            ? `${Math.round((student.sessionCount / student.totalSessions) * 100)}%`
            : '—'}
        </Badge>
      </td>
      <td className="px-5 py-4 text-right">
        <span className="text-[#f36f21] text-sm">&rarr;</span>
      </td>
    </tr>
  )
}

/**
 * The main component responsible for displaying a comprehensive table of students, categorized by follow-up flags.
 *
 * What it does: Fetches and renders a list of `StudentSummary` objects. It organizes students into two sections: 'Flagged for Follow-up' and the main roster. It also handles the display for an empty roster state.
 *
 * Why it is used: To provide a central dashboard view of all students, allowing educators to quickly review student status, participation, and growth signals, with special attention to students needing follow-up.
 *
 * Important implementation details: It conditionally renders a 'Flagged for Follow-up' section if there are any flagged students. Each student row is rendered using the `StudentRow` component. The row navigation pushes to the student detail view so the same `studentName` feeds the profile, growth/notes, and reflections submissions tabs downstream, keeping those pieces aligned with the boarding roster. The table uses custom styling for borders, backgrounds, and text, leveraging CSS variables for theme consistency. If `students.length` is 0, it displays a message indicating no student data.
 */
export function RosterTable({ students }: { students: StudentSummary[] }) {
  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="py-16 text-center text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          No student data yet. Submit a ZIP to start tracking submissions.
        </div>
      </div>
    )
  }

  const flaggedStudents = students.filter((s) => s.flaggedForFollowup)
  const hasFlags = flaggedStudents.length > 0

  return (
    <div className="space-y-4">
      {/* Flagged for Follow-up section */}
      {hasFlags && (
        <div className="rounded-2xl border border-[#f36f21]/30 overflow-hidden bg-[#f36f21]/5">
          <div className="px-5 py-3 border-b border-[#f36f21]/20">
            <h3 className="text-xs font-semibold text-[#f36f21] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Flagged for Follow-up ({flaggedStudents.length})
            </h3>
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {flaggedStudents.map((student) => (
                <StudentRow key={`flagged-${student.studentName}`} student={student} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Main roster table */}
      <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
        <table className="w-full border-collapse">
          <thead style={{ background: 'var(--surface-elevated)' }}>
            <tr>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Student</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Sessions submitted</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Growth</th>
              <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Participation</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <StudentRow key={student.studentName} student={student} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
