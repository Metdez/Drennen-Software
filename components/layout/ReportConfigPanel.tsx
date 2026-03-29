'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AnalyticsData } from '@/types'
import { ROUTES } from '@/lib/constants'

const REPORT_SECTIONS = [
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'semester_at_a_glance', label: 'Semester at a Glance' },
  { key: 'session_summaries', label: 'Session-by-Session Summary' },
  { key: 'theme_evolution', label: 'Theme Evolution Analysis' },
  { key: 'student_engagement', label: 'Student Engagement Analysis' },
  { key: 'student_growth', label: 'Student Growth Highlights' },
  { key: 'question_quality', label: 'Question Quality Trends' },
  { key: 'blind_spots', label: 'Blind Spots & Recommendations' },
  { key: 'speaker_effectiveness', label: 'Speaker Effectiveness Ranking' },
  { key: 'appendix_roster', label: 'Appendix: Student Roster' },
] as const

function deriveDefaultTitle(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed
  // Aug-Dec = Fall, Jan-May = Spring, Jun-Jul = Summer
  let semester: string
  if (month >= 7) {
    semester = `Fall ${year}`
  } else if (month >= 5) {
    semester = `Summer ${year}`
  } else {
    semester = `Spring ${year}`
  }
  return `MGMT 305 — ${semester}`
}

function formatDateForInput(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

interface ReportConfigPanelProps {
  isOpen: boolean
  onClose: () => void
  analyticsData: AnalyticsData | null
}

export function ReportConfigPanel({ isOpen, onClose, analyticsData }: ReportConfigPanelProps) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)

  const [title, setTitle] = useState(deriveDefaultTitle)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState(todayString)
  const [includedSections, setIncludedSections] = useState<string[]>(
    REPORT_SECTIONS.map(s => s.key)
  )
  const [customNotes, setCustomNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-populate date range from analytics data
  useEffect(() => {
    if (analyticsData && analyticsData.sessions.length > 0) {
      const sorted = [...analyticsData.sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      const earliest = sorted[0]
      if (earliest) {
        setStartDate(formatDateForInput(earliest.date))
      }
    }
  }, [analyticsData])

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  function toggleSection(key: string) {
    setIncludedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function toggleAll() {
    if (includedSections.length === REPORT_SECTIONS.length) {
      setIncludedSections([])
    } else {
      setIncludedSections(REPORT_SECTIONS.map(s => s.key))
    }
  }

  async function handleGenerate() {
    if (includedSections.length === 0) {
      setError('Select at least one section.')
      return
    }
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_REPORT_GENERATE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || deriveDefaultTitle(),
          dateRange: startDate && endDate ? { start: startDate, end: endDate } : null,
          includedSections,
          customNotes: customNotes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setError(json.error || `Failed to generate report (${res.status})`)
        return
      }
      router.push(ROUTES.REPORT(json.reportId ?? json.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">
              Generate Semester Report
            </h2>
            <div className="h-0.5 w-10 bg-[var(--brand-orange)] mt-1" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
              Report Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-orange)] font-[family-name:var(--font-dm-sans)]"
              placeholder="e.g. MGMT 305 — Spring 2026"
              disabled={generating}
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-xs text-[var(--text-muted)] mb-1">Start</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-orange)] font-[family-name:var(--font-dm-sans)]"
                  disabled={generating}
                />
              </div>
              <div>
                <span className="block text-xs text-[var(--text-muted)] mb-1">End</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-orange)] font-[family-name:var(--font-dm-sans)]"
                  disabled={generating}
                />
              </div>
            </div>
          </div>

          {/* Section checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                Sections to Include
              </label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-[var(--brand-orange)] hover:underline font-[family-name:var(--font-dm-sans)]"
                disabled={generating}
              >
                {includedSections.length === REPORT_SECTIONS.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] divide-y divide-[var(--border)]">
              {REPORT_SECTIONS.map((section, idx) => {
                const checked = includedSections.includes(section.key)
                return (
                  <label
                    key={section.key}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors ${
                      idx === 0 ? 'rounded-t-xl' : ''
                    } ${idx === REPORT_SECTIONS.length - 1 ? 'rounded-b-xl' : ''}`}
                  >
                    <div className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSection(section.key)}
                        disabled={generating}
                        className="sr-only"
                      />
                      <div
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                          checked
                            ? 'bg-[var(--brand-orange)] border-[var(--brand-orange)]'
                            : 'border-[var(--text-muted)] bg-transparent'
                        }`}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                      {idx + 1}. {section.label}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
              Custom Notes <span className="font-normal text-[var(--text-muted)]">(optional)</span>
            </label>
            <textarea
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              rows={3}
              className="w-full bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-orange)] resize-none font-[family-name:var(--font-dm-sans)]"
              placeholder="Add any notes or context for the AI to consider..."
              disabled={generating}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 font-[family-name:var(--font-dm-sans)]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--surface)] border-t border-[var(--border)] px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || includedSections.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--brand-orange)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-dm-sans)]"
          >
            {generating && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {/* Generating overlay */}
        {generating && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--surface)]/90 backdrop-blur-sm rounded-2xl">
            <svg className="h-10 w-10 animate-spin text-[var(--brand-orange)] mb-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
              Generating report...
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
              This may take up to 60 seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
