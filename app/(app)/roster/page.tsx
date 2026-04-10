/**
 * Student roster page (`/roster`).
 *
 * Lists all students who have submitted across the professor's sessions,
 * filtered to the active semester when one is selected.
 *
 * Data: fetched from `GET /api/roster` (or `GET /api/roster?semester=...`).
 * Each row shows student name, submission count, and participation rate.
 * Clicking a row navigates to `/roster/[studentName]`.
 *
 * Includes a `ClearDataButton` (admin utility) in the header.
 * Components: RosterTable, ClearDataButton, RosterLoadingSkeleton (inline)
 */
'use client'

import { useEffect, useState } from 'react'
import { RosterTable } from '@/components/student/RosterTable'
import { ClearDataButton } from '@/components/layout/ClearDataButton'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import type { StudentSummary } from '@/types'

/**
 * This client-side component renders the main student roster page.
 * It is used to display a list of all students who have submitted across various sessions, allowing educators to view and navigate to individual student submissions.
 *
 * Important implementation details:
 * - It uses the `'use client'` directive, indicating it's a client-side rendered component.
 * - Manages state for `students`, `loading`, and `error` using React's `useState` hook.
 * - Fetches student data from `/api/roster` via a `useEffect` hook, triggered by changes in `activeSemesterId` or `semesterLoading`.
 * - The API request includes a `semester` query parameter if an `activeSemesterId` is present, allowing filtering by semester.
 * - Implements a cleanup function in `useEffect` to prevent state updates on unmounted components after asynchronous operations.
 * - Integrates `useSemesterContext` to access the currently active semester ID.
 * - Conditionally renders a `RosterLoadingSkeleton` during data fetching, an error message if the fetch fails, or the `RosterTable` with student data.
 * - Includes a `ClearDataButton` for data management actions.
 * - Provides a message when no students are found, explaining data recording scope.
 */
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

/**
 * This component renders a visual loading skeleton for the student roster table.
 * It is used to improve the user experience by providing immediate visual feedback that content is being loaded, preventing a blank page and indicating an active process while student data is being fetched.
 *
 * Important implementation details:
 * - It displays a series of `div` elements styled with Tailwind CSS to mimic the layout of the `RosterTable` rows.
 * - Uses the `animate-pulse` Tailwind class to create a shimmering loading animation.
 * - Applies conditional `border-t` styling to separate the skeleton rows, making them visually distinct like table rows.
 */
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
