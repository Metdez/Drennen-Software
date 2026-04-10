/**
 * Session comparison page (`/compare?a=<sessionId>&b=<sessionId>`).
 *
 * Side-by-side comparison of two sessions across six tabs:
 * - Overview: stat cards and key differences preview
 * - Themes: ThemeVenn (shared / exclusive themes)
 * - Quality: QualityComparison (tier distribution per session)
 * - Sentiment: SentimentComparison (aspirational, curious, personal, critical %)
 * - Participation: ParticipationDelta (students in both / only one session)
 * - AI Analysis: ComparativeNarrative (Gemini deep-dive)
 *
 * Data: fetched from `GET /api/compare?a=...&b=...`. Results are cached in
 * `sessionStorage` under `comparison_<sortedIds>` to avoid repeat calls.
 *
 * AI Analysis is generated on demand via `POST /api/compare/analysis`.
 * A share button uses `ComparisonShareButton` to create a public share token.
 *
 * Wrapped in Suspense because it reads from `useSearchParams`.
 */
'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { ComparisonHeader } from '@/components/compare/ComparisonHeader'
import { ThemeVenn } from '@/components/compare/ThemeVenn'
import { QualityComparison } from '@/components/compare/QualityComparison'
import { SentimentComparison } from '@/components/compare/SentimentComparison'
import { ParticipationDelta } from '@/components/compare/ParticipationDelta'
import { ComparativeNarrative } from '@/components/compare/ComparativeNarrative'
import { ComparisonShareButton } from '@/components/compare/ComparisonShareButton'
import type { SessionComparisonData, ComparativeAnalysis, SavedComparison } from '@/types'

/**
 * Defines the possible keys for the comparison tabs.
 * Why it is used: Provides type safety and restricts the 'activeTab' state to a predefined set of values, making the component more robust and readable.
 * Important implementation details: It's a union type of string literals, directly mapping to the available content sections in the comparison view.
 */
type Tab = 'overview' | 'themes' | 'quality' | 'sentiment' | 'participation' | 'analysis'

/**
 * An array of objects, each representing a tab in the comparison view.
 * Why it is used: To easily render the navigation tabs and manage their labels and corresponding keys. It centralizes the tab configuration, making it easy to add, remove, or reorder tabs.
 * Important implementation details: Each object contains a 'key' (matching the 'Tab' type) and a 'label' for display. This array is mapped over to render the tab buttons.
 */
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'themes', label: 'Themes' },
  { key: 'quality', label: 'Quality' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'participation', label: 'Participation' },
  { key: 'analysis', label: 'AI Analysis' },
]

/**
 * The main client-side component responsible for fetching, displaying, and managing the comparison data between two sessions.
 * Why it is used: It orchestrates the entire comparison view, handling data loading, state management for tabs, AI analysis generation, and rendering different comparison components based on the active tab.
 * Important implementation details:
 * - Uses 'useSearchParams' to get 'idA' and 'idB' from the URL, which are crucial for fetching comparison data.
 * - Implements client-side data fetching using 'useEffect' and caches data in 'sessionStorage' to prevent re-fetching on navigation within the same session.
 * - Manages multiple states: 'data', 'aiAnalysis', 'comparisonId', 'activeTab', 'loading', 'isGenerating', and 'error'.
 * - 'handleGenerateAnalysis' is a 'useCallback' function to generate AI-powered comparative analysis, also updating the 'sessionStorage' cache.
 * - Renders different components ('ThemeVenn', 'QualityComparison', etc.) conditionally based on the 'activeTab' state.
 * - Includes initial checks for missing IDs and loading/error states, displaying user-friendly messages or a skeleton.
 */
function CompareContent() {
  const searchParams = useSearchParams()
  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const [data, setData] = useState<SessionComparisonData | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<ComparativeAnalysis | null>(null)
  const [comparisonId, setComparisonId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!idA || !idB) return
    setLoading(true)

    // Check sessionStorage cache first
    const cacheKey = `comparison_${[idA, idB].sort().join('_')}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { data: SessionComparisonData; analysis: ComparativeAnalysis | null; comparisonId: string | null }
        setData(parsed.data)
        setAiAnalysis(parsed.analysis)
        setComparisonId(parsed.comparisonId)
        setLoading(false)
        return
      } catch { /* ignore corrupt cache */ }
    }

    fetch(`${ROUTES.API_COMPARE}?a=${idA}&b=${idB}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load comparison data')
        return res.json()
      })
      .then((result: SessionComparisonData) => {
        setData(result)
        if (result.savedComparison) {
          setAiAnalysis(result.savedComparison.aiComparison)
          setComparisonId(result.savedComparison.id)
        }
        // Cache in sessionStorage
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          analysis: result.savedComparison?.aiComparison ?? null,
          comparisonId: result.savedComparison?.id ?? null,
        }))
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
  }, [idA, idB])

  const handleGenerateAnalysis = useCallback(async () => {
    if (!idA || !idB || isGenerating) return
    setIsGenerating(true)
    try {
      const res = await fetch(ROUTES.API_COMPARE_ANALYSIS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionIdA: idA, sessionIdB: idB }),
      })
      if (!res.ok) throw new Error('Failed to generate analysis')
      const { comparison } = (await res.json()) as { comparison: SavedComparison }
      setAiAnalysis(comparison.aiComparison)
      setComparisonId(comparison.id)

      // Update cache
      const cacheKey = `comparison_${[idA, idB].sort().join('_')}`
      if (data) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data,
          analysis: comparison.aiComparison,
          comparisonId: comparison.id,
        }))
      }
    } catch (err) {
      console.error('Analysis generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [idA, idB, isGenerating, data])

  if (!idA || !idB) {
    return (
      <div className="py-16 text-center text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Missing session IDs. Go back to <Link href={ROUTES.HISTORY} className="text-[#f36f21] hover:underline">History</Link> and select two sessions.
      </div>
    )
  }

  if (loading) return <LoadingSkeleton />

  if (error || !data) {
    return (
      <div className="py-16 text-center text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
        {error ?? 'Failed to load comparison data'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link + share */}
      <div className="flex items-center justify-between">
        <Link href={ROUTES.HISTORY} className="text-sm text-[var(--text-muted)] hover:text-[#f36f21] transition-colors font-[family-name:var(--font-dm-sans)]">
          ← Back to History
        </Link>
        <ComparisonShareButton comparisonId={comparisonId} />
      </div>

      {/* Header */}
      <ComparisonHeader sessionA={data.a.session} sessionB={data.b.session} />

      {/* Tab bar */}
      <div className="border-b border-[var(--border)]">
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium font-[family-name:var(--font-dm-sans)] transition-colors relative ${
                activeTab === tab.key
                  ? 'text-[#f36f21]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f36f21]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab data={data} aiAnalysis={aiAnalysis} />
        )}
        {activeTab === 'themes' && (
          <ThemeVenn
            themeOverlap={data.themeOverlap}
            speakerA={data.a.session.speakerName}
            speakerB={data.b.session.speakerName}
          />
        )}
        {activeTab === 'quality' && (
          <QualityComparison
            tierDataA={data.a.tierData}
            tierDataB={data.b.tierData}
            speakerA={data.a.session.speakerName}
            speakerB={data.b.session.speakerName}
            onGenerate={handleGenerateAnalysis}
            isGenerating={isGenerating}
          />
        )}
        {activeTab === 'sentiment' && (
          <SentimentComparison
            sentimentA={data.a.analysis?.sentiment ?? null}
            sentimentB={data.b.analysis?.sentiment ?? null}
            speakerA={data.a.session.speakerName}
            speakerB={data.b.session.speakerName}
          />
        )}
        {activeTab === 'participation' && (
          <ParticipationDelta
            delta={data.participationDelta}
            speakerA={data.a.session.speakerName}
            speakerB={data.b.session.speakerName}
          />
        )}
        {activeTab === 'analysis' && (
          <ComparativeNarrative
            analysis={aiAnalysis}
            onGenerate={handleGenerateAnalysis}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Renders the "Overview" tab content for the comparison page, displaying key statistics and a preview of AI-generated key differences.
 * Why it is used: To provide a high-level summary of the comparison between two sessions at a glance, serving as the default landing tab.
 * Important implementation details:
 * - Receives 'SessionComparisonData' and 'ComparativeAnalysis' as props.
 * - Calculates and displays various statistics like submission count, theme count, student overlap, and dominant sentiment.
 * - Uses a structured 'stats' array to define and render stat cards dynamically.
 * - Conditionally renders a preview of up to 3 "Key Differences" if 'aiAnalysis' is available.
 * - Leverages 'getTopSentiment' helper for sentiment display.
 */
function OverviewTab({ data, aiAnalysis }: { data: SessionComparisonData; aiAnalysis: ComparativeAnalysis | null }) {
  const { a, b, themeOverlap, participationDelta } = data

  const stats = [
    {
      label: 'Submissions',
      valueA: `${a.studentNames.length} students`,
      valueB: `${b.studentNames.length} students`,
    },
    {
      label: 'Themes',
      valueA: `${a.themes.length} themes`,
      valueB: `${b.themes.length} themes`,
      extra: `${themeOverlap.shared.length} shared`,
    },
    {
      label: 'Student Overlap',
      valueA: '',
      valueB: '',
      extra: `${participationDelta.bothSessions.length} of ${participationDelta.totalUnique} in both`,
    },
    {
      label: 'Dominant Sentiment',
      valueA: a.analysis?.sentiment ? getTopSentiment(a.analysis.sentiment) : '—',
      valueB: b.analysis?.sentiment ? getTopSentiment(b.analysis.sentiment) : '—',
    },
  ]

  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
              {stat.label}
            </div>
            {stat.valueA || stat.valueB ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#f36f21]">{stat.valueA}</span>
                {stat.valueA && stat.valueB && <span className="text-xs text-[var(--text-muted)]">vs</span>}
                <span className="text-sm font-semibold text-[#542785]">{stat.valueB}</span>
              </div>
            ) : null}
            {stat.extra && (
              <div className="text-sm font-semibold text-[var(--text-primary)] mt-1">{stat.extra}</div>
            )}
          </div>
        ))}
      </div>

      {/* Key differences preview */}
      {aiAnalysis && aiAnalysis.key_differences.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3">
            Key Differences
          </h3>
          <div className="space-y-2">
            {aiAnalysis.key_differences.slice(0, 3).map((diff, i) => (
              <div key={i} className="rounded-lg px-4 py-3" style={{ background: 'var(--surface-elevated)' }}>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{diff.title}</span>
                <span className="text-sm text-[var(--text-secondary)]"> — {diff.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * A utility function that determines and formats the dominant sentiment from a given sentiment object.
 * Why it is used: To present the most prominent sentiment in a human-readable format, including its percentage, for display in components like 'OverviewTab'.
 * Important implementation details:
 * - Takes an object with sentiment categories (aspirational, curious, personal, critical) and their percentages.
 * - Converts the object to an array of '[key, value]' pairs, sorts them in descending order by percentage, and returns the formatted string of the top sentiment.
 * - Handles capitalization of the sentiment label.
 */
function getTopSentiment(sentiment: { aspirational: number; curious: number; personal: number; critical: number }): string {
  const entries = Object.entries(sentiment) as Array<[string, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1) + ` (${entries[0][1]}%)`
}

/**
 * Renders a visual placeholder (skeleton loading animation) to indicate that content is being loaded.
 * Why it is used: To improve user experience by providing immediate visual feedback during data fetching, preventing a blank screen and signaling that content is on its way.
 * Important implementation details:
 * - Uses Tailwind CSS classes like 'animate-pulse' and 'bg-[var(--surface-elevated)]' to create the animated gray boxes.
 * - Mimics the layout structure of the 'CompareContent' and 'OverviewTab' to provide a sense of the incoming content's shape.
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--surface-elevated)]" />
      <div className="flex items-center gap-8">
        <div className="flex-1 text-right space-y-2">
          <div className="h-8 w-48 rounded bg-[var(--surface-elevated)] ml-auto" />
          <div className="h-4 w-32 rounded bg-[var(--surface-elevated)] ml-auto" />
        </div>
        <div className="h-16 w-px bg-[var(--border)]" />
        <div className="flex-1 space-y-2">
          <div className="h-8 w-48 rounded bg-[var(--surface-elevated)]" />
          <div className="h-4 w-32 rounded bg-[var(--surface-elevated)]" />
        </div>
      </div>
      <div className="h-10 w-full rounded bg-[var(--surface-elevated)]" />
      <div className="grid grid-cols-2 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl bg-[var(--surface-elevated)]" />
        ))}
      </div>
    </div>
  )
}

/**
 * The root component for the comparison page, responsible for setting up client-side rendering and handling suspense for initial loading.
 * Why it is used: It's the entry point for this specific page route ('/compare'). It wraps the main 'CompareContent' with a 'Suspense' boundary to show a loading skeleton during the initial render or data fetching, ensuring a smooth user experience.
 * Important implementation details:
 * - Marked with ''use client'' at the file level, indicating this component and its children run on the client.
 * - Utilizes React's 'Suspense' feature, passing 'LoadingSkeleton' as the 'fallback' prop. This ensures that 'CompareContent' only renders once its client-side dependencies (like 'useSearchParams') are ready, or during initial data fetching if the content component itself handles loading.
 */
export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CompareContent />
    </Suspense>
  )
}
