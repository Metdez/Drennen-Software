"use client"

/**
 * @file GeneratePortalButton.tsx
 * Action button that generates (or navigates to) a speaker portal for a session.
 *
 * Rendered by: app/(app)/preview/page.tsx (questions tab action bar)
 * Calls:
 *   - GET /api/sessions/[id]/portal — checks whether a portal already exists on mount.
 *   - POST /api/sessions/[id]/portal — creates the portal if it doesn't exist yet.
 * Navigates to: app/(app)/preview/portal?sessionId=[id] after generation.
 *
 * State machine mirrors GenerateBriefButton:
 *  - `checking` (true on mount): renders null while probing the API.
 *  - `exists=false`: renders "Create Portal" button. Click generates + navigates.
 *  - `exists=true`: renders "Portal" button. Click navigates directly.
 *  - `loading`: spinner + "Creating..." label during POST.
 * Errors surface inline below the button.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

/**
 * What it does: A functional React component that renders an SVG icon visually representing a portal or an external link.
 * Why it is used: It serves as the static icon displayed within the GeneratePortalButton when the button is not in a loading state, providing a clear visual cue for the 'Portal' action.
 * Important implementation details: It uses inline SVG for the icon definition and applies basic sizing with Tailwind CSS classes (h-4, w-4). The SVG path is designed to resemble an external window or portal.
 */
const PortalIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

/**
 * What it does: A functional React component that renders an SVG icon that animates to indicate a loading or processing state.
 * Why it is used: It provides visual feedback to the user, showing that an asynchronous operation (like creating a portal) is currently in progress, improving user experience by indicating responsiveness.
 * Important implementation details: The SVG uses a combination of a circle and a path to form the spinner. It applies the `animate-spin` Tailwind CSS class to continuously rotate the icon, giving it a dynamic loading appearance.
 */
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

/**
 * What it does: A React client component that provides a button to either create a new speaker portal for a given session or navigate to an existing one. It handles the full lifecycle of this interaction, including initial checks, API calls, loading states, and navigation.
 * Why it is used: This component is essential for managing speaker portals within the application, offering a user-friendly way to access or generate specific session portals. It centralizes the logic for portal interaction, ensuring a consistent user experience.
 * Important implementation details:
 * - Uses `useState` hooks for managing the portal's existence (`exists`), loading state during creation (`loading`), initial checking state (`checking`), and any error messages (`error`).
 * - Employs the `useRouter` hook from Next.js for client-side navigation to the portal preview page.
 * - A `useEffect` hook performs an initial asynchronous fetch to `ROUTES.API_SESSION_PORTAL(sessionId)` to determine if a portal already exists for the provided session ID. This prevents unnecessary portal creation.
 * - The `handleClick` function intelligently handles two scenarios: if the portal exists, it navigates directly; otherwise, it makes a `POST` request to the API to create the portal, updates the `exists` state, and then navigates.
 * - Displays `SpinnerIcon` during `loading` states and `PortalIcon` otherwise, along with contextual text feedback.
 * - Renders `null` during the `checking` phase to prevent UI flicker while determining portal existence.
 * - Includes robust error handling, displaying user-friendly messages if the portal creation API call fails.
 * - The `speakerName` prop is defined but not used in the current component logic, indicating it might be a remnant or intended for future use.
 */
// Creates or opens the portal link that powers the public speaker portal experience.
export function GeneratePortalButton({
  sessionId,
}: {
  sessionId: string
  speakerName: string
}) {
  const router = useRouter()
  const [exists, setExists] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkPortal() {
      try {
        const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId))
        if (!res.ok) return
        const data = await res.json()
        if (data.portal) setExists(true)
      } catch {
        // Non-critical
      } finally {
        setChecking(false)
      }
    }
    checkPortal()
  }, [sessionId])

  async function handleClick() {
    if (exists) {
      router.push(`${ROUTES.PREVIEW_PORTAL}?sessionId=${sessionId}`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId), { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate portal')
      }
      setExists(true)
      router.push(`${ROUTES.PREVIEW_PORTAL}?sessionId=${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create speaker portal')
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
        className={`session-action-btn session-action-btn--green disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {loading ? <SpinnerIcon /> : <PortalIcon />}
        <span className="hidden sm:inline">
          {loading ? 'Creating...' : exists ? 'Portal' : 'Create Portal'}
        </span>
      </button>
      {error && (
        <p className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)] max-w-[220px]">{error}</p>
      )}
    </div>
  )
}
