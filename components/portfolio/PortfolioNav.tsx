'use client'

/**
 * PortfolioNav — Sticky top navigation bar for a public teaching portfolio.
 *
 * Renders the portfolio title ("Teaching Portfolio") and a dynamic set of nav
 * links.  Links are generated only for the sections the professor has enabled
 * in `PortfolioSections`; sections that are disabled are omitted entirely so
 * the nav never exposes links to hidden content.
 *
 * Active-link detection uses exact-match for the root overview page and
 * `startsWith` for all sub-sections.
 *
 * Reads: PortfolioContext (data.token + data.sections)
 * Rendered by: app/(public)/portfolio/[token]/layout.tsx
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePortfolio } from './PortfolioContext'

/**
 * Renders a sticky navigation bar for a specific teaching portfolio.
 * 1.  **What it does**: Displays the main title of the portfolio and a set of dynamic navigation links (e.g., Overview, Sessions, Analytics, Roster, Reports). It highlights the currently active link based on the current URL path.
 * 2.  **Why it is used**: Provides top-level navigation within a portfolio's detailed view, enabling users to easily navigate between different sections (e.g., sessions, analytics, reports) of that particular portfolio. It ensures a consistent and intuitive navigation experience across the portfolio's sub-pages.
 * 3.  **Important implementation details**:
 *     *   It is a client component (`'use client'`).
 *     *   It utilizes `next/link` for client-side navigation without full page reloads.
 *     *   `usePathname` from `next/navigation` is used to determine the active state of navigation links, allowing for dynamic styling.
 *     *   It depends on `usePortfolio` from `PortfolioContext` to fetch the current portfolio's data (e.g., `token`, `sections`). If `data` is not available, the component renders `null`.
 *     *   The `basePath` for all portfolio-specific links is constructed using the `data.token`.
 *     *   Navigation links are dynamically generated based on the availability of sections within `data.sections` (e.g., if `data.sections.sessions` is true, the 'Sessions' link is displayed).
 *     *   The `isActive` logic differentiates between exact path matching (for 'Overview' on the base path) and `startsWith` matching for sub-sections.
 *     *   The header is styled with `sticky` positioning and CSS variables (`--border-accent`, `--surface`, `--text-primary`, `--text-secondary`, `--font-playfair`, `--font-dm-sans`) for theming and consistent branding.
 */
// Renders the sticky nav that keeps the shared portfolio portal sections (overview, sessions, analytics, roster, reports) accessible.
export function PortfolioNav() {
  const pathname = usePathname()
  const { data } = usePortfolio()

  if (!data) return null

  const basePath = `/portfolio/${data.token}`

  const links = [
    { label: 'Overview', href: basePath, exact: true },
    ...(data.sections.sessions ? [{ label: 'Sessions', href: `${basePath}/sessions`, exact: false }] : []),
    ...(data.sections.analytics ? [{ label: 'Analytics', href: `${basePath}/analytics`, exact: false }] : []),
    ...(data.sections.roster ? [{ label: 'Roster', href: `${basePath}/roster`, exact: false }] : []),
    ...(data.sections.reports ? [{ label: 'Reports', href: `${basePath}/reports`, exact: false }] : []),
  ]

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface)' }}>
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href={basePath} className="font-[family-name:var(--font-playfair)] font-bold text-lg">
          <span className="text-[var(--text-primary)]">Teaching </span>
          <span className="text-[#f36f21]">Portfolio</span>
        </Link>

        <nav className="flex items-center gap-6">
          {links.map(({ label, href, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href) && href !== basePath
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors duration-200 font-[family-name:var(--font-dm-sans)] ${
                  isActive
                    ? 'text-[#f36f21]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
