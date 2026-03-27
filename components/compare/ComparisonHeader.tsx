'use client'

import type { SessionSummary } from '@/types'

interface ComparisonHeaderProps {
  sessionA: SessionSummary
  sessionB: SessionSummary
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function ComparisonHeader({ sessionA, sessionB }: ComparisonHeaderProps) {
  return (
    <div className="flex items-center gap-4 font-[family-name:var(--font-dm-sans)]">
      {/* Session A */}
      <div className="flex-1 text-right">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
          {sessionA.speakerName}
        </h2>
        <div className="flex items-center justify-end gap-2 mt-1">
          <span className="text-sm text-[var(--text-secondary)]">{formatDate(sessionA.createdAt)}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(243,111,33,0.10)] text-[#f36f21]">
            {sessionA.fileCount} files
          </span>
        </div>
      </div>

      {/* VS divider */}
      <div className="flex flex-col items-center gap-1 px-4">
        <div className="h-8 w-px bg-[#f36f21] opacity-30" />
        <span className="text-xs font-bold text-[#f36f21] tracking-wider">VS</span>
        <div className="h-8 w-px bg-[#f36f21] opacity-30" />
      </div>

      {/* Session B */}
      <div className="flex-1">
        <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
          {sessionB.speakerName}
        </h2>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-[var(--text-secondary)]">{formatDate(sessionB.createdAt)}</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(84,39,133,0.10)] text-[#542785]">
            {sessionB.fileCount} files
          </span>
        </div>
      </div>
    </div>
  )
}
