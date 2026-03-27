'use client'

import { useRouter } from 'next/navigation'
import type { SessionSummary } from '@/types'

interface SessionsTableProps {
  sessions: SessionSummary[]
  compareMode?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

export function SessionsTable({
  sessions,
  compareMode = false,
  selectedIds = [],
  onSelectionChange,
}: SessionsTableProps) {
  const router = useRouter()

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="py-16 text-center text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          No sessions yet.
        </div>
      </div>
    )
  }

  function handleRowClick(sessionId: string) {
    if (!compareMode) {
      router.push(`/preview?sessionId=${sessionId}`)
      return
    }
    if (!onSelectionChange) return

    const isSelected = selectedIds.includes(sessionId)
    if (isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== sessionId))
    } else if (selectedIds.length < 2) {
      onSelectionChange([...selectedIds, sessionId])
    } else {
      // FIFO: drop the oldest, add the new one
      onSelectionChange([selectedIds[1], sessionId])
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <table className="w-full border-collapse">
        <thead style={{ background: 'var(--surface-elevated)' }}>
          <tr>
            {compareMode && (
              <th className="px-3 py-3 w-10" />
            )}
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Speaker</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Date</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Files</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Debrief</th>
            {!compareMode && <th className="px-5 py-3" />}
          </tr>
        </thead>
        <tbody>
          {sessions.map(session => {
            const isSelected = selectedIds.includes(session.id)
            return (
              <tr
                key={session.id}
                onClick={() => handleRowClick(session.id)}
                className={`border-t border-[var(--border)] cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-elevated)] ${
                  compareMode && isSelected
                    ? 'border-l-2 border-l-[#f36f21] bg-[var(--surface-elevated)]'
                    : ''
                }`}
              >
                {compareMode && (
                  <td className="px-3 py-4 text-center">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-[#f36f21] bg-[#f36f21]'
                          : 'border-[var(--border-accent)]'
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-5 py-4 text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  {session.speakerName}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                  {new Date(session.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                  {session.fileCount} files
                </td>
                <td className="px-5 py-4 text-sm font-[family-name:var(--font-dm-sans)]">
                  {session.debriefStatus === 'complete' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(15,107,55,0.12)', color: '#5e9e6e' }}>
                      {session.debriefRating != null ? `★ ${session.debriefRating}/5` : 'Debriefed'}
                    </span>
                  )}
                  {session.debriefStatus === 'draft' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: 'rgba(243,111,33,0.10)', color: '#f36f21' }}>
                      Draft
                    </span>
                  )}
                </td>
                {!compareMode && (
                  <td className="px-5 py-4 text-right">
                    <span className="text-[#f36f21] text-sm">→</span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
