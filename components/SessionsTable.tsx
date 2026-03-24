'use client'

import { useRouter } from 'next/navigation'
import type { SessionSummary } from '@/types'

export function SessionsTable({ sessions }: { sessions: SessionSummary[] }) {
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

  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <table className="w-full border-collapse">
        <thead style={{ background: 'var(--surface-elevated)' }}>
          <tr>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Speaker</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Date</th>
            <th className="px-5 py-3 text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">Files</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {sessions.map(session => (
            <tr
              key={session.id}
              onClick={() => router.push(`/preview?sessionId=${session.id}`)}
              className="border-t border-[var(--border)] cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-elevated)]"
            >
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
              <td className="px-5 py-4 text-right">
                <span className="text-[#f36f21] text-sm">→</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
