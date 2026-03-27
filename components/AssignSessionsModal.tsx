'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSemesterContext } from '@/components/SemesterContext'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SessionSummary } from '@/types'

interface AssignSessionsModalProps {
  open: boolean
  onClose: () => void
  onAssigned: () => void
}

export function AssignSessionsModal({
  open,
  onClose,
  onAssigned,
}: AssignSessionsModalProps) {
  const { semesters } = useSemesterContext()

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
