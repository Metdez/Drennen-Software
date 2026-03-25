"use client"

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OutputPreview } from '@/components/OutputPreview'
import { DownloadButtons } from '@/components/DownloadButtons'
import { AnalysisPanelLeft } from '@/components/AnalysisPanelLeft'
import { AnalysisPanelRight } from '@/components/AnalysisPanelRight'
import { ROUTES } from '@/lib/constants'
import type { Session, SessionAnalysis } from '@/types'

type Tab = 'questions' | 'analysis' | 'insights'

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
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('questions')

  const fetchAnalysis = useCallback(async () => {
    if (!sessionId) return
    setAnalysisError(null)
    setAnalysis(null)
    setAnalysisLoading(true)

    // Check sessionStorage cache first
    const storedAnalysis = sessionStorage.getItem(`analysis_${sessionId}`)
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis))
        setAnalysisLoading(false)
        return
      } catch {
        sessionStorage.removeItem(`analysis_${sessionId}`)
      }
    }

    try {
      const res = await fetch(ROUTES.API_SESSION_ANALYSIS(sessionId))
      if (!res.ok) {
        let msg = 'Analysis failed to load.'
        try {
          const errData = await res.json()
          // Gemini errors can be nested JSON in the message string
          let raw = errData.error ?? ''
          try {
            const parsed = JSON.parse(raw)
            raw = parsed?.error?.message ?? raw
          } catch { /* not JSON */ }
          if (raw) msg = raw
        } catch { /* ignore parse errors */ }
        setAnalysisError(msg)
        return
      }
      const data = await res.json()
      if (data.empty) {
        // genuinely no submissions saved for this session
        return
      }
      if (data.error) {
        setAnalysisError(data.error)
        return
      }
      setAnalysis(data)
      sessionStorage.setItem(`analysis_${sessionId}`, JSON.stringify(data))
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Network error loading analysis.')
    } finally {
      setAnalysisLoading(false)
    }
  }, [sessionId])

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

    fetchSession()
    fetchAnalysis()
  }, [sessionId, fetchAnalysis])

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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'questions', label: 'Questions' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'insights', label: 'Insights' },
  ]

  return (
    <div className="flex flex-col gap-6">
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

      {/* Header row: speaker name on left, download buttons on right */}
      {session && (
        <div className="animate-fade-up flex items-start justify-between gap-4">
          <div>
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
          <div className="shrink-0 pt-1">
            <DownloadButtons sessionId={sessionId} speakerName={session.speakerName} />
          </div>
        </div>
      )}

      {/* Tab bar */}
      {session && (
        <div className="border-b border-[var(--border-accent)]">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-2.5 text-sm font-medium font-[family-name:var(--font-dm-sans)] border-b-2 -mb-px transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'text-[#f36f21] border-[#f36f21]'
                    : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab panels */}
      {activeTab === 'questions' && (
        <div className="flex flex-col gap-6">
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
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="animate-fade-up">
          <AnalysisPanelLeft
            sessionId={sessionId}
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onRetry={fetchAnalysis}
          />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="animate-fade-up">
          <AnalysisPanelRight
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onRetry={fetchAnalysis}
          />
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
