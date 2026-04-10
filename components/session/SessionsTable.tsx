'use client'

/**
 * @file SessionsTable.tsx
 * Sortable table of session summaries used on the History and Compare pages.
 *
 * Rendered by:
 *   - app/(app)/history/page.tsx (normal mode — row click navigates to /preview)
 *   - app/(app)/compare/page.tsx (compareMode — row click selects up to 2 sessions)
 *
 * In normal mode each row is a link to `/preview?sessionId=<id>`.
 * In compareMode rows become selectable checkboxes; a FIFO strategy caps
 * selection at 2 — selecting a third item drops the oldest selection.
 */

/**
 * Modes of operation:
 * - Normal: clicking a row routes to `/preview?sessionId=...` via `router.push`.
 * - Compare: rows act like checkboxes and maintain a FIFO queue capped at 2 selections.
 */
import { useRouter } from 'next/navigation'
import type { SessionSummary } from '@/types'

interface SessionsTableProps {
  /** List of session summaries to display; an empty array renders an empty-state message. */
  sessions: SessionSummary[]
  /**
   * When `true` the table switches to multi-select mode for session comparison.
   * Row clicks toggle selection instead of navigating.
   */
  compareMode?: boolean
  /** Currently selected session IDs (max 2) when `compareMode` is active. */
  selectedIds?: string[]
  /** Called with the new selection array whenever the user toggles a row in compareMode. */
  onSelectionChange?: (ids: string[]) => void
}

/**
 * Renders a bordered table of past sessions with speaker name, date, file count,
 * and debrief status columns.
 *
 * Debrief status badge variants:
 * - `complete` — green pill with star rating (e.g. "★ 4/5")
 * - `draft`    — orange pill labeled "Draft"
 * - absent    — no badge rendered
 */
export function SessionsTable({
  sessions,
  compareMode = false,
  selectedIds = [],
  onSelectionChange,
}: SessionsTableProps) {
  const router = useRouter()

  // Empty-state guard: show a gentle message when no sessions exist yet.
  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
        <div className="py-16 text-center text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          No sessions yet.
        </div>
      </div>
    )
  }

  /**
   * Handles a row click in both normal and compare modes.
   *
   * Normal mode: navigates to the preview page for the clicked session.
   * Compare mode: toggles the session in/out of `selectedIds`.
   *   - If deselecting: removes the session from the array.
   *   - If selecting with < 2 already selected: appends.
   *   - If selecting with 2 already selected: FIFO replacement — drops the
   *     oldest (index 0) and appends the new session at the end.
   */
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
      // FIFO: the selection cap is 2; drop the first (oldest) entry to make room.
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
            // Selection array preserves order so FIFO can drop the oldest when needed.
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
