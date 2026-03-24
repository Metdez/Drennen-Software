'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

export function ClearDataButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/clear', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed to clear data')
      }
      router.push(ROUTES.DASHBOARD)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
          Delete all sessions and students?
        </span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
        >
          {loading ? 'Clearing…' : 'Yes, clear all'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Cancel
        </button>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 text-xs font-medium rounded border border-red-800/40 text-red-400 hover:border-red-600 hover:text-red-300 transition-colors"
    >
      Clear All Data
    </button>
  )
}
