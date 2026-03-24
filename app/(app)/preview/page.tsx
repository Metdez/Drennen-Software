"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OutputPreview } from '@/components/OutputPreview'
import { DownloadButtons } from '@/components/DownloadButtons'
import { ROUTES } from '@/lib/constants'
import { Session } from '@/types'

function PreviewContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<Session | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }

    const storedOutput = sessionStorage.getItem(`session_${sessionId}`)
    if (storedOutput) {
      setOutput(storedOutput)
    }

    async function fetchSession() {
      try {
        const res = await fetch(`${ROUTES.API_SESSIONS}/${sessionId}`)
        if (!res.ok) throw new Error('Failed to fetch session metadata')

        const data = await res.json()
        setSession(data.session)
        if (!storedOutput && data.session?.output) {
          setOutput(data.session.output)
        }
      } catch (err: any) {
        if (!storedOutput) {
          setError(err?.message || 'Failed to load session')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading preview...
      </div>
    )
  }

  if (error || !sessionId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">{error}</p>
        <Link
          href={ROUTES.DASHBOARD}
          className="text-[#f36f21] hover:underline text-sm font-medium font-[family-name:var(--font-dm-sans)]"
        >
          ← Return to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Back link */}
      <Link
        href={ROUTES.DASHBOARD}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 w-fit font-[family-name:var(--font-dm-sans)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        New Session
      </Link>

      {/* Speaker header */}
      {session && (
        <div className="animate-fade-up">
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
            {session.speakerName}
          </h1>
          <div className="h-0.5 w-16 bg-[#f36f21] mb-3" />
          <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
            {new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="mx-2 opacity-40">·</span>
            {session.fileCount} {session.fileCount === 1 ? 'file' : 'files'} processed
          </p>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="animate-fade-up-delay-1">
          <OutputPreview output={output} />
        </div>
      )}

      {/* Download section */}
      {session && (
        <div className="animate-fade-up-delay-2 pt-2 border-t border-[var(--border-accent)]">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3 font-[family-name:var(--font-dm-sans)]">
            Export
          </p>
          <DownloadButtons sessionId={sessionId} speakerName={session.speakerName} />
        </div>
      )}

      {/* Roster link */}
      {session && sessionId && (
        <div className="animate-fade-up-delay-2 pt-2 border-t border-[var(--border-accent)]">
          <Link
            href={`${ROUTES.ROSTER}?sessionId=${sessionId}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 font-[family-name:var(--font-dm-sans)]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            View Student Roster
          </Link>
        </div>
      )}
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  )
}
