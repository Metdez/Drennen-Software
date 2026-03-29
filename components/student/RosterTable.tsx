'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { formatStudentName } from '@/lib/utils/format'
import type { StudentSummary } from '@/types'

function participationVariant(count: number, total: number): 'success' | 'orange' | 'default' {
  if (total === 0) return 'default'
  const rate = count / total
  if (rate >= 0.8) return 'success'
  if (rate >= 0.5) return 'orange'
  return 'default'
}

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
