'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { ROUTES } from '@/lib/constants'
import type { CohortComparisonData } from '@/types/comparison'

export default function CompareSemestersPage() {
  const { semesters, loading: semestersLoading } = useSemesterContext()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparisonData, setComparisonData] = useState<CohortComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleSemester = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleCompare = async () => {
    if (selectedIds.length < 2) return
    setLoading(true)
    setError(null)
    setComparisonData(null)

    try {
      const res = await fetch(ROUTES.API_SEMESTERS_COMPARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semesterIds: selectedIds }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error ?? 'Comparison failed')
      } else {
        setComparisonData(json as CohortComparisonData)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed')
    } finally {
      setLoading(false)
    }
  }

  if (semestersLoading) return <LoadingSkeleton />

  if (semesters.length < 2) {
    return (
      <div>
        <PageHeader />
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            You need at least 2 semesters to compare.{' '}
            <Link href={ROUTES.SEMESTERS} className="text-[var(--brand-orange)] hover:underline">
              Manage semesters
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader />

      {/* Semester Picker */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm mb-6 animate-fade-up-delay-1">
        <h3 className="font-[family-name:var(--font-playfair)] text-sm font-bold text-[var(--text-primary)] mb-3">
          Select Semesters to Compare
        </h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {semesters.map(sem => {
            const isSelected = selectedIds.includes(sem.id)
            return (
              <button
                key={sem.id}
                onClick={() => toggleSemester(sem.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border transition-all ${
                  isSelected
                    ? 'bg-[var(--brand-orange)] border-[var(--brand-orange)] text-white'
                    : 'bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-orange)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded border text-xs ${
                    isSelected
                      ? 'bg-white text-[var(--brand-orange)] border-white'
                      : 'border-[var(--text-muted)]'
                  }`}
                >
                  {isSelected && '\u2713'}
                </span>
                {sem.name}
                <span className={`text-xs ${isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                  {sem.sessionCount} session{sem.sessionCount !== 1 ? 's' : ''}
                </span>
              </button>
            )
          })}
        </div>
        <button
          onClick={handleCompare}
          disabled={selectedIds.length < 2 || loading}
          className="px-5 py-2.5 rounded-lg bg-[var(--brand-orange)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Comparing...' : `Compare ${selectedIds.length} Semester${selectedIds.length !== 1 ? 's' : ''}`}
        </button>
        {selectedIds.length < 2 && selectedIds.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-2">Select at least one more semester</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <ResultsSkeleton />}

      {/* Results */}
      {comparisonData && !loading && (
        <div className="space-y-6 animate-fade-up">
          {/* Stats Grid */}
          <StatsGrid semesters={comparisonData.semesters} />

          {/* Theme Persistence */}
          <ThemePersistenceTable
            themePersistence={comparisonData.themePersistence}
            semesters={comparisonData.semesters}
            selectedIds={selectedIds}
          />

          {/* AI Narrative */}
          {comparisonData.aiNarrative && (
            <AINarrativeCard narrative={comparisonData.aiNarrative} />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Header
// ---------------------------------------------------------------------------

function PageHeader() {
  return (
    <div className="mb-6 animate-fade-up">
      <div className="flex items-center gap-3 mb-2">
        <Link
          href={ROUTES.ANALYTICS}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Analytics
        </Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-sm text-[var(--text-secondary)]">Compare</span>
      </div>
      <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
        Compare Semesters
      </h1>
      <div className="h-0.5 w-12 bg-[var(--brand-orange)] mb-3" />
      <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
        See how student interests and engagement evolve across cohorts.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stats Grid
// ---------------------------------------------------------------------------

function StatsGrid({ semesters }: { semesters: CohortComparisonData['semesters'] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-1">
        Semester Overview
      </h3>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)] mb-4" />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">
                Metric
              </th>
              {semesters.map(sem => (
                <th
                  key={sem.id}
                  className="text-center py-2 px-3 text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium"
                >
                  {sem.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Sessions', accessor: (s: CohortComparisonData['semesters'][number]) => String(s.sessionCount) },
              { label: 'Unique Students', accessor: (s: CohortComparisonData['semesters'][number]) => String(s.studentCount) },
              { label: 'Avg Submissions / Session', accessor: (s: CohortComparisonData['semesters'][number]) => String(s.avgSubmissions) },
            ].map(row => (
              <tr key={row.label} className="border-b border-[rgba(255,255,255,0.03)]">
                <td className="py-3 pr-4 text-[var(--text-secondary)] font-medium">{row.label}</td>
                {semesters.map(sem => (
                  <td key={sem.id} className="py-3 px-3 text-center text-[var(--text-primary)] font-bold text-lg">
                    {row.accessor(sem)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-3 pr-4 text-[var(--text-secondary)] font-medium align-top">Top Themes</td>
              {semesters.map(sem => (
                <td key={sem.id} className="py-3 px-3 text-center">
                  <div className="flex flex-wrap justify-center gap-1">
                    {sem.topThemes.length > 0 ? (
                      sem.topThemes.map(theme => (
                        <span
                          key={theme}
                          className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-[rgba(255,107,0,0.1)] border border-[rgba(255,107,0,0.2)] text-[#fb923c]"
                        >
                          {theme}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[var(--text-muted)] italic">No themes</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Theme Persistence Table
// ---------------------------------------------------------------------------

function ThemePersistenceTable({
  themePersistence,
  semesters,
  selectedIds,
}: {
  themePersistence: CohortComparisonData['themePersistence']
  semesters: CohortComparisonData['semesters']
  selectedIds: string[]
}) {
  if (themePersistence.length === 0) return null

  const totalSelected = selectedIds.length

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
      <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-1">
        Theme Persistence Across Semesters
      </h3>
      <div className="h-0.5 w-10 bg-[rgba(130,80,255,0.6)] mb-2" />
      <p className="text-xs text-[var(--text-muted)] mb-4">
        Green = appears in all selected semesters, orange = some, gray = one only
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 pr-4 text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">
                Theme
              </th>
              {semesters.map(sem => (
                <th
                  key={sem.id}
                  className="text-center py-2 px-3 text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium"
                >
                  {sem.name}
                </th>
              ))}
              <th className="text-center py-2 px-3 text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {themePersistence.slice(0, 25).map(tp => {
              const semCount = tp.semesterIds.length
              const colorClass =
                semCount >= totalSelected
                  ? 'text-[var(--brand-green)]'
                  : semCount > 1
                  ? 'text-[var(--brand-orange)]'
                  : 'text-[var(--text-muted)]'

              return (
                <tr key={tp.theme} className="border-b border-[rgba(255,255,255,0.03)]">
                  <td className={`py-2.5 pr-4 font-medium ${colorClass}`}>
                    {tp.theme}
                  </td>
                  {semesters.map(sem => {
                    const present = tp.semesterIds.includes(sem.id)
                    return (
                      <td key={sem.id} className="py-2.5 px-3 text-center">
                        {present ? (
                          <span className={`font-bold ${colorClass}`}>{'\u2713'}</span>
                        ) : (
                          <span className="text-[var(--text-muted)]">{'\u2014'}</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-2.5 px-3 text-center text-[var(--text-primary)] font-medium">
                    {tp.totalOccurrences}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {themePersistence.length > 25 && (
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Showing top 25 of {themePersistence.length} themes
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Narrative Card
// ---------------------------------------------------------------------------

function AINarrativeCard({ narrative }: { narrative: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--brand-orange)]">{'\u2726'}</span>
        <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)]">
          AI Cross-Cohort Analysis
        </h3>
      </div>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)] mb-4" />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {narrative}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-10 w-64 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
      <div className="h-4 w-48 rounded bg-[var(--surface-elevated)] animate-pulse" />
      <div className="h-32 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-48 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
      ))}
    </div>
  )
}
