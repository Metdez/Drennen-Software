'use client'

/**
 * @file ClearDataButton.tsx
 * Admin-only button that wipes all session and student data for the current professor.
 *
 * Rendered by: app/(app)/account/page.tsx (admin section)
 * Calls: POST /api/admin/clear
 *
 * Uses a two-step confirmation UI: first click reveals "Yes, clear all" / "Cancel"
 * buttons to prevent accidental data loss. Redirects to /dashboard after success.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

/**
 * Two-step confirmation button for the admin data-clear action.
 *
 * On first click: shows a confirmation prompt with Yes / Cancel options.
 * On confirm: POSTs to `/api/admin/clear` and redirects to the dashboard.
 * Errors are shown inline next to the confirmation buttons.
 */
export function ClearDataButton() {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Executes the destructive clear after the professor clicks "Yes, clear all". */
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
