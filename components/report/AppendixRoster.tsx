'use client'

import type { AppendixRosterSection } from '@/types'
import { BRAND } from '@/lib/constants'

interface Props {
  data: AppendixRosterSection
}

export function AppendixRoster({ data }: Props) {
  const sessionLookup = new Set<string>()
  // Build a quick lookup for each student
  const studentSessionSets = new Map<string, Set<string>>()
  for (const student of data.students) {
    const set = new Set(student.sessionsAttended)
    studentSessionSets.set(student.studentName, set)
    for (const sid of student.sessionsAttended) {
      sessionLookup.add(sid)
    }
  }

  return (
    <section id="appendix-roster" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Appendix: Full Roster
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium sticky left-0 bg-[var(--surface)]">
                Student
              </th>
              <th className="text-center py-2 px-3 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                Rate
              </th>
              {data.sessionOrder.map((s) => (
                <th
                  key={s.sessionId}
                  className="text-center py-2 px-2 text-xs text-[var(--text-muted)] font-medium whitespace-nowrap"
                  title={`${s.speakerName} - ${new Date(s.date).toLocaleDateString()}`}
                >
                  <div className="truncate max-w-[60px]">
                    {s.speakerName.split(' ')[0]}
                  </div>
                  <div className="text-[10px] opacity-60">
                    {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((student) => {
              const attended = studentSessionSets.get(student.studentName) ?? new Set()
              const rateColor =
                student.participationRate >= 0.8
                  ? BRAND.GREEN
                  : student.participationRate >= 0.5
                    ? BRAND.ORANGE
                    : '#ef4444'

              return (
                <tr key={student.studentName} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-4 text-[var(--text-primary)] font-medium whitespace-nowrap sticky left-0 bg-[var(--surface)]">
                    {student.studentName}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="font-semibold text-xs" style={{ color: rateColor }}>
                      {Math.round(student.participationRate * 100)}%
                    </span>
                  </td>
                  {data.sessionOrder.map((s) => (
                    <td key={s.sessionId} className="py-2 px-2 text-center">
                      {attended.has(s.sessionId) ? (
                        <span className="text-[var(--brand-green)]">&#10003;</span>
                      ) : (
                        <span className="text-[var(--text-muted)] opacity-30">&mdash;</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
