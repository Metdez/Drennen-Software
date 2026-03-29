'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePortfolio } from './PortfolioContext'

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
