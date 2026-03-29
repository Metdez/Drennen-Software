'use client'

import { useEffect, useState } from 'react'
import { RosterTable } from '@/components/student/RosterTable'
import { ClearDataButton } from '@/components/layout/ClearDataButton'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import type { StudentSummary } from '@/types'

export default function RosterPage() {
  const { activeSemesterId, loading: semesterLoading } = useSemesterContext()
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (semesterLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const url = activeSemesterId
      ? `/api/roster?semester=${encodeURIComponent(activeSemesterId)}`
      : '/api/roster'

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load students')
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setStudents(data.students ?? [])
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load students')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [activeSemesterId, semesterLoading])

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
              Student Roster
            </h1>
            <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              All students who have submitted across your sessions. Click a student to see their submissions.
            </p>
            {!loading && students.length === 0 && (
              <p className="mt-2 text-[var(--text-muted)] text-xs font-[family-name:var(--font-dm-sans)]">
                Student data is recorded for sessions uploaded going forward. Earlier sessions don&apos;t have individual submission records.
              </p>
            )}
          </div>
          <div className="pt-1 shrink-0">
            <ClearDataButton />
          </div>
        </div>
      </div>
      <div className="animate-fade-up-delay-1">
        {loading ? (
          <RosterLoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="py-16 text-center text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
              {error}
            </div>
          </div>
        ) : (
          <RosterTable students={students} />
        )}
      </div>
    </div>
  )
}

function RosterLoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="space-y-0">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
          >
            <div className="h-4 w-28 rounded bg-[var(--surface-elevated)] animate-pulse" />
            <div className="h-4 w-20 rounded bg-[var(--surface-elevated)] animate-pulse" />
            <div className="h-4 w-14 rounded bg-[var(--surface-elevated)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
