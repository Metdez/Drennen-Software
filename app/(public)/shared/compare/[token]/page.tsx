/**
 * Public shared comparison page (`/shared/compare/[token]`).
 *
 * No-auth read-only view of a saved session comparison, accessed via a share token.
 * Mirrors the authenticated `/compare` page but omits the "Generate AI Analysis"
 * and share controls (the `onGenerate` callback is a no-op).
 *
 * Tabs: Overview, Themes, Quality, Sentiment, Participation, AI Analysis.
 * Same tab components as the authenticated compare page.
 *
 * Data: `GET /api/shared/compare/[token]` — returns `SessionComparisonData`
 * including savedComparison with pre-generated AI analysis if available.
 *
 * Components: ComparisonHeader, ThemeVenn, QualityComparison, SentimentComparison,
 *             ParticipationDelta, ComparativeNarrative
 */
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ComparisonHeader } from '@/components/compare/ComparisonHeader'
import { ThemeVenn } from '@/components/compare/ThemeVenn'
import { QualityComparison } from '@/components/compare/QualityComparison'
import { SentimentComparison } from '@/components/compare/SentimentComparison'
import { ParticipationDelta } from '@/components/compare/ParticipationDelta'
import { ComparativeNarrative } from '@/components/compare/ComparativeNarrative'
import { APP_NAME } from '@/lib/constants'
import type { SessionComparisonData, ComparativeAnalysis } from '@/types'

/**
 * Defines a union type representing the available navigation tabs on the comparison page.
 * Why it is used: Ensures type safety and provides a clear, restricted set of values for controlling the active comparison view.
 * Important implementation details: Includes tabs for 'overview', 'themes', 'quality', 'sentiment', 'participation', and 'analysis'.
 */
type Tab = 'overview' | 'themes' | 'quality' | 'sentiment' | 'participation' | 'analysis'

/**
 * An array of objects, each defining a navigation tab for the comparison page.
 * Why it is used: To dynamically render the tab bar, providing both a unique programmatic key and a user-friendly label for each comparison section.
 * Important implementation details: Each object has a `key` (of type `Tab`) used for internal state management and an `label` (string) for display in the UI. This array directly drives the rendering and interaction of the tab navigation.
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
 * This is the main page component responsible for displaying a shared comparison between two sessions.
 * Why it is used: It serves as the entry point for users to view a comparison report generated and shared by another user via a unique token. It orchestrates data fetching, state management, and the rendering of various comparison sub-components.
 * Important implementation details: It's a client-side component that uses `useEffect` to fetch comparison data from a Next.js API route (`/api/shared/compare/[token]`) based on the URL parameter. It manages loading, error, and active tab states. It conditionally renders different comparison visualizations (e.g., ThemeVenn, QualityComparison) based on the user's tab selection.
 */
export default function SharedComparePage() {
  const params = useParams()
  const token = params.token as string

  const [data, setData] = useState<SessionComparisonData | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<ComparativeAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/shared/compare/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('This comparison is no longer available')
        return res.json()
      })
      .then((result: SessionComparisonData) => {
        setData(result)
        if (result.savedComparison) {
          setAiAnalysis(result.savedComparison.aiComparison)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load')
        setLoading(false)
      })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="animate-pulse text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Loading comparison...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2 font-[family-name:var(--font-dm-sans)]">{error ?? 'Not found'}</p>
          <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            The link may have been revoked or the comparison deleted.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
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
          {activeTab === 'overview' && <SharedOverviewTab data={data} aiAnalysis={aiAnalysis} />}
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
              onGenerate={() => {}}
              isGenerating={false}
            />
          )}
        </div>

        {/* Footer */}
        <div className="pt-8 text-center">
          <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            Generated with {APP_NAME}
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * Renders the content for the 'Overview' tab within the shared comparison page, providing a summary of key metrics and AI-generated insights.
 * Why it is used: To offer users a quick, high-level understanding of the comparison, presenting essential statistics and notable differences at a glance.
 * Important implementation details: It receives `SessionComparisonData` and `ComparativeAnalysis` as props. It displays statistics such as submission counts, theme counts, and student overlap between the two sessions. If available, it also renders the first few key differences identified by the AI analysis, providing a concise summary of the comparison's most impactful insights.
 */
function SharedOverviewTab({ data, aiAnalysis }: { data: SessionComparisonData; aiAnalysis: ComparativeAnalysis | null }) {
  const { a, b, themeOverlap, participationDelta } = data

  const stats = [
    { label: 'Submissions', valueA: `${a.studentNames.length}`, valueB: `${b.studentNames.length}` },
    { label: 'Themes', valueA: `${a.themes.length}`, valueB: `${b.themes.length}`, extra: `${themeOverlap.shared.length} shared` },
    { label: 'Student Overlap', valueA: '', valueB: '', extra: `${participationDelta.bothSessions.length} of ${participationDelta.totalUnique}` },
  ]

  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <div key={stat.label} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">{stat.label}</div>
            {stat.valueA && stat.valueB ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#f36f21]">{stat.valueA}</span>
                <span className="text-xs text-[var(--text-muted)]">vs</span>
                <span className="text-sm font-semibold text-[#542785]">{stat.valueB}</span>
              </div>
            ) : null}
            {stat.extra && <div className="text-sm font-semibold text-[var(--text-primary)]">{stat.extra}</div>}
          </div>
        ))}
      </div>
      {aiAnalysis && aiAnalysis.key_differences.length > 0 && (
        <div className="space-y-2">
          {aiAnalysis.key_differences.slice(0, 3).map((diff, i) => (
            <div key={i} className="rounded-lg px-4 py-3" style={{ background: 'var(--surface-elevated)' }}>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{diff.title}</span>
              <span className="text-sm text-[var(--text-secondary)]"> — {diff.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
