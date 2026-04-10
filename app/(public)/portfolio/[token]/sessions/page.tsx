/**
 * Public portfolio sessions list page (`/portfolio/[token]/sessions`).
 *
 * Route group: `(public)` — no auth required.
 * Only reachable when the professor has enabled the `sessions` section in
 * the portfolio config (enforced at the nav level by `PortfolioNav`).
 *
 * Reads the full session list from `PortfolioContext` (pre-fetched by the
 * portfolio layout via `GET /api/portfolio/[token]`). Each session links to
 * its detail page at `/portfolio/[token]/sessions/[sessionId]`.
 *
 * Components: inline render (no extracted components)
 */
'use client'

import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

/**
 * 1. Formats an ISO date string into a localized, human-readable format.
 * 2. It is used to present dates to the user in a consistent and easy-to-understand format (e.g., "Jan 1, 2023") rather than a raw ISO string.
 * 3. It uses `Date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` to achieve the desired output, specifically showing a three-letter month, day, and four-digit year.
 */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * 1. Renders the page for displaying all sessions associated with a specific portfolio.
 * 2. This page serves as an entry point for users to view a list of sessions within a portfolio and navigate to individual session details. It provides an overview of the portfolio's sessions.
 * 3. This is a client-side component (`'use client'`). It utilizes the `usePortfolio` hook from `PortfolioContext` to fetch and access portfolio-specific data. It handles loading and error states by rendering appropriate messages. The component displays a header, a summary of session and semester counts, and then iterates through the `data.sessions` array to render a clickable `Link` for each session. Each link navigates to the detailed view of that session (`/portfolio/[token]/sessions/[sessionId]`). Styling is applied using Tailwind CSS classes and CSS variables, and includes fade-up animations for UI elements.
 */
export default function PortfolioSessionsPage() {
  const { data, loading, error } = usePortfolio()

  if (loading) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }

  if (error || !data) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Portfolio not available.</p>
  }

  const basePath = `/portfolio/${data.token}`

  return (
    <div className="flex flex-col gap-6">
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          Sessions
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
          {data.sessions.length} session{data.sessions.length !== 1 ? 's' : ''} across {data.semesters.length} semester{data.semesters.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex flex-col gap-3 animate-fade-up-delay-1">
        {data.sessions.map((session) => (
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
      </div>
    </div>
  )
}
