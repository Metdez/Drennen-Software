'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'
import type { StudentSummary } from '@/types'

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
