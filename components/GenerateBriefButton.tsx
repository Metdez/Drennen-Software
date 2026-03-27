"use client"

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

export function GenerateBriefButton({
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
    async function checkBrief() {
      try {
        const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId))
        if (!res.ok) return
        const data = await res.json()
        if (data.brief) setExists(true)
      } catch {
        // Non-critical
      } finally {
        setChecking(false)
      }
    }
    checkBrief()
  }, [sessionId])

  async function handleClick() {
    if (exists) {
      router.push(`${ROUTES.PREVIEW_BRIEF}?sessionId=${sessionId}`)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId), { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate brief')
      }
      setExists(true)
      router.push(`${ROUTES.PREVIEW_BRIEF}?sessionId=${sessionId}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate speaker brief')
    } finally {
      setLoading(false)
    }
  }

  if (checking) return null

  return (
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
  )
}
