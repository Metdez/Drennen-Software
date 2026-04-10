/**
 * ComparisonShareButton — Share / revoke share token button for a saved comparison.
 *
 * POSTs to /api/compare/share to create a share token and copies the resulting URL
 * to the clipboard. Once shared, toggles to show a "Stop sharing" revoke action
 * that sends a DELETE to the same endpoint.
 *
 * Rendered by: app/(app)/compare/page.tsx (toolbar)
 * Calls: POST /api/compare/share, DELETE /api/compare/share
 */
'use client'

import { useState } from 'react'
import { ROUTES } from '@/lib/constants'

/**
 * Props for ComparisonShareButton.
 * @prop comparisonId - ID of the saved comparison to share.
 *                     Renders nothing (null) when not yet saved.
 */
/**
 * Defines the shape of properties expected by the ComparisonShareButton component.
 *
 * It ensures type safety for the `comparisonId` prop, which is crucial for the component's functionality. The `comparisonId` dictates whether the sharing functionality is available and which comparison is being shared.
 */
interface ComparisonShareButtonProps {
  comparisonId: string | null
}

/**
 * A client-side React component that provides functionality to share or revoke a saved comparison via a unique URL.
 *
 * It is used to enable users to easily share a specific comparison state with others or persist it. The component handles the entire sharing lifecycle, including initiating the share, copying the URL, providing user feedback, and revoking access.
 *
 * Key implementation details:
 * - Uses React's `useState` hook to manage the sharing state, the generated share URL, and whether the link has been copied.
 * - Renders `null` if `comparisonId` is not provided, meaning the component will only appear for already saved comparisons.
 * - `handleShare` asynchronously sends a POST request to a defined API route (`ROUTES.API_COMPARE_SHARE`) to generate a shareable URL. On success, it copies the URL to the user's clipboard and updates the UI.
 * - `handleRevoke` asynchronously sends a DELETE request to the same API route to invalidate an existing share URL, resetting the component's state.
 * - Includes basic error handling and UI feedback (e.g., 'Sharing...', 'Link copied!').
 * - The UI conditionally renders either a 'Share' button or a 'Stop sharing' button based on the `shareUrl` state.
 */
// Manages share token creation/revocation so collaborators can open the public compare link.
export function ComparisonShareButton({ comparisonId }: ComparisonShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!comparisonId) return null

  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch(ROUTES.API_COMPARE_SHARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId }),
      })
      const data = await res.json()
      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
        await navigator.clipboard.writeText(data.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to share comparison:', err)
    } finally {
      setSharing(false)
    }
  }

  async function handleRevoke() {
    try {
      await fetch(ROUTES.API_COMPARE_SHARE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId }),
      })
      setShareUrl(null)
    } catch (err) {
      console.error('Failed to revoke sharing:', err)
    }
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          {copied ? 'Link copied!' : 'Shared'}
        </span>
        <button
          onClick={handleRevoke}
          className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/30 transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          Stop sharing
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[#f36f21] hover:border-[#f36f21]/30 transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-50"
    >
      {sharing ? 'Sharing...' : 'Share'}
    </button>
  )
}
