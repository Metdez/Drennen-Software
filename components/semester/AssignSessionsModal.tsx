/**
 * AssignSessionsModal — Modal for bulk-assigning unassigned sessions to a semester.
 *
 * Fetches all sessions without a semester_id, renders a checklist with a semester
 * selector dropdown, and POSTs the selection to /api/semesters/assign. Supports
 * "Select All" and "Assign All" shortcuts alongside individual toggles.
 *
 * Rendered by: app/(app)/semesters/page.tsx,
 *              components/semester/SemesterOnboardingBanner.tsx
 * Reads: SemesterContext (for the semester list and default active semester)
 * Calls: GET /api/sessions (to list unassigned sessions),
 *        POST /api/semesters/assign
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SessionSummary } from '@/types'

/**
 * Props for AssignSessionsModal.
 * @prop open       - Controls visibility.
 * @prop onClose    - Called when the modal is dismissed (backdrop click or cancel).
 * @prop onAssigned - Called after a successful assignment POST; parent should refresh data.
 */
/**
 * Defines the properties required by the AssignSessionsModal component.
 *
 * What it does: This interface specifies the contract for the props that must be passed to the AssignSessionsModal component to control its behavior and interaction with the parent.
 * Why it is used: It ensures type safety and clarity for the component's API, making it explicit what inputs the modal expects.
 * Important implementation details:
 * - `open`: A boolean value that controls the visibility of the modal.
 * - `onClose`: A callback function invoked when the modal is dismissed, either by user action (e.g., clicking backdrop or cancel button) or internal logic.
 * - `onAssigned`: A callback function that is invoked after a successful assignment operation. The parent component should use this to refresh any relevant data.
 */
interface AssignSessionsModalProps {
  open: boolean
  onClose: () => void
  onAssigned: () => void
}

/**
 * Renders a modal dialog that enables users to select multiple unassigned sessions and assign them to a chosen semester.
 *
 * What it does: This component provides a dedicated user interface for managing sessions that have been uploaded but are not yet associated with a specific academic semester. It allows users to browse unassigned sessions, select them, choose a target semester, and then perform the assignment.
 * Why it is used: It is crucial for organizing and structuring session data within the application, ensuring that all relevant sessions are categorized under their appropriate semesters for better management and access.
 * Important implementation details:
 * - **State Management**: Utilizes `useState` for managing several UI states including `sessions` (the list of unassigned sessions), `loading` (for data fetching status), `selected` (a Set of session IDs chosen by the user), `targetSemesterId` (the ID of the semester to assign sessions to), `assigning` (for the assignment POST request status), and `error` (to display user-facing error messages).
 * - **Data Fetching**: Employs `useCallback` to define `fetchUnassigned`, an asynchronous function responsible for fetching all currently unassigned sessions from `ROUTES.API_SESSIONS`.
 * - **Lifecycle Effects**: A `useEffect` hook triggers `fetchUnassigned` and resets selection/error states when the modal `open` prop becomes `true`. It also attempts to pre-select an 'active' semester or the first available semester as the default target.
 * - **User Interaction**: Provides functions `toggleSession` for individual session selection, `selectAll` to select all available sessions, and `handleAssign` to execute the API call for assigning the chosen sessions.
 * - **Context Integration**: Uses `useSemesterContext` to access a list of available semesters, which are displayed in a dropdown for the user to select as the assignment target.
 * - **API Interaction**: Communicates with `ROUTES.API_SEMESTERS_ASSIGN` via a `POST` request to perform the actual session assignment.
 * - **UI Feedback**: Displays loading indicators, an empty state message if no unassigned sessions are found, and error messages for failed operations or invalid selections.
 * - **Parent Communication**: Relies on the `onClose` prop to signal dismissal and `onAssigned` to notify the parent component that a successful assignment has occurred, prompting a data refresh.
 */
export function AssignSessionsModal({
  open,
  onClose,
  onAssigned,
}: AssignSessionsModalProps) {
  const { semesters } = useSemesterContext()
  // Pulls the same semester list as the selector so session assignment stays aligned with the shared context.

  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [targetSemesterId, setTargetSemesterId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUnassigned = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(ROUTES.API_SESSIONS)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const data = await res.json()
      const unassigned = (data.sessions as SessionSummary[]).filter(
        (s) => !s.semesterId
      )
      setSessions(unassigned)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchUnassigned()
      setSelected(new Set())
      setError(null)
      // Default to first active semester
      const active = semesters.find((s) => s.status === 'active')
      setTargetSemesterId(active?.id ?? semesters[0]?.id ?? '')
    }
  }, [open, fetchUnassigned, semesters])

  if (!open) return null

  function toggleSession(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(sessions.map((s) => s.id)))
  }

  async function handleAssign(ids: string[]) {
    if (ids.length === 0) {
      setError('Select at least one session.')
      return
    }
    if (!targetSemesterId) {
      setError('Select a semester to assign to.')
      return
    }

    setAssigning(true)
    setError(null)

    try {
      const res = await fetch(ROUTES.API_SEMESTERS_ASSIGN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionIds: ids,
          semesterId: targetSemesterId,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to assign sessions')
      }
      onAssigned()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setAssigning(false)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-xl animate-fade-up"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-bold"
            style={{
              fontFamily: 'var(--font-playfair)',
              color: 'var(--text-primary)',
            }}
          >
            Assign Sessions
          </h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none px-1 rounded hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Semester selector */}
        <div className="mb-4">
          <label
            className="block text-sm font-medium mb-1.5"
            style={{
              fontFamily: 'var(--font-dm-sans)',
              color: 'var(--text-secondary)',
            }}
          >
            Assign to Semester
          </label>
          <select
            value={targetSemesterId}
            onChange={(e) => setTargetSemesterId(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            {semesters.length === 0 && (
              <option value="">No semesters available</option>
            )}
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.name}
                {sem.status === 'active' ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Session list */}
        <div
          className="flex-1 overflow-y-auto rounded-lg mb-4"
          style={{ border: '1px solid var(--border)' }}
        >
          {loading ? (
            <div
              className="p-6 text-center text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div
              className="p-6 text-center text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              No unassigned sessions found.
            </div>
          ) : (
            <div>
              {sessions.map((session) => (
                <label
                  key={session.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: selected.has(session.id)
                      ? `${BRAND.ORANGE}0a`
                      : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(session.id)}
                    onChange={() => toggleSession(session.id)}
                    className="rounded"
                    style={{ accentColor: BRAND.ORANGE }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium truncate"
                      style={{
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-dm-sans)',
                      }}
                    >
                      {session.speakerName}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {formatDate(session.createdAt)} &middot;{' '}
                      {session.fileCount} file{session.fileCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm mb-3" style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {sessions.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs rounded-lg px-3 py-1.5 transition-opacity hover:opacity-80"
                  style={{
                    color: BRAND.ORANGE,
                    border: `1px solid ${BRAND.ORANGE}44`,
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  Select All
                </button>
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {selected.size} of {sessions.length} selected
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {sessions.length > 0 && selected.size < sessions.length && (
              <button
                type="button"
                onClick={() => handleAssign(sessions.map((s) => s.id))}
                disabled={assigning || semesters.length === 0}
                className="text-sm rounded-lg px-4 py-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{
                  color: BRAND.ORANGE,
                  border: `1px solid ${BRAND.ORANGE}44`,
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Assign All
              </button>
            )}
            <button
              type="button"
              onClick={() => handleAssign(Array.from(selected))}
              disabled={
                assigning || selected.size === 0 || semesters.length === 0
              }
              className="text-sm font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: BRAND.ORANGE,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              {assigning ? 'Assigning...' : `Assign Selected (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
