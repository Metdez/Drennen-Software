"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OutputPreview } from '@/components/OutputPreview'
import { DownloadButtons } from '@/components/DownloadButtons'
import { AnalysisPanelLeft } from '@/components/AnalysisPanelLeft'
import { AnalysisPanelRight } from '@/components/AnalysisPanelRight'
import { ROUTES } from '@/lib/constants'
import type { Session, SessionAnalysis } from '@/types'

function PreviewContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<Session | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [overlappingThemes, setOverlappingThemes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      setAnalysisLoading(false)
      return
    }

    const storedOutput = sessionStorage.getItem(`session_${sessionId}`)
    if (storedOutput) {
      setOutput(storedOutput)
    }

    const storedOverlap = sessionStorage.getItem(`overlap_${sessionId}`)
    if (storedOverlap) {
      try {
        setOverlappingThemes(JSON.parse(storedOverlap))
      } catch {
        // ignore malformed data
      }
    }

    // Check sessionStorage cache for analysis
    const storedAnalysis = sessionStorage.getItem(`analysis_${sessionId}`)
    let analysisCacheLoaded = false
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis))
        setAnalysisLoading(false)
        analysisCacheLoaded = true
      } catch {
        // malformed cache — clear it and fall through to fetch
        sessionStorage.removeItem(`analysis_${sessionId}`)
      }
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
      } catch (err: unknown) {
        if (!storedOutput) {
          setError(err instanceof Error ? err.message : 'Failed to load session')
        }
      } finally {
        setLoading(false)
      }
    }

    async function fetchAnalysis() {
      if (analysisCacheLoaded) return // cache was successfully parsed above
      try {
        const res = await fetch(ROUTES.API_SESSION_ANALYSIS(sessionId!))
        if (!res.ok) return
        const data = await res.json()
        if (!data.empty && !data.error) {
          setAnalysis(data)
          sessionStorage.setItem(`analysis_${sessionId}`, JSON.stringify(data))
        }
      } catch {
        // analysis failure is non-fatal — panels stay hidden
      } finally {
        setAnalysisLoading(false)
      }
    }

    // Run both in parallel
    fetchSession()
    fetchAnalysis()
  }, [sessionId])

  if (loading && !output) {
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
    // Break out of the (app) layout's px-6 to go full-width for the 3-column grid
    <div className="mx-[-1.5rem] w-[calc(100%+3rem)]">
      <div className="grid grid-cols-[230px_1fr_230px] min-h-screen">

        {/* LEFT PANEL — hidden below lg */}
        <div className="hidden lg:block border-r border-[var(--border-accent)]">
          <AnalysisPanelLeft
            sessionId={sessionId}
            analysis={analysis}
            loading={analysisLoading}
          />
        </div>

        {/* CENTER — main preview content */}
        <div className="px-8 py-10">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <Link
              href={ROUTES.DASHBOARD}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 w-fit font-[family-name:var(--font-dm-sans)]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              New Session
            </Link>

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

            {overlappingThemes.length > 0 && (
              <div
                className="animate-fade-up rounded-xl px-5 py-4 border font-[family-name:var(--font-dm-sans)]"
                style={{ borderColor: '#f36f21', background: 'rgba(243,111,33,0.07)' }}
              >
                <p className="text-sm font-semibold text-[#f36f21] mb-1">
                  ⚠ {overlappingThemes.length} {overlappingThemes.length === 1 ? 'theme' : 'themes'} appeared in recent sessions
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {overlappingThemes.map((t, i) => (
                    <span key={t}>
                      {i > 0 && ', '}
                      &ldquo;{t}&rdquo;
                    </span>
                  ))}
                  {' '}— consider freshening the angle before the next session.
                </p>
              </div>
            )}

            {output && (
              <div className="animate-fade-up-delay-1">
                <OutputPreview output={output} />
              </div>
            )}

            {session && (
              <div className="animate-fade-up-delay-2 pt-2 border-t border-[var(--border-accent)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest mb-3 font-[family-name:var(--font-dm-sans)]">
                  Export
                </p>
                <DownloadButtons sessionId={sessionId} speakerName={session.speakerName} />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — hidden below lg */}
        <div className="hidden lg:block border-l border-[var(--border-accent)]">
          <AnalysisPanelRight
            analysis={analysis}
            loading={analysisLoading}
          />
        </div>

      </div>
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
