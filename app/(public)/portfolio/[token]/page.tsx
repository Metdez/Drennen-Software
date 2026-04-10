/**
 * Public portfolio landing page (`/portfolio/[token]`).
 *
 * No-auth page. The `PortfolioContext` (provided by the portfolio layout) fetches
 * portfolio config and sessions for the given token.
 *
 * Displays:
 * - Aggregate stats: session count, student count, submission count, semester count
 * - Quick-links to enabled sections (sessions, analytics, roster, reports), controlled
 *   by the professor's `PortfolioConfig.sections` flags
 * - A recent sessions list (up to 10), each linking to `/portfolio/[token]/sessions/[id]`
 *
 * Data: via `usePortfolio()` hook (reads from `PortfolioContext`, which fetches
 * `GET /api/portfolio/[token]`).
 */
'use client'

import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

/**
 * Formats an ISO date string into a user-friendly locale-specific date format. This function ensures consistency in how dates are displayed throughout the portfolio, making them easily readable for the end-user.
 *
 * It takes an ISO 8601 formatted date string as input, converts it to a `Date` object, and then formats it using `toLocaleDateString` for 'en-US' locale, displaying a short month name, day, and full year (e.g., 'Jan 1, 2023').
 */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * The main page component for displaying a specific teaching portfolio based on a unique token. This component serves as the entry point for users to view a portfolio, providing an overview of key statistics, quick navigation to sub-sections, and a list of recent activities.
 *
 * It is a client-side component that leverages the `usePortfolio` hook to fetch portfolio data. It gracefully handles loading states by displaying a spinner and error states by showing a 'Portfolio Not Available' message. Once data is loaded, it renders the portfolio's date range, a grid of essential metrics (sessions, students, submissions, semesters), dynamic quick links to other portfolio sections (like Analytics, Roster, Reports) based on data availability, and a preview of the 10 most recent sessions. The component uses `next/link` for efficient client-side navigation and applies extensive Tailwind CSS for styling and responsiveness, including custom font and color variables for a themed appearance.
 */
export default function PortfolioLandingPage() {
  const { data, loading, error } = usePortfolio()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
          Loading portfolio...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <h1 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
          Portfolio Not Available
        </h1>
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
          This portfolio link may have been revoked or disabled.
        </p>
      </div>
    )
  }

  const basePath = `/portfolio/${data.token}`

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          Teaching Portfolio
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        {data.dateRange && (
          <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
            {formatDate(data.dateRange.earliest)} — {formatDate(data.dateRange.latest)}
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up-delay-1">
        {[
          { label: 'Sessions', value: data.sessions.length },
          { label: 'Students', value: data.totalStudents },
          { label: 'Submissions', value: data.totalSubmissions },
          { label: 'Semesters', value: data.semesters.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
          >
            <p className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
              {label}
            </p>
            <p className="text-3xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)] mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 animate-fade-up-delay-2">
        {data.sections.sessions && (
          <Link
            href={`${basePath}/sessions`}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors font-[family-name:var(--font-dm-sans)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}
          >
            View All Sessions →
          </Link>
        )}
        {data.sections.analytics && (
          <Link
            href={`${basePath}/analytics`}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors font-[family-name:var(--font-dm-sans)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}
          >
            Analytics →
          </Link>
        )}
        {data.sections.roster && (
          <Link
            href={`${basePath}/roster`}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors font-[family-name:var(--font-dm-sans)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}
          >
            Student Roster →
          </Link>
        )}
        {data.sections.reports && (
          <Link
            href={`${basePath}/reports`}
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors font-[family-name:var(--font-dm-sans)]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)', color: 'var(--text-secondary)' }}
          >
            Reports →
          </Link>
        )}
      </div>

      {/* Recent sessions */}
      {data.sessions.length > 0 && (
        <div className="animate-fade-up-delay-3">
          <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)] mb-4">
            Sessions
          </h2>
          <div className="flex flex-col gap-3">
            {data.sessions.slice(0, 10).map((session) => (
              <Link
                key={session.id}
                href={`${basePath}/sessions/${session.id}`}
                className="rounded-xl p-5 transition-all duration-200 hover:border-[#f36f21]"
                style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-[family-name:var(--font-playfair)] font-bold text-[var(--text-primary)]">
                      {session.speakerName}
                    </h3>
                    <p className="text-xs font-[family-name:var(--font-dm-sans)] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(session.createdAt)} · {session.fileCount} submission{session.fileCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>→</span>
                </div>
              </Link>
            ))}
            {data.sessions.length > 10 && (
              <Link
                href={`${basePath}/sessions`}
                className="text-sm text-[#f36f21] hover:underline font-[family-name:var(--font-dm-sans)]"
              >
                View all {data.sessions.length} sessions →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
