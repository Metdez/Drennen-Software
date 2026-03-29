"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ROUTES } from '@/lib/constants'

const PortalIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

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
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId), { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate portal')
      }
      setExists(true)
      router.push(`${ROUTES.PREVIEW_PORTAL}?sessionId=${sessionId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create speaker portal')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  return (
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
  )
}
