'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useSemesterContext } from '@/components/SemesterContext'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SemesterSummary } from '@/types'

interface SemesterManageModalProps {
  open: boolean
  onClose: () => void
  editingSemester?: SemesterSummary | null
  onSaved: () => void
}

export function SemesterManageModal({
  open,
  onClose,
  editingSemester,
  onSaved,
}: SemesterManageModalProps) {
  const { activeSemester } = useSemesterContext()

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingSemester

  // Populate form when editing
  useEffect(() => {
    if (editingSemester) {
      setName(editingSemester.name)
      setStartDate(editingSemester.startDate)
      setEndDate(editingSemester.endDate)
    } else {
      setName('')
      setStartDate('')
      setEndDate('')
    }
    setError(null)
  }, [editingSemester, open])

  if (!open) return null

  function validate(): boolean {
    if (!name.trim()) {
      setError('Semester name is required.')
      return false
    }
    if (!startDate || !endDate) {
      setError('Start and end dates are required.')
      return false
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date.')
      return false
    }
    setError(null)
    return true
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setError(null)

    try {
      if (isEditing) {
        const res = await fetch(ROUTES.API_SEMESTER(editingSemester!.id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, startDate, endDate }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to update semester')
        }
      } else {
        const hasActive = !!activeSemester
        const res = await fetch(ROUTES.API_SEMESTERS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            startDate,
            endDate,
            archiveCurrent: hasActive,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to create semester')
        }
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    if (!editingSemester) return
    setArchiving(true)
    setError(null)

    try {
      const res = await fetch(ROUTES.API_SEMESTER(editingSemester.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to archive semester')
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setArchiving(false)
    }
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
        className="w-full max-w-md rounded-xl p-6 shadow-xl animate-fade-up"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
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
            {isEditing ? 'Edit Semester' : 'Create Semester'}
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

        {!isEditing && activeSemester && (
          <div
            className="rounded-lg px-4 py-3 mb-4 text-sm"
            style={{
              background: `${BRAND.ORANGE}14`,
              border: `1px solid ${BRAND.ORANGE}33`,
              color: 'var(--text-secondary)',
            }}
          >
            Creating a new semester will archive{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {activeSemester.name}
            </strong>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                color: 'var(--text-secondary)',
              }}
            >
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring 2027"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-dm-sans)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  color: 'var(--text-secondary)',
                }}
              >
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{
                  fontFamily: 'var(--font-dm-sans)',
                  color: 'var(--text-secondary)',
                }}
              >
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <div>
              {isEditing && editingSemester?.status === 'active' && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="text-sm rounded-lg px-3 py-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    fontFamily: 'var(--font-dm-sans)',
                  }}
                >
                  {archiving ? 'Archiving...' : 'Archive Semester'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-sm rounded-lg px-4 py-2 transition-opacity hover:opacity-80"
                style={{
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-sm font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: BRAND.ORANGE,
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                {saving
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Create Semester'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
