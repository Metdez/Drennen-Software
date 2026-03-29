'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { ReportContent } from '@/types'

interface ReportData {
  id: string
  title: string
  content: ReportContent
  createdAt: string
}

export default function PortfolioReportDetailPage() {
  const params = useParams<{ token: string; reportId: string }>()
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/portfolio/${params.token}/reports/${params.reportId}`)
        if (!res.ok) return
        const data = await res.json()
        setReport(data)
      } catch {
        // non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [params.token, params.reportId])

  if (loading) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading report...</p>
  }

  if (!report) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Report not found.</p>
  }

  const { content } = report

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
        <Link href={`/portfolio/${params.token}`} className="hover:text-[var(--text-secondary)] transition-colors">Portfolio</Link>
        <span className="mx-2">›</span>
        <Link href={`/portfolio/${params.token}/reports`} className="hover:text-[var(--text-secondary)] transition-colors">Reports</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{report.title}</span>
      </nav>

      {/* Title */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          {report.title}
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
      </div>

      {/* Executive Summary */}
      {content.executive_summary && (
        <div
          className="rounded-xl p-6 animate-fade-up-delay-1"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">
            Executive Summary
          </h2>
          <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
            {content.executive_summary.narrative}
          </p>
        </div>
      )}

      {/* Semester at a Glance */}
      {content.semester_at_a_glance && (
        <div
          className="rounded-xl p-6 animate-fade-up-delay-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
            Semester at a Glance
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Sessions</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)]">{content.semester_at_a_glance.totalSessions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Students</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)]">{content.semester_at_a_glance.totalStudents}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Submissions</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)]">{content.semester_at_a_glance.totalSubmissions}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Avg/Session</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-playfair)] text-[var(--text-primary)]">{content.semester_at_a_glance.avgSubmissionsPerSession.toFixed(1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Session summaries */}
      {content.session_summaries && content.session_summaries.sessions.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
            Session Summaries
          </h2>
          <div className="flex flex-col gap-4">
            {content.session_summaries.sessions.map((s, i) => (
              <div key={i} className="pb-4" style={{ borderBottom: i < content.session_summaries!.sessions.length - 1 ? '1px solid var(--border)' : undefined }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">{s.speakerName}</p>
                  <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>{s.fileCount} files</span>
                </div>
                {s.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.themes.slice(0, 5).map((theme) => (
                      <span key={theme} className="text-xs rounded-full px-2 py-0.5 font-[family-name:var(--font-dm-sans)]" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>
                        {theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme evolution */}
      {content.theme_evolution && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">
            Theme Evolution
          </h2>
          <p className="text-sm leading-relaxed font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
            {content.theme_evolution.narrative}
          </p>
        </div>
      )}

      {/* Blind spots */}
      {content.blind_spots && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-3">
            Blind Spots
          </h2>
          <div className="flex flex-col gap-3">
            {content.blind_spots.blindSpots.map((spot, i) => (
              <div key={i}>
                <p className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">{spot.title}</p>
                <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{spot.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
