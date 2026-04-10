/**
 * Public portfolio session detail page (`/portfolio/[token]/sessions/[sessionId]`).
 *
 * Route group: `(public)` — no auth required.
 * Fetches `GET /api/portfolio/[token]/sessions/[sessionId]`, which returns
 * session metadata, AI output, analysis, debrief summary, and speaker brief
 * — all scoped to the portfolio's allowed session set.
 *
 * Tab structure (tabs built dynamically based on available data):
 * - Questions: always shown — the 10-section AI output via `OutputPreview`
 * - Analysis: theme clusters + tensions via `AnalysisPanelLeft` (read-only)
 * - Insights: suggestions, blind spots, sentiment via `AnalysisPanelRight`
 * - Debrief: shown only if `debrief.status === 'complete'` and `aiSummary` exists
 * - Speaker Brief: shown only if `brief` content is present
 *
 * Components: OutputPreview, AnalysisPanelLeft, AnalysisPanelRight (all in read-only mode)
 */
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { OutputPreview } from '@/components/session/OutputPreview'
import { AnalysisPanelLeft } from '@/components/analytics/AnalysisPanelLeft'
import { AnalysisPanelRight } from '@/components/analytics/AnalysisPanelRight'
import { ROUTES } from '@/lib/constants'
import type { SessionAnalysis, SpeakerBriefContent } from '@/types'

/**
 * What it does: Defines a union type representing the possible tabs available on the session detail page.
 * Why it is used: It ensures type safety and restricts the active tab state to a predefined set of values, making the component's state management more robust and readable.
 * Important implementation details: The literal string values ('questions', 'analysis', 'insights', 'debrief', 'brief') directly correspond to the keys used for rendering different content panels.
 */
type Tab = 'questions' | 'analysis' | 'insights' | 'debrief' | 'brief'

/**
 * What it does: Defines the structure of the data expected from the API when fetching session details for a specific portfolio session.
 * Why it is used: Provides a clear, type-safe contract for the session data, including core session information, associated analysis, debrief, and speaker brief content. This helps in understanding the data shape and prevents runtime errors related to missing or incorrectly typed properties.
 * Important implementation details: It includes nested objects for `session`, `analysis`, `debrief`, and `brief`, allowing for comprehensive display of all related information. Properties like `analysis`, `debrief`, and `brief` are explicitly marked as nullable (`| null`) to account for cases where this data might not be available.
 */
interface SessionDetail {
  session: {
    id: string
    speakerName: string
    createdAt: string
    fileCount: number
    output: string
  }
  themes: string[]
  analysis: SessionAnalysis | null
  debrief: { aiSummary: string | null; overallRating: number | null; status: string } | null
  brief: SpeakerBriefContent | null
}

/**
 * What it does: Formats an ISO 8601 date string into a more human-readable date string.
 * Why it is used: To display session creation dates in a user-friendly format on the UI, rather than the raw, less readable ISO string.
 * Important implementation details: It uses `Date.toLocaleDateString` with `en-US` locale and specific options (`year: 'numeric'`, `month: 'long'`, `day: 'numeric'`) to achieve a format like 'Month Day, Year'.
 */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * What it does: This is a Next.js page component responsible for displaying the detailed view of a single session within a user's portfolio.
 * Why it is used: It serves as the primary interface for users to review all aspects of a specific session, including submitted questions, AI analysis, insights, post-session debrief, and speaker brief content.
 * Important implementation details: It's a client-side component ('use client'). It uses `useEffect` to fetch session data asynchronously based on `token` and `sessionId` parameters from the URL. It manages loading, error, and detail states using `useState`. The page dynamically renders a tabbed interface, only showing tabs for which relevant data (e.g., debrief, brief) is available. It utilizes several sub-components like `OutputPreview`, `AnalysisPanelLeft`, and `AnalysisPanelRight` to display different sections of the session data.
 */
export default function PortfolioSessionDetailPage() {
  const params = useParams<{ token: string; sessionId: string }>()
  const [detail, setDetail] = useState<SessionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('questions')

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(ROUTES.API_PORTFOLIO_SESSION(params.token, params.sessionId))
        if (!res.ok) { setError(true); return }
        const data = await res.json()
        setDetail(data)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params.token, params.sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading session...</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">Session Not Found</h2>
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>This session may not be available in this portfolio.</p>
      </div>
    )
  }

  const { session, analysis, debrief, brief } = detail

  // Build tabs dynamically — only show tabs with data
  const tabs: { key: Tab; label: string }[] = [
    { key: 'questions', label: 'Questions' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'insights', label: 'Insights' },
  ]
  if (debrief && debrief.status === 'complete' && debrief.aiSummary) {
    tabs.push({ key: 'debrief', label: 'Debrief' })
  }
  if (brief) {
    tabs.push({ key: 'brief', label: 'Speaker Brief' })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
        <Link href={`/portfolio/${params.token}`} className="hover:text-[var(--text-secondary)] transition-colors">Portfolio</Link>
        <span className="mx-2">›</span>
        <Link href={`/portfolio/${params.token}/sessions`} className="hover:text-[var(--text-secondary)] transition-colors">Sessions</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{session.speakerName}</span>
      </nav>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          {session.speakerName}
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
          {formatDate(session.createdAt)} · {session.fileCount} submission{session.fileCount !== 1 ? 's' : ''}
        </p>
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
        <div className="animate-fade-up">
          <OutputPreview output={session.output} />
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="animate-fade-up">
          <AnalysisPanelLeft
            sessionId={session.id}
            analysis={analysis}
            loading={false}
            readOnly
          />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="animate-fade-up">
          <AnalysisPanelRight
            analysis={analysis}
            loading={false}
          />
        </div>
      )}

      {activeTab === 'debrief' && debrief && (
        <div className="animate-fade-up">
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
          >
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">
              Post-Session Debrief
            </h3>
            {debrief.overallRating && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                  Rating
                </span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className="text-lg"
                      style={{ color: star <= debrief.overallRating! ? '#f36f21' : 'var(--surface-hover)' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
            )}
            {debrief.aiSummary && (
              <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
                {debrief.aiSummary}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'brief' && brief && (
        <div className="animate-fade-up flex flex-col gap-4">
          {brief.narrative && (
            <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">Overview</h3>
              <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
                {brief.narrative}
              </p>
            </div>
          )}
          {brief.topThemes && brief.topThemes.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">Top Themes</h3>
              <div className="flex flex-col gap-3">
                {brief.topThemes.map((theme, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">{theme.title}</p>
                    <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{theme.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {brief.talkingPoints && brief.talkingPoints.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">Talking Points</h3>
              <div className="flex flex-col gap-3">
                {brief.talkingPoints.map((point, i) => (
                  <div key={i}>
                    <p className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">{point.point}</p>
                    <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{point.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
