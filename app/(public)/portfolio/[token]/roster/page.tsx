/**
 * Public portfolio roster page (`/portfolio/[token]/roster`).
 *
 * Route group: `(public)` — no auth required.
 * Only reachable when the professor has enabled the `roster` section in
 * the portfolio config (enforced at the nav level by `PortfolioNav`).
 *
 * Fetches `GET /api/portfolio/[token]/roster` on mount, which returns a
 * list of `StudentSummary` objects (name, session count, total sessions).
 * Participation rate is color-coded: green >= 80%, orange >= 50%, gray < 50%.
 * Each student links to `/portfolio/[token]/roster/[studentName]`.
 *
 * The token is read from `PortfolioContext` to construct the API URL,
 * rather than from route params directly.
 *
 * Components: inline render (no extracted components)
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'
import type { StudentSummary } from '@/types'

/**
 * This client-side page component displays a comprehensive roster of students associated with a specific portfolio. It dynamically fetches student summary data from a backend API based on the portfolio's token, managing loading and error states to provide a robust user experience.
 *
 * Why it is used:
 * It provides portfolio owners with a dedicated view to see all students linked to their portfolio, along with key statistics like session attendance. This page serves as an entry point for navigating to individual student detail pages, enhancing the overall portfolio management capabilities.
 *
 * Important implementation details:
 * - The component utilizes the `usePortfolio` hook from `@/components/portfolio/PortfolioContext` to access the current portfolio's data, specifically its `token` for API calls.
 * - A `useEffect` hook is employed to asynchronously fetch student data from the `/api/portfolio/[token]/roster` endpoint once the portfolio data is available.
 * - State variables (`students`, `loading`, `error`) are managed using `useState` to control the UI's display based on the data fetching lifecycle.
 * - It renders a loading indicator while data is being fetched and an error message if the API call fails.
 * - Each student is displayed as an interactive `Link` component, directing the user to a more detailed student page at `/portfolio/[token]/roster/[studentName]`.
 * - Session attendance rates are calculated and visually represented with color-coded styling (green for high rate, orange for medium, muted for low) to quickly convey student engagement.
 */
export default function PortfolioRosterPage() {
  const { data: portfolio } = usePortfolio()
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!portfolio) return
    async function fetchRoster() {
      try {
        const res = await fetch(`/api/portfolio/${portfolio!.token}/roster`)
        if (!res.ok) { setError(true); return }
        const data = await res.json()
        setStudents(data.students ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchRoster()
  }, [portfolio])

  if (loading || !portfolio) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading roster...</p>
  }

  if (error) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Roster not available.</p>
  }

  const basePath = `/portfolio/${portfolio.token}`

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          Student Roster
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
          {students.length} student{students.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div
        className="rounded-xl overflow-hidden animate-fade-up-delay-1"
        style={{ border: '1px solid var(--border-accent)' }}
      >
        {students.map((student, i) => {
          const rate = student.totalSessions > 0 ? student.sessionCount / student.totalSessions : 0
          const rateColor = rate >= 0.8 ? '#0f6b37' : rate >= 0.5 ? '#f36f21' : 'var(--text-muted)'
          const rateBg = rate >= 0.8 ? 'rgba(15,107,55,0.12)' : rate >= 0.5 ? 'rgba(243,111,33,0.12)' : 'var(--surface-hover)'

          return (
            <Link
              key={student.studentName}
              href={`${basePath}/roster/${encodeURIComponent(student.studentName)}`}
              className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[var(--surface-hover)]"
              style={{
                background: 'var(--surface)',
                borderBottom: i < students.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <span className="text-sm font-medium font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">
                {student.studentName}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                  {student.sessionCount}/{student.totalSessions} sessions
                </span>
                <span
                  className="text-xs font-semibold rounded-full px-2.5 py-0.5"
                  style={{ color: rateColor, background: rateBg }}
                >
                  {Math.round(rate * 100)}%
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
