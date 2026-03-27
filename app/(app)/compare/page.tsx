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

type Tab = 'overview' | 'themes' | 'quality' | 'sentiment' | 'participation' | 'analysis'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'themes', label: 'Themes' },
  { key: 'quality', label: 'Quality' },
  { key: 'sentiment', label: 'Sentiment' },
  { key: 'participation', label: 'Participation' },
  { key: 'analysis', label: 'AI Analysis' },
]

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

function getTopSentiment(sentiment: { aspirational: number; curious: number; personal: number; critical: number }): string {
  const entries = Object.entries(sentiment) as Array<[string, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1) + ` (${entries[0][1]}%)`
}

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

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CompareContent />
    </Suspense>
  )
}
