/**
 * Portfolio layout (`app/(public)/portfolio/[token]/layout.tsx`).
 *
 * Route group: `(public)` — no auth required.
 * Access control: the `[token]` URL segment is the only gate. Invalid or
 * revoked tokens cause `PortfolioProvider` to surface an error state that
 * each child page renders gracefully.
 *
 * Wraps all portfolio sub-pages with:
 * - `PortfolioProvider` — fetches `GET /api/portfolio/[token]` once and
 *   provides the config, section visibility flags, and aggregated data to
 *   all child pages via `usePortfolio()`.
 * - `PortfolioNav` — horizontal nav bar showing only the sections that
 *   the professor has enabled in the portfolio config.
 *
 * The `token` param is extracted client-side via `useParams` because this
 * is a Client Component; it cannot use server-side params directly.
 */
'use client'

import { PortfolioProvider } from '@/components/portfolio/PortfolioContext'
import { PortfolioNav } from '@/components/portfolio/PortfolioNav'
import { useParams } from 'next/navigation'

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const token = params.token as string

  return (
    <PortfolioProvider token={token}>
      <PortfolioNav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {children}
      </main>
      <footer className="max-w-6xl mx-auto px-6 pb-10">
        <p className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
          Generated with MGMT 305 Class Intelligence Platform
        </p>
      </footer>
    </PortfolioProvider>
  )
}
