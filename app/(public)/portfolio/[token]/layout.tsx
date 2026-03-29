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
