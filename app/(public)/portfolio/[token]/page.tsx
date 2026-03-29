'use client'

import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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
