'use client'

import Link from 'next/link'
import { usePortfolio } from '@/components/portfolio/PortfolioContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

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
