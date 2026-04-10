"use client"

/**
 * @file ShareButton.tsx
 * Toggleable share button that creates/revokes a public share link for a session.
 *
 * Rendered by: app/(app)/preview/page.tsx (action bar)
 *
 * Calls:
 *   GET  /api/sessions/[id]/share  — checks whether sharing is already enabled on mount
 *   POST /api/sessions/[id]/share  — enables sharing and returns a share token
 *   DELETE /api/sessions/[id]/share — revokes the share token
 *
 * Share URL format: `{origin}/shared/{shareToken}`
 *
 * UX flow:
 * - Unshared: single click immediately POSTs to enable sharing and opens the panel.
 * - Shared: button toggles the dropdown panel; panel shows the URL + Copy + Stop sharing.
 * - Outside click closes the panel (mousedown listener, cleaned up when panel closes).
 * - Copy writes to clipboard with 2-second "Copied!" transient feedback.
 */

import { useEffect, useState, useRef } from 'react'
import { ROUTES } from '@/lib/constants'

/**
 * Renders a simple SVG icon representing a link.
 *
 * It is used to visually represent the concept of sharing or linking within the ShareButton component, often accompanying text like "Share" or "Copy".
 *
 * This is a stateless functional component that returns a predefined SVG path for a link icon. It uses Tailwind CSS classes for basic styling (height, width, stroke properties).
 */
const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.342" />
  </svg>
)

/**
 * Renders a simple SVG icon representing a checkmark.
 *
 * It is used to provide visual feedback for successful actions, specifically indicating when the share URL has been successfully copied to the clipboard.
 *
 * This is a stateless functional component that returns a predefined SVG path for a checkmark icon. It uses Tailwind CSS classes for basic styling (height, width, stroke properties).
 */
const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

/**
 * Renders an SVG icon that visually indicates a loading or busy state.
 *
 * It is used to provide user feedback when an asynchronous operation (like enabling or revoking sharing) is in progress, preventing user confusion about responsiveness.
 *
 * This is a stateless functional component that returns a predefined SVG with `animate-spin` class, causing it to rotate continuously. It uses `circle` and `path` elements to form the spinner shape.
 */
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

/**
 * Share button + popover panel for a single session.
 *
 * @param sessionId - The session whose share token is managed.
 *
 * Side effects:
 * - On mount: GETs current share state so the button renders correctly even when
 *   the user navigates directly to a previously-shared session's preview page.
 * - When open: registers a `mousedown` listener to close the panel on outside clicks.
 */
export function ShareButton({ sessionId }: { sessionId: string }) {
  const [shared, setShared] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Fetch current share state on mount
  useEffect(() => {
    async function fetchShareState() {
      try {
        const res = await fetch(ROUTES.API_SESSION_SHARE(sessionId))
        if (!res.ok) return
        const data = await res.json()
        if (data.shared) {
          setShared(true)
          setShareUrl(`${window.location.origin}/shared/${data.shareToken}`)
        }
      } catch {
        // Ignore — share status is non-critical
      }
    }
    fetchShareState()
  }, [sessionId])

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  /** Creates a share token by POSTing to /api/sessions/[id]/share. */
  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SESSION_SHARE(sessionId), { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShared(true)
      setShareUrl(data.shareUrl)
    } catch {
      setError('Failed to enable sharing.')
    } finally {
      setBusy(false)
    }
  }

  /** Revokes the share token by DELETEing /api/sessions/[id]/share, then closes the panel. */
  async function handleRevoke() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SESSION_SHARE(sessionId), { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setShared(false)
      setShareUrl(null)
      setOpen(false)
    } catch {
      setError('Failed to revoke sharing.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Copies the share URL to the clipboard and shows transient "Copied!" feedback for 2 s.
   * The catch block is intentionally empty — the input field can still be manually selected.
   */
  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: the read-only input auto-selects on focus so the user can copy manually.
    }
  }

  return (
    <div className="relative flex flex-col items-end gap-1" ref={panelRef}>
      {error && !open && (
        <p className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)]">{error}</p>
      )}
      <button
        onClick={() => {
          if (!shared) {
            handleEnable()
            setOpen(true)
          } else {
            setOpen(!open)
          }
        }}
        disabled={busy}
        className={`session-action-btn disabled:opacity-40 disabled:cursor-not-allowed ${
          shared
            ? 'session-action-btn--green'
            : ''
        }`}
      >
        {busy ? <SpinnerIcon /> : <LinkIcon />}
        <span className="hidden sm:inline">{shared ? 'Shared' : 'Share'}</span>
      </button>

      {open && shared && shareUrl && (
        <div
          className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] shadow-xl p-4 flex flex-col gap-3"
          style={{ background: 'var(--surface)' }}
        >
          <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            Anyone with this link can view this session
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] select-all"
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] ${
                copied
                  ? 'bg-[rgba(15,107,55,0.15)] text-[#5e9e6e]'
                  : 'bg-[#f36f21] text-white hover:bg-[#d85e18]'
              }`}
            >
              {copied ? <CheckIcon /> : <LinkIcon />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)]">{error}</p>
          )}
          <button
            onClick={handleRevoke}
            disabled={busy}
            className="text-xs text-red-400 hover:text-red-300 transition-colors font-[family-name:var(--font-dm-sans)] text-left disabled:opacity-40"
          >
            Stop sharing
          </button>
        </div>
      )}
    </div>
  )
}
