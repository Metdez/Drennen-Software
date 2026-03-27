'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SemesterReport, ReportContent } from '@/types'

import { ExecutiveSummary } from '@/components/report/ExecutiveSummary'
import { SemesterGlance } from '@/components/report/SemesterGlance'
import { SessionSummaries } from '@/components/report/SessionSummaries'
import { ThemeEvolution } from '@/components/report/ThemeEvolution'
import { StudentEngagement } from '@/components/report/StudentEngagement'
import { StudentGrowth } from '@/components/report/StudentGrowth'
import { QuestionQuality } from '@/components/report/QuestionQuality'
import { BlindSpots } from '@/components/report/BlindSpots'
import { SpeakerEffectiveness } from '@/components/report/SpeakerEffectiveness'
import { AppendixRoster } from '@/components/report/AppendixRoster'

interface TocEntry {
  id: string
  label: string
}

const SECTION_META: Record<string, { id: string; label: string }> = {
  executive_summary: { id: 'executive-summary', label: 'Executive Summary' },
  semester_at_a_glance: { id: 'semester-at-a-glance', label: 'Semester at a Glance' },
  session_summaries: { id: 'session-summaries', label: 'Session Summaries' },
  theme_evolution: { id: 'theme-evolution', label: 'Theme Evolution' },
  student_engagement: { id: 'student-engagement', label: 'Student Engagement' },
  student_growth: { id: 'student-growth', label: 'Student Growth' },
  question_quality: { id: 'question-quality', label: 'Question Quality' },
  blind_spots: { id: 'blind-spots', label: 'Blind Spots' },
  speaker_effectiveness: { id: 'speaker-effectiveness', label: 'Speaker Effectiveness' },
  appendix_roster: { id: 'appendix-roster', label: 'Appendix: Full Roster' },
}

// Ordered list of section keys for consistent rendering
const SECTION_ORDER = [
  'executive_summary',
  'semester_at_a_glance',
  'session_summaries',
  'theme_evolution',
  'student_engagement',
  'student_growth',
  'question_quality',
  'blind_spots',
  'speaker_effectiveness',
  'appendix_roster',
] as const

export default function ReportPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<SemesterReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

  useEffect(() => {
    if (!params.id) {
      setError('No report ID provided')
      setLoading(false)
      return
    }

    async function fetchReport() {
      try {
        const res = await fetch(ROUTES.API_REPORT(params.id))
        if (res.status === 401) {
          router.push(ROUTES.LOGIN)
          return
        }
        if (res.status === 404) {
          router.push(ROUTES.DASHBOARD)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch report')
        const data = await res.json()
        if (!data.report) {
          router.push(ROUTES.DASHBOARD)
          return
        }
        setReport(data.report)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [params.id, router])

  // Build table of contents from included sections
  const toc = useMemo<TocEntry[]>(() => {
    if (!report) return []
    return SECTION_ORDER
      .filter((key) => report.content[key as keyof ReportContent] != null)
      .map((key) => SECTION_META[key])
      .filter((entry): entry is TocEntry => entry != null)
  }, [report])

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!report || downloading) return
    setDownloading(format)
    try {
      const res = await fetch(ROUTES.API_REPORT_DOWNLOAD(report.id) + `?format=${format}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${report.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // non-fatal
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <LoadingSkeleton />

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
          {error ?? 'Report not found'}
        </p>
        <Link
          href={ROUTES.DASHBOARD}
          className="text-[var(--brand-orange)] hover:underline text-sm font-medium font-[family-name:var(--font-dm-sans)]"
        >
          &larr; Return to Dashboard
        </Link>
      </div>
    )
  }

  const content = report.content
  const dateRange = report.config.dateRange

  return (
    <>
      {/* Print-friendly styles */}
      <style jsx global>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          main { max-width: 100% !important; padding: 0 !important; }
          section { break-inside: avoid; page-break-inside: avoid; }
          .report-card { border: 1px solid #e5e7eb !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="flex flex-col gap-6 font-[family-name:var(--font-dm-sans)]">
        {/* Back link */}
        <Link
          href={ROUTES.REPORTS}
          className="no-print inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors duration-200 w-fit"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          All Reports
        </Link>

        {/* Header */}
        <div className="animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
                {report.title}
              </h1>
              <div className="h-0.5 w-16 mb-3" style={{ backgroundColor: BRAND.ORANGE }} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                {dateRange && (
                  <span>
                    {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {' \u2013 '}
                    {new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
                <span className="opacity-40">&middot;</span>
                <span>
                  Generated {new Date(content.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="opacity-40">&middot;</span>
                <span>{report.sessionIds.length} session{report.sessionIds.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Download buttons */}
            <div className="no-print shrink-0 pt-1 flex items-center gap-2">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors duration-200 disabled:opacity-50"
                style={{
                  color: BRAND.ORANGE,
                  borderColor: BRAND.ORANGE,
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {downloading === 'pdf' ? 'Downloading...' : 'PDF'}
              </button>
              <button
                onClick={() => handleDownload('docx')}
                disabled={downloading !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors duration-200 disabled:opacity-50"
                style={{
                  color: BRAND.PURPLE,
                  borderColor: BRAND.PURPLE,
                }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {downloading === 'docx' ? 'Downloading...' : 'DOCX'}
              </button>
            </div>
          </div>
        </div>

        {/* Table of contents */}
        {toc.length > 1 && (
          <nav className="no-print animate-fade-up-delay-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3">Table of Contents</h2>
            <ol className="space-y-1.5">
              {toc.map((entry, i) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    className="text-sm text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors"
                  >
                    <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
                    {entry.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {/* Report sections */}
        <div className="animate-fade-up-delay-2 space-y-10">
          {content.executive_summary && (
            <ExecutiveSummary data={content.executive_summary} />
          )}
          {content.semester_at_a_glance && (
            <SemesterGlance data={content.semester_at_a_glance} />
          )}
          {content.session_summaries && (
            <SessionSummaries data={content.session_summaries} />
          )}
          {content.theme_evolution && (
            <ThemeEvolution data={content.theme_evolution} />
          )}
          {content.student_engagement && (
            <StudentEngagement data={content.student_engagement} />
          )}
          {content.student_growth && (
            <StudentGrowth data={content.student_growth} />
          )}
          {content.question_quality && (
            <QuestionQuality data={content.question_quality} />
          )}
          {content.blind_spots && (
            <BlindSpots data={content.blind_spots} />
          )}
          {content.speaker_effectiveness && (
            <SpeakerEffectiveness data={content.speaker_effectiveness} />
          )}
          {content.appendix_roster && (
            <AppendixRoster data={content.appendix_roster} />
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[var(--text-muted)] py-6 border-t border-[var(--border)]">
          Generated by Drennen MGMT 305 &middot; {new Date(content.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-up">
      <div className="h-10 w-64 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
      <div className="h-4 w-48 rounded bg-[var(--surface-elevated)] animate-pulse" />
      <div className="flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-32 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
      ))}
    </div>
  )
}
