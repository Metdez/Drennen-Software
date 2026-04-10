/**
 * Public portfolio reports list page (`/portfolio/[token]/reports`).
 *
 * No-auth. Lists all semester reports exposed through the shared portfolio.
 * Each card shows the report title, creation date, and section count.
 * Clicking navigates to `/portfolio/[token]/reports/[reportId]`.
 *
 * Data: fetched from `GET /api/portfolio/[token]/reports`.
 * Only visible if the professor enabled `sections.reports` in their portfolio config.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

/**
 * What it does: Defines the structure for a summary of a financial report.
 * Why it is used: To type the data received from the API for individual reports, ensuring consistency and type safety when displaying report listings.
 * Important implementation details: Includes basic identifying information like `id`, `title`, `createdAt`, and a `config` object which can optionally contain an array of `includedSections` to indicate the report's content structure.
 */
interface ReportSummary {
  id: string
  title: string
  createdAt: string
  config: {
    includedSections?: string[]
  }
}

/**
 * What it does: Formats an ISO 8601 date string into a more human-readable, localized date format.
 * Why it is used: To present report creation dates to the user in a clear and consistent format (e.g., 'Jan 1, 2023') without displaying raw ISO strings.
 * Important implementation details: Uses `Date.toLocaleDateString` with the 'en-US' locale and specific options (`month: 'short'`, `day: 'numeric'`, `year: 'numeric'`) to control the output format.
 */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * What it does: This is the main page component responsible for displaying a list of reports associated with a specific user portfolio.
 * Why it is used: It serves as the entry point for users to view all available reports for a given portfolio, offering navigation to individual report detail pages.
 * Important implementation details:
 * - It's a client-side component, indicated by `'use client'`.
 * - Fetches portfolio data using the `usePortfolio` context to identify the current portfolio.
 * - Manages component state for `reports`, `loading`, and `error` using `useState` hooks.
 * - Uses `useEffect` to asynchronously fetch report summaries from the `/api/portfolio/[token]/reports` endpoint once the portfolio data is available.
 * - Displays conditional UI for loading states, error messages, and when no reports are found.
 * - Renders a list of `Link` components, each pointing to the detail page for a specific report (`/portfolio/[token]/reports/[reportId]`).
 * - Incorporates styling and simple animations for a better user experience.
 */
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
