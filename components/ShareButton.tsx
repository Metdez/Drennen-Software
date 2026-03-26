"use client"

import { useEffect, useState, useRef } from 'react'
import { ROUTES } from '@/lib/constants'

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.342" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

export function ShareButton({ sessionId }: { sessionId: string }) {
  const [shared, setShared] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
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

  async function handleEnable() {
    setBusy(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_SHARE(sessionId), { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShared(true)
      setShareUrl(data.shareUrl)
    } catch {
      alert('Failed to enable sharing.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    setBusy(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_SHARE(sessionId), { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setShared(false)
      setShareUrl(null)
      setOpen(false)
    } catch {
      alert('Failed to revoke sharing.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the input
    }
  }

  return (
    <div className="relative" ref={panelRef}>
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
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 disabled:cursor-not-allowed ${
          shared
            ? 'border border-[#0f6b37] text-[#5e9e6e] hover:bg-[rgba(15,107,55,0.1)]'
            : 'border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[#f36f21] hover:border-[#f36f21]'
        }`}
        style={{ background: 'var(--surface)' }}
      >
        {busy ? <SpinnerIcon /> : <LinkIcon />}
        {shared ? 'Shared' : 'Share'}
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
