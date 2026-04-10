"use client"

/**
 * @file GenerateBriefButton.tsx
 * Action button that generates (or navigates to) a speaker brief for a session.
 *
 * Rendered by: app/(app)/preview/page.tsx (questions tab action bar)
 * Calls:
 *   - GET /api/sessions/[id]/brief — checks whether a brief already exists on mount.
 *   - POST /api/sessions/[id]/brief — generates the brief if it doesn't exist.
 * Navigates to: app/(app)/preview/brief?sessionId=[id] after generation.
 *
 * State machine:
 * - `checking` (true on mount): button renders nothing while probing the API.
 * - `exists=false`: renders "Speaker Brief" button. Click generates + navigates.
 * - `exists=true`: renders "View Brief" button. Click navigates directly.
 * - `loading`: spinner + "Generating..." label during POST.
 * Errors surface inline below the button; `alert()` is never used.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

const DocumentIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

/**
 * Button that either generates a new speaker brief or navigates to an existing one.
 *
 * @param sessionId   - Session to generate or navigate to the brief for.
 * @param speakerName - Declared in the caller's prop shape but unused here (kept for
 *   API consistency with GeneratePortalButton).
 *
 * @remarks
 * Rendered by app/(app)/preview/page.tsx. On mount it silently probes
 * GET /api/sessions/[id]/brief to determine the button label. The button
 * renders `null` during the initial check to avoid a flash of incorrect state.
 */
// Enables generating or viewing the shareable speaker brief that backs the portal preview.
export function GenerateBriefButton({
  sessionId,
}: {
  sessionId: string
  speakerName: string
}) {
  const router = useRouter()
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(false)
  // True while the initial existence check is in-flight; button renders null during this time.
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // On mount: probe for an existing brief to determine initial button state.
  useEffect(() => {
    async function checkBrief() {
      try {
        const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId))
        if (!res.ok) return
        const data = await res.json()
        if (data.brief) setExists(true)
      } catch {
        // Non-critical — fall back to showing the "Generate" state
      } finally {
        setChecking(false)
      }
    }
    checkBrief()
  }, [sessionId])

  /**
   * If a brief exists, navigate directly to the preview page.
   * Otherwise, POST to generate one, then navigate on success.
   */
  async function handleClick() {
    if (exists) {
      router.push(`${ROUTES.PREVIEW_BRIEF}?sessionId=${sessionId}`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId), { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate brief')
      }
      setExists(true)
      router.push(`${ROUTES.PREVIEW_BRIEF}?sessionId=${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speaker brief')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 disabled:cursor-not-allowed ${
          exists
            ? 'border border-[#0f6b37] text-[#5e9e6e] hover:bg-[rgba(15,107,55,0.1)]'
            : 'border border-[#0f6b37] text-[#0f6b37] hover:bg-[rgba(15,107,55,0.1)]'
        }`}
        style={{ background: 'var(--surface)' }}
      >
        {loading ? <SpinnerIcon /> : <DocumentIcon />}
        {loading ? 'Generating...' : exists ? 'View Brief' : 'Speaker Brief'}
      </button>
      {error && (
        <p className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)] max-w-[220px]">{error}</p>
      )}
    </div>
  )
}
