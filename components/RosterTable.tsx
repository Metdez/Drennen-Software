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

export function RosterTable({ students }: { students: StudentSummary[] }) {
  const router = useRouter()

  if (students.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="py-16 text-center text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          No student data yet. Submit a ZIP to start tracking submissions.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <table className="w-full border-collapse">
        <thead style={{ background: 'var(--surface-elevated)' }}>
          <tr>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Student</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Sessions submitted</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Participation</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.studentName}
              onClick={() => router.push(`/roster/${encodeURIComponent(student.studentName)}`)}
              className="border-t border-[var(--border)] cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
            >
              <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                {formatStudentName(student.studentName)}
              </td>
              <td className="px-5 py-4 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                {student.sessionCount} of {student.totalSessions}
              </td>
              <td className="px-5 py-4">
                <Badge variant={participationVariant(student.sessionCount, student.totalSessions)}>
                  {student.totalSessions > 0
                    ? `${Math.round((student.sessionCount / student.totalSessions) * 100)}%`
                    : '—'}
                </Badge>
              </td>
              <td className="px-5 py-4 text-right">
                <span className="text-[#f36f21] text-sm">→</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
