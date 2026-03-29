'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/lib/constants'
import type { ProfessorNote } from '@/types'

interface Props {
  studentName: string
}

export function ProfessorNotesEditor({ studentName }: Props) {
  const [notes, setNotes] = useState<ProfessorNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API_STUDENT_NOTES(studentName))
      if (res.ok) {
        const data = await res.json()
        setNotes(data.notes ?? [])
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [studentName])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const handleAdd = async () => {
    const text = newText.trim()
    if (!text || saving) return

    setSaving(true)
    try {
      const res = await fetch(ROUTES.API_STUDENT_NOTES(studentName), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const data = await res.json()
        setNotes((prev) => [data.note, ...prev])
        setNewText('')
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    // Optimistic removal
    setNotes((prev) => prev.filter((n) => n.id !== noteId))
    try {
      await fetch(ROUTES.API_STUDENT_NOTES(studentName), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
    } catch {
      // Revert on failure
      fetchNotes()
    }
  }

  const handleToggleFlag = async (noteId: string) => {
    // Optimistic toggle
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId ? { ...n, flaggedForFollowup: !n.flaggedForFollowup } : n
      )
    )
    try {
      await fetch(ROUTES.API_STUDENT_NOTES(studentName), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId }),
      })
    } catch {
      fetchNotes()
    }
  }

  if (loading) {
    return (
      <Card padding="md" elevated>
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-[var(--border-accent)] rounded mb-3" />
          <div className="h-16 bg-[var(--border-accent)] rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md" elevated>
      <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 font-[family-name:var(--font-dm-sans)]">
        Your Notes
      </h4>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-2 mb-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                note.flaggedForFollowup
                  ? 'border-[#f36f21]/40 bg-[#f36f21]/5'
                  : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              {/* Flag toggle */}
              <button
                onClick={() => handleToggleFlag(note.id)}
                className={`shrink-0 mt-0.5 text-sm transition-colors ${
                  note.flaggedForFollowup ? 'text-[#f36f21]' : 'text-[var(--text-muted)] hover:text-[#f36f21]'
                }`}
                title={note.flaggedForFollowup ? 'Remove follow-up flag' : 'Flag for follow-up'}
              >
                {note.flaggedForFollowup ? '⚑' : '⚐'}
              </button>

              {/* Note content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {note.noteText}
                </p>
                <span className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(note.id)}
                className="shrink-0 text-[var(--text-muted)] hover:text-red-400 text-xs transition-colors"
                title="Delete note"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add note */}
      <div className="flex gap-2">
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Add a note about this student..."
          rows={2}
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:ring-1 focus:ring-[#f36f21] font-[family-name:var(--font-dm-sans)]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAdd()
            }
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newText.trim() || saving}
          className="self-end px-4 py-2 text-sm font-medium text-white bg-[#f36f21] rounded-lg hover:bg-[#d85f18] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          {saving ? 'Saving...' : 'Add'}
        </button>
      </div>
    </Card>
  )
}
