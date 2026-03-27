"use client"

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ROUTES } from '@/lib/constants'
import { formatBriefAsText } from '@/lib/export/briefText'
import type { SpeakerBrief, SpeakerBriefContent } from '@/types'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
  </svg>
)

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

// ---------------------------------------------------------------------------
// Section Card
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  editing,
  onToggleEdit,
  children,
}: {
  title: string
  editing: boolean
  onToggleEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-accent)] bg-[var(--surface-elevated)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] tracking-wide uppercase">
          {title}
        </h3>
        <button
          onClick={onToggleEdit}
          className={`p-1.5 rounded-md transition-colors duration-200 ${
            editing
              ? 'text-[#0f6b37] bg-[rgba(15,107,55,0.1)]'
              : 'text-[var(--text-muted)] hover:text-[#f36f21] hover:bg-[rgba(243,111,33,0.08)]'
          }`}
          title={editing ? 'Done editing' : 'Edit section'}
        >
          {editing ? <CheckIcon /> : <PencilIcon />}
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brief Content Component
// ---------------------------------------------------------------------------

function BriefContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [brief, setBrief] = useState<SpeakerBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editedContent, setEditedContent] = useState<SpeakerBriefContent | null>(null)
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }
    async function fetchBrief() {
      try {
        const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId!))
        if (!res.ok) throw new Error('Failed to fetch brief')
        const data = await res.json()
        if (!data.brief) {
          setError('No speaker brief found for this session.')
          return
        }
        setBrief(data.brief)
        setEditedContent(data.brief.editedContent ?? data.brief.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brief')
      } finally {
        setLoading(false)
      }
    }
    fetchBrief()
  }, [sessionId])

  const activeContent = editedContent ?? brief?.content

  const hasChanges = brief && editedContent
    ? JSON.stringify(editedContent) !== JSON.stringify(brief.content)
    : false

  const hasEditsStored = brief?.editedContent !== null && brief?.editedContent !== undefined

  const toggleSection = useCallback((section: string) => {
    setEditingSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  function updateField<K extends keyof SpeakerBriefContent>(
    key: K,
    value: SpeakerBriefContent[K]
  ) {
    setEditedContent((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updateTheme(index: number, field: 'title' | 'description', value: string) {
    if (!editedContent) return
    const themes = [...editedContent.topThemes]
    themes[index] = { ...themes[index], [field]: value }
    updateField('topThemes', themes)
  }

  function updateTalkingPoint(index: number, field: 'point' | 'rationale', value: string) {
    if (!editedContent) return
    const points = [...editedContent.talkingPoints]
    points[index] = { ...points[index], [field]: value }
    updateField('talkingPoints', points)
  }

  async function handleSave() {
    if (!sessionId || !editedContent) return
    setSaving(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent }),
      })
      if (!res.ok) throw new Error('Failed to save edits')
      setBrief((prev) =>
        prev ? { ...prev, editedContent, updatedAt: new Date().toISOString() } : prev
      )
      setEditingSections(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!sessionId || !brief) return
    setSaving(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_BRIEF(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent: null }),
      })
      if (!res.ok) throw new Error('Failed to reset')
      setEditedContent(brief.content)
      setBrief((prev) => (prev ? { ...prev, editedContent: null } : prev))
      setEditingSections(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  async function handleCopyText() {
    if (!activeContent) return
    try {
      const text = formatBriefAsText(activeContent)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Failed to copy to clipboard')
    }
  }

  async function handleDownloadPdf() {
    if (!sessionId) return
    setDownloading(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_BRIEF_DOWNLOAD(sessionId))
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Speaker_Brief.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading brief...
      </div>
    )
  }

  if (error || !sessionId || !activeContent) {
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

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href={`${ROUTES.PREVIEW}?sessionId=${sessionId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 w-fit font-[family-name:var(--font-dm-sans)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Session
      </Link>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-1">
          Speaker Prep Brief
        </h1>
        <div className="h-0.5 w-16 bg-[#0f6b37] mb-3" />
        <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          {activeContent.header.speakerName}
          <span className="mx-2 opacity-40">·</span>
          {activeContent.header.date}
          <span className="mx-2 opacity-40">·</span>
          {activeContent.header.studentCount} submissions
        </p>
      </div>

      {/* Action bar */}
      <div className="animate-fade-up flex items-center gap-3 flex-wrap">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#f36f21] hover:bg-[#d85e18] transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)]"
        >
          {downloading ? <SpinnerIcon /> : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>

        <button
          onClick={handleCopyText}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] border ${
            copied
              ? 'border-[#0f6b37] text-[#5e9e6e] bg-[rgba(15,107,55,0.08)]'
              : 'border-[#542785] text-[#a87dd6] hover:bg-[rgba(84,39,133,0.15)]'
          }`}
          style={copied ? undefined : { background: 'var(--surface)' }}
        >
          {copied ? <CheckIcon /> : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
          )}
          {copied ? 'Copied!' : 'Copy as Text'}
        </button>

        {(hasChanges || hasEditsStored) && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0f6b37] hover:bg-[#0a5a2e] transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <SpinnerIcon /> : <CheckIcon />}
            {saving ? 'Saving...' : 'Save Edits'}
          </button>
        )}

        {(hasChanges || hasEditsStored) && (
          <button
            onClick={handleReset}
            disabled={saving}
            className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-40"
          >
            Reset to Original
          </button>
        )}
      </div>

      {/* Brief sections */}
      <div className="flex flex-col gap-4 animate-fade-up-delay-1">
        {/* Narrative */}
        <SectionCard
          title="What Students Care About"
          editing={editingSections.has('narrative')}
          onToggleEdit={() => toggleSection('narrative')}
        >
          {editingSections.has('narrative') ? (
            <textarea
              value={activeContent.narrative}
              onChange={(e) => updateField('narrative', e.target.value)}
              rows={5}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : (
            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-wrap">
              {activeContent.narrative}
            </p>
          )}
        </SectionCard>

        {/* Top Themes */}
        <SectionCard
          title="Top Themes"
          editing={editingSections.has('themes')}
          onToggleEdit={() => toggleSection('themes')}
        >
          {editingSections.has('themes') ? (
            <div className="flex flex-col gap-3">
              {activeContent.topThemes.map((theme, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <input
                    value={theme.title}
                    onChange={(e) => updateTheme(i, 'title', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#f36f21]"
                    placeholder="Theme title"
                  />
                  <textarea
                    value={theme.description}
                    onChange={(e) => updateTheme(i, 'description', e.target.value)}
                    rows={2}
                    className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] resize-y focus:outline-none focus:border-[#f36f21]"
                    placeholder="Theme description"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeContent.topThemes.map((theme, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f36f21] mt-2 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                      {theme.title}
                    </span>
                    <span className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                      {' — '}{theme.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Talking Points */}
        <SectionCard
          title="Suggested Talking Points"
          editing={editingSections.has('talkingPoints')}
          onToggleEdit={() => toggleSection('talkingPoints')}
        >
          {editingSections.has('talkingPoints') ? (
            <div className="flex flex-col gap-3">
              {activeContent.talkingPoints.map((tp, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#f36f21] font-[family-name:var(--font-dm-sans)]">{i + 1}.</span>
                    <input
                      value={tp.point}
                      onChange={(e) => updateTalkingPoint(i, 'point', e.target.value)}
                      className="flex-1 bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#f36f21]"
                      placeholder="Talking point"
                    />
                  </div>
                  <textarea
                    value={tp.rationale}
                    onChange={(e) => updateTalkingPoint(i, 'rationale', e.target.value)}
                    rows={2}
                    className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] resize-y focus:outline-none focus:border-[#f36f21] ml-6"
                    placeholder="Rationale"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeContent.talkingPoints.map((tp, i) => (
                <div key={i}>
                  <p className="text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                    <span className="font-bold text-[#f36f21]">{i + 1}.</span>{' '}
                    {tp.point}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mt-0.5 ml-5 italic">
                    {tp.rationale}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Class Context */}
        <SectionCard
          title="Class Context"
          editing={editingSections.has('classContext')}
          onToggleEdit={() => toggleSection('classContext')}
        >
          {editingSections.has('classContext') ? (
            <textarea
              value={activeContent.classContext}
              onChange={(e) => updateField('classContext', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : (
            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-wrap">
              {activeContent.classContext}
            </p>
          )}
        </SectionCard>

        {/* What to Expect */}
        <SectionCard
          title="What to Expect"
          editing={editingSections.has('whatToExpect')}
          onToggleEdit={() => toggleSection('whatToExpect')}
        >
          {editingSections.has('whatToExpect') ? (
            <textarea
              value={activeContent.whatToExpect}
              onChange={(e) => updateField('whatToExpect', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : (
            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-wrap">
              {activeContent.whatToExpect}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

export default function BriefPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <BriefContent />
    </Suspense>
  )
}
