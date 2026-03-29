'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

interface ReportSummary {
  id: string
  title: string
  createdAt: string
  config: {
    includedSections?: string[]
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PortfolioReportsPage() {
  const { data: portfolio } = usePortfolio()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!portfolio) return
    async function fetchReports() {
      try {
        const res = await fetch(`/api/portfolio/${portfolio!.token}/reports`)
        if (!res.ok) { setError(true); return }
        const data = await res.json()
        setReports(data.reports ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [portfolio])

  if (loading || !portfolio) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading reports...</p>
  }

  if (error || reports.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="animate-fade-up">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">Reports</h1>
          <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        </div>
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>No reports available.</p>
      </div>
    )
  }

  const basePath = `/portfolio/${portfolio.token}`

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">Reports</h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
          {reports.length} report{reports.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 animate-fade-up-delay-1">
        {reports.map((report) => (
          <Link
            key={report.id}
            href={`${basePath}/reports/${report.id}`}
            className="rounded-xl p-5 transition-all duration-200 hover:border-[#f36f21]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)]">
                  {report.title}
                </h3>
                <p className="text-xs font-[family-name:var(--font-dm-sans)] mt-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(report.createdAt)}
                  {report.config.includedSections && (
                    <> · {report.config.includedSections.length} section{report.config.includedSections.length !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
              <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
