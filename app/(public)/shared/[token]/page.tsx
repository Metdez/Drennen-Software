/**
 * Public shared session page (`/shared/[token]`).
 *
 * No-auth read-only view of a single session, accessed via a share token.
 * Displays the session output across three tabs: Questions, Analysis, and Insights.
 *
 * Data:
 * - Session content: `GET /api/shared/[token]` — returns speakerName, createdAt,
 *   fileCount, and output. 404 = link revoked.
 * - Analysis: `GET /api/shared/[token]/analysis` — optional; silently ignored on failure.
 *
 * Download: `DownloadButtons` is passed a custom `downloadUrl` pointing to
 * `GET /api/shared/[token]/download?format=...` (no auth required).
 *
 * Components: OutputPreview, DownloadButtons, AnalysisPanelLeft, AnalysisPanelRight
 * Wrapped in Suspense because it reads from `useParams`.
 */
"use client"

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { OutputPreview } from '@/components/session/OutputPreview'
import { DownloadButtons } from '@/components/session/DownloadButtons'
import { AnalysisPanelLeft } from '@/components/analytics/AnalysisPanelLeft'
import { AnalysisPanelRight } from '@/components/analytics/AnalysisPanelRight'
import { ROUTES, APP_NAME } from '@/lib/constants'
import type { SessionAnalysis } from '@/types'

/**
 * Defines a union type representing the possible active tabs within the shared session view.
 * It is used to ensure type safety and provide a clear, restricted set of values for managing the current active tab state in the UI.
 * This is a string literal union type, explicitly listing 'questions', 'analysis', and 'insights' as the valid tab identifiers.
 */
type Tab = 'questions' | 'analysis' | 'insights'

/**
 * Defines the structure of a shared session object, as expected to be received from the API.
 * It is used to type the `session` state variable in the `SharedContent` component, ensuring type safety and predictability when accessing shared session data properties.
 * It includes `speakerName` (string), `createdAt` (string, expected to be an ISO date string), `fileCount` (number), and `output` (string) which holds the main processed content of the session.
 */
interface SharedSession {
  speakerName: string
  createdAt: string
  fileCount: number
  output: string
}

/**
 * This is the primary client-side React component responsible for fetching and displaying the details of a shared session based on a unique token.
 * It is used to provide a public, read-only interface for users to access and review specific session data, including processed output, analysis, and insights, without requiring authentication. It allows sharing of session results via a unique URL.
 * It uses `useParams` to extract the session `token` from the URL. Manages several state variables for loading, error handling, session data, analysis data, and the active tab. It employs `useEffect` to fetch session and analysis data concurrently on component mount or token change. The `fetchAnalysis` callback is memoized using `useCallback`. It gracefully handles loading and error states by rendering appropriate UI messages. The component renders session metadata, provides download options, and presents a tabbed interface using `OutputPreview`, `AnalysisPanelLeft`, and `AnalysisPanelRight` components. Analysis fetching is designed to 'silently fail' if data is unavailable, as it is optional for shared views.
 */
function SharedContent() {
  const params = useParams<{ token: string }>()
  const token = params.token

  const [session, setSession] = useState<SharedSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('questions')

  const fetchAnalysis = useCallback(async () => {
    if (!token) return
    setAnalysisLoading(true)
    try {
      const res = await fetch(ROUTES.API_SHARED_ANALYSIS(token))
      if (!res.ok) return
      const data = await res.json()
      if (data.empty || data.error) return
      setAnalysis(data)
    } catch {
      // Silently fail — analysis is optional for shared views
    } finally {
      setAnalysisLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) return

    async function fetchSession() {
      try {
        const res = await fetch(ROUTES.API_SHARED_SESSION(token))
        if (!res.ok) {
          if (res.status === 404) {
            setError('This session is no longer available. The link may have been revoked or the session may not exist.')
          } else {
            setError('Something went wrong loading this session.')
          }
          return
        }
        const data = await res.json()
        setSession(data.session)
      } catch {
        setError('Failed to load session. Please check your connection and try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
    fetchAnalysis()
  }, [token, fetchAnalysis])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading...
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-full bg-[var(--surface)] border border-[var(--border-accent)] flex items-center justify-center mb-2">
          <svg className="h-8 w-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-[var(--text-primary)] text-base font-semibold font-[family-name:var(--font-dm-sans)]">
          Session Not Available
        </p>
        <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)] text-center max-w-md">
          {error || 'This session could not be found.'}
        </p>
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
      {/* Branding */}
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          {APP_NAME}
        </span>
      </div>

      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
            {session.speakerName}
          </h1>
          <div className="h-0.5 w-16 bg-[#f36f21] mb-3" />
          <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
            {new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            <span className="mx-2 opacity-40">&middot;</span>
            {session.fileCount} {session.fileCount === 1 ? 'file' : 'files'} processed
          </p>
        </div>
        <div className="shrink-0 pt-1">
          <DownloadButtons
            sessionId={token}
            speakerName={session.speakerName}
            downloadUrl={(format) => `${ROUTES.API_SHARED_DOWNLOAD(token)}?format=${format}`}
          />
        </div>
      </div>

      {/* Tab bar */}
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

      {/* Tab panels */}
      {activeTab === 'questions' && session.output && (
        <div className="animate-fade-up-delay-1">
          <OutputPreview output={session.output} />
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="animate-fade-up">
          <AnalysisPanelLeft
            sessionId={token}
            analysis={analysis}
            loading={analysisLoading}
            readOnly
          />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="animate-fade-up">
          <AnalysisPanelRight
            analysis={analysis}
            loading={analysisLoading}
          />
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[var(--border-accent)] pt-6 mt-4">
        <p className="text-xs text-[var(--text-muted)] text-center font-[family-name:var(--font-dm-sans)]">
          Generated with {APP_NAME}
        </p>
      </div>
    </div>
  )
}

/**
 * This is the Next.js page component for the shared session view, acting as the entry point for the dynamic route `app/(public)/shared/[token]/page.tsx`.
 * It is used to wrap the `SharedContent` component within a `Suspense` boundary, providing a loading fallback UI during the initial rendering and data fetching phases of the `SharedContent` component. This improves the user experience by showing an immediate loading indicator.
 * It renders a simple 'Loading...' message as a fallback while the `SharedContent` component, marked with "use client", performs its initial client-side operations, including data fetching.
 */
export default function SharedSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <SharedContent />
    </Suspense>
  )
}
