'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SessionsTable } from '@/components/SessionsTable'
import { useSemesterContext } from '@/components/SemesterContext'
import { ROUTES } from '@/lib/constants'
import type { SessionSummary } from '@/types'

export default function HistoryPage() {
  const router = useRouter()
  const { activeSemesterId, loading: semesterLoading } = useSemesterContext()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (semesterLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const url = activeSemesterId
      ? `/api/sessions?semester=${encodeURIComponent(activeSemesterId)}`
      : '/api/sessions'

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load sessions')
        return res.json()
      })
      .then(data => {
        if (!cancelled) {
          setSessions(data.sessions ?? [])
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load sessions')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [activeSemesterId, semesterLoading])

  function handleToggleCompare() {
    setCompareMode(!compareMode)
    setSelectedIds([])
  }

  function handleCompare() {
    if (selectedIds.length !== 2) return
    router.push(`${ROUTES.COMPARE}?a=${selectedIds[0]}&b=${selectedIds[1]}`)
  }

  const selectedSessions = selectedIds
    .map(id => sessions.find(s => s.id === id))
    .filter(Boolean) as SessionSummary[]

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
              Session History
            </h1>
            <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              {compareMode
                ? 'Select two sessions to compare side by side.'
                : 'All your past question sheets. Click any row to reopen.'}
            </p>
          </div>
          {!loading && sessions.length >= 2 && (
            <button
              onClick={handleToggleCompare}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold font-[family-name:var(--font-dm-sans)] transition-colors border ${
                compareMode
                  ? 'bg-[#f36f21] text-white border-[#f36f21]'
                  : 'bg-transparent text-[#f36f21] border-[#f36f21] hover:bg-[rgba(243,111,33,0.08)]'
              }`}
            >
              {compareMode ? 'Cancel' : 'Compare'}
            </button>
          )}
        </div>
      </div>
      <div className="animate-fade-up-delay-1">
        {loading ? (
          <HistoryLoadingSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="py-16 text-center text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
              {error}
            </div>
          </div>
        ) : (
          <SessionsTable
            sessions={sessions}
            compareMode={compareMode}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        )}
      </div>

      {/* Floating compare bar */}
      {compareMode && selectedIds.length === 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <button
            onClick={handleCompare}
            className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#f36f21] text-white font-semibold text-sm font-[family-name:var(--font-dm-sans)] shadow-lg hover:bg-[#e0611a] transition-colors"
          >
            Compare {selectedSessions[0]?.speakerName} vs {selectedSessions[1]?.speakerName}
            <span className="text-white/80">→</span>
          </button>
        </div>
      )}
    </div>
  )
}

function HistoryLoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="space-y-0">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-[var(--border)]' : ''}`}
          >
            <div className="h-4 w-32 rounded bg-[var(--surface-elevated)] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[var(--surface-elevated)] animate-pulse" />
            <div className="h-4 w-16 rounded bg-[var(--surface-elevated)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
