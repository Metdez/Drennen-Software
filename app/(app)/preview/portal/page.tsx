"use client"

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SpeakerPortal, SpeakerPortalContent } from '@/types'

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
// Portal Content Component
// ---------------------------------------------------------------------------

function PortalContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [portal, setPortal] = useState<SpeakerPortal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editedContent, setEditedContent] = useState<SpeakerPortalContent | null>(null)
  const [editingSections, setEditingSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      return
    }
    async function fetchPortal() {
      try {
        const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId!))
        if (!res.ok) throw new Error('Failed to fetch portal')
        const data = await res.json()
        if (!data.portal) {
          setError('No speaker portal found for this session.')
          return
        }
        setPortal(data.portal)
        setEditedContent(data.portal.editedContent ?? data.portal.content)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load portal')
      } finally {
        setLoading(false)
      }
    }
    fetchPortal()
  }, [sessionId])

  const activeContent = editedContent ?? portal?.content

  const hasChanges = portal && editedContent
    ? JSON.stringify(editedContent) !== JSON.stringify(portal.content)
    : false

  const hasEditsStored = portal?.editedContent !== null && portal?.editedContent !== undefined

  const toggleSection = useCallback((section: string) => {
    setEditingSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  function updateWelcome(field: keyof SpeakerPortalContent['welcome'], value: string | number) {
    setEditedContent((prev) => prev ? { ...prev, welcome: { ...prev.welcome, [field]: value } } : prev)
  }

  function updateStudentInterests(field: 'narrative', value: string) {
    setEditedContent((prev) => prev ? { ...prev, studentInterests: { ...prev.studentInterests, [field]: value } } : prev)
  }

  function updateTheme(index: number, field: 'title' | 'description', value: string) {
    if (!editedContent) return
    const themes = [...editedContent.studentInterests.topThemes]
    themes[index] = { ...themes[index], [field]: value }
    setEditedContent({ ...editedContent, studentInterests: { ...editedContent.studentInterests, topThemes: themes } })
  }

  function updateSampleQuestion(index: number, field: 'theme' | 'question', value: string) {
    if (!editedContent) return
    const sq = editedContent.sampleQuestions ?? { narrative: '', questions: [] }
    const questions = [...sq.questions]
    questions[index] = { ...questions[index], [field]: value }
    setEditedContent({ ...editedContent, sampleQuestions: { ...sq, questions } })
  }

  function updateTalkingPoint(index: number, field: 'point' | 'rationale', value: string) {
    if (!editedContent) return
    const points = [...editedContent.talkingPoints]
    points[index] = { ...points[index], [field]: value }
    setEditedContent({ ...editedContent, talkingPoints: points })
  }

  function updateAudienceProfile(field: 'narrative', value: string) {
    setEditedContent((prev) => prev ? { ...prev, audienceProfile: { ...prev.audienceProfile, [field]: value } } : prev)
  }

  function updatePastInsights(field: 'narrative', value: string) {
    setEditedContent((prev) => prev ? { ...prev, pastSpeakerInsights: { ...prev.pastSpeakerInsights, [field]: value } } : prev)
  }

  async function handleSave() {
    if (!sessionId || !editedContent) return
    setSaving(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent }),
      })
      if (!res.ok) throw new Error('Failed to save edits')
      setPortal((prev) =>
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
    if (!sessionId || !portal) return
    setSaving(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL(sessionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedContent: null }),
      })
      if (!res.ok) throw new Error('Failed to reset')
      setEditedContent(portal.content)
      setPortal((prev) => (prev ? { ...prev, editedContent: null } : prev))
      setEditingSections(new Set())
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset')
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (!sessionId) return
    setPublishing(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL_PUBLISH(sessionId), { method: 'POST' })
      if (!res.ok) throw new Error('Failed to publish')
      const data = await res.json()
      setPortal((prev) => prev ? { ...prev, isPublished: true, shareToken: data.shareToken ?? prev.shareToken } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  async function handleUnpublish() {
    if (!sessionId) return
    setPublishing(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_PORTAL_PUBLISH(sessionId), { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to revoke')
      setPortal((prev) => prev ? { ...prev, isPublished: false } : prev)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revoke')
    } finally {
      setPublishing(false)
    }
  }

  async function handleCopyLink() {
    if (!portal) return
    const url = `${window.location.origin}${ROUTES.SPEAKER_PORTAL(portal.shareToken)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Failed to copy link')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading portal...
      </div>
    )
  }

  if (error || !sessionId || !activeContent || !portal) {
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
          Speaker Portal
        </h1>
        <div className="h-0.5 w-16 mb-3" style={{ backgroundColor: BRAND.PURPLE }} />
        <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          {activeContent.welcome.speakerName}
          <span className="mx-2 opacity-40">·</span>
          {activeContent.welcome.sessionDate}
          <span className="mx-2 opacity-40">·</span>
          {activeContent.welcome.studentCount} submissions
        </p>
      </div>

      {/* Action bar */}
      <div className="animate-fade-up flex items-center gap-3 flex-wrap">
        {/* Publish / Unpublish */}
        {portal.isPublished ? (
          <>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] border ${
                copied
                  ? 'border-[#0f6b37] text-[#5e9e6e] bg-[rgba(15,107,55,0.08)]'
                  : 'border-[#f36f21] text-white bg-[#f36f21] hover:bg-[#d85e18] shadow-sm hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)]'
              }`}
            >
              {copied ? <CheckIcon /> : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              )}
              {copied ? 'Link Copied!' : 'Copy Portal Link'}
            </button>
            <a
              href={ROUTES.SPEAKER_PORTAL(portal.shareToken)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#542785] text-[#a87dd6] hover:bg-[rgba(84,39,133,0.15)] transition-all duration-200 font-[family-name:var(--font-dm-sans)]"
              style={{ background: 'var(--surface)' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Preview as Speaker
            </a>
            <button
              onClick={handleUnpublish}
              disabled={publishing}
              className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-40"
            >
              {publishing ? 'Revoking...' : 'Revoke Link'}
            </button>
          </>
        ) : (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#f36f21] hover:bg-[#d85e18] transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)]"
          >
            {publishing ? <SpinnerIcon /> : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            )}
            {publishing ? 'Publishing...' : 'Publish Portal'}
          </button>
        )}

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

      {/* Portal sections */}
      <div className="flex flex-col gap-4 animate-fade-up-delay-1">
        {/* Welcome / Greeting */}
        <SectionCard
          title="Welcome & Context"
          editing={editingSections.has('welcome')}
          onToggleEdit={() => toggleSection('welcome')}
        >
          {editingSections.has('welcome') ? (
            <textarea
              value={activeContent.welcome.greeting}
              onChange={(e) => updateWelcome('greeting', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : (
            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-wrap">
              {activeContent.welcome.greeting}
            </p>
          )}
        </SectionCard>

        {/* Student Interests */}
        <SectionCard
          title="What Students Want to Know"
          editing={editingSections.has('studentInterests')}
          onToggleEdit={() => toggleSection('studentInterests')}
        >
          {editingSections.has('studentInterests') ? (
            <div className="flex flex-col gap-4">
              <textarea
                value={activeContent.studentInterests.narrative}
                onChange={(e) => updateStudentInterests('narrative', e.target.value)}
                rows={4}
                className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
              />
              <div className="flex flex-col gap-3">
                {activeContent.studentInterests.topThemes.map((theme, i) => (
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
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-3">
                {activeContent.studentInterests.narrative}
              </p>
              <div className="flex flex-col gap-3">
                {activeContent.studentInterests.topThemes.map((theme, i) => (
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
            </>
          )}
        </SectionCard>

        {/* Sample Student Questions */}
        {activeContent.sampleQuestions && activeContent.sampleQuestions.questions.length > 0 && (
          <SectionCard
            title="What Students Are Asking"
            editing={editingSections.has('sampleQuestions')}
            onToggleEdit={() => toggleSection('sampleQuestions')}
          >
            {editingSections.has('sampleQuestions') ? (
              <div className="flex flex-col gap-3">
                {activeContent.sampleQuestions.questions.map((sq, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <input
                      value={sq.theme}
                      onChange={(e) => updateSampleQuestion(i, 'theme', e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-xs font-semibold text-[#f36f21] font-[family-name:var(--font-dm-sans)] focus:outline-none focus:border-[#f36f21]"
                      placeholder="Theme"
                    />
                    <textarea
                      value={sq.question}
                      onChange={(e) => updateSampleQuestion(i, 'question', e.target.value)}
                      rows={2}
                      className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] resize-y focus:outline-none focus:border-[#f36f21]"
                      placeholder="Student question"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-4 italic">
                  {activeContent.sampleQuestions.narrative}
                </p>
                <div className="flex flex-col gap-4">
                  {activeContent.sampleQuestions.questions.map((sq, i) => (
                    <div key={i} className="flex items-baseline gap-4">
                      <span className="text-xs font-bold text-[#f36f21] uppercase tracking-wider font-[family-name:var(--font-dm-sans)] shrink-0 w-[140px] text-right leading-snug pt-0.5">
                        {sq.theme}
                      </span>
                      <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed flex-1">
                        &ldquo;{sq.question}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>
        )}

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

        {/* Audience Profile */}
        <SectionCard
          title="Know Your Audience"
          editing={editingSections.has('audienceProfile')}
          onToggleEdit={() => toggleSection('audienceProfile')}
        >
          {editingSections.has('audienceProfile') ? (
            <textarea
              value={activeContent.audienceProfile.narrative}
              onChange={(e) => updateAudienceProfile('narrative', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : (
            <>
              <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-3">
                {activeContent.audienceProfile.narrative}
              </p>
              {activeContent.audienceProfile.recurringInterests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeContent.audienceProfile.recurringInterests.map((interest, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-[var(--border-accent)] text-[var(--text-secondary)]"
                      style={{ background: 'var(--bg)' }}
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </SectionCard>

        {/* Past Speaker Insights */}
        <SectionCard
          title="What Past Speakers Found Useful"
          editing={editingSections.has('pastInsights')}
          onToggleEdit={() => toggleSection('pastInsights')}
        >
          {editingSections.has('pastInsights') ? (
            <textarea
              value={activeContent.pastSpeakerInsights.narrative}
              onChange={(e) => updatePastInsights('narrative', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-relaxed resize-y focus:outline-none focus:border-[#f36f21]"
            />
          ) : activeContent.pastSpeakerInsights.available ? (
            <>
              <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-3">
                {activeContent.pastSpeakerInsights.narrative}
              </p>
              {activeContent.pastSpeakerInsights.highlights.length > 0 && (
                <div className="flex flex-col gap-2">
                  {activeContent.pastSpeakerInsights.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#0f6b37] mt-2 shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                          {h.insight}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                          {' — '}{h.context}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] italic">
              Not enough data yet. As more sessions are completed with debriefs, insights from past speakers will appear here.
            </p>
          )}
        </SectionCard>

        {/* Post-Session Feedback (read-only preview) */}
        {portal.postSession ? (
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-accent)] bg-[var(--surface-elevated)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] tracking-wide uppercase">
                Post-Session Feedback
              </h3>
              <span className="text-xs text-[#0f6b37] font-medium font-[family-name:var(--font-dm-sans)] bg-[rgba(15,107,55,0.1)] px-2 py-0.5 rounded">
                Live
              </span>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed">
                {portal.postSession.narrative}
              </p>
              <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mt-2">
                Rating: {portal.postSession.overallRating}/5
                {portal.postSession.topicsResonated.length > 0 && (
                  <> · Topics: {portal.postSession.topicsResonated.join(', ')}</>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-accent)] px-5 py-6 text-center">
            <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
              Post-session feedback will auto-publish when you complete the debrief for this session.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PortalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <PortalContent />
    </Suspense>
  )
}
