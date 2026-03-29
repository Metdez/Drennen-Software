'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SemesterStory, StorySection } from '@/types'

export default function StoryPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [story, setStory] = useState<SemesterStory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [hasUnsaved, setHasUnsaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!params.id) {
      setError('No story ID provided')
      setLoading(false)
      return
    }

    async function fetchStory() {
      try {
        const res = await fetch(ROUTES.API_STORY(params.id))
        if (res.status === 401) {
          router.push(ROUTES.LOGIN)
          return
        }
        if (res.status === 404) {
          router.push(ROUTES.SEMESTERS)
          return
        }
        if (!res.ok) throw new Error('Failed to fetch story')
        const data = await res.json()
        if (!data.story) {
          router.push(ROUTES.SEMESTERS)
          return
        }
        setStory(data.story)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load story')
      } finally {
        setLoading(false)
      }
    }

    fetchStory()
  }, [params.id, router])

  // Warn on unsaved changes
  useEffect(() => {
    if (!hasUnsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsaved])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editBody])

  const startEditing = useCallback((index: number, section: StorySection) => {
    setEditingIndex(index)
    setEditTitle(section.title)
    setEditBody(section.body)
    setHasUnsaved(true)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingIndex(null)
    setEditTitle('')
    setEditBody('')
    setHasUnsaved(false)
  }, [])

  const saveSection = useCallback(async () => {
    if (!story || editingIndex === null) return
    setSaving(true)
    try {
      const updatedSections = story.sections.map((s, i) =>
        i === editingIndex ? { ...s, title: editTitle, body: editBody } : s
      )
      const res = await fetch(ROUTES.API_STORY(story.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setStory({ ...story, sections: updatedSections })
      setEditingIndex(null)
      setEditTitle('')
      setEditBody('')
      setHasUnsaved(false)
    } catch {
      // Keep editing state on failure
    } finally {
      setSaving(false)
    }
  }, [story, editingIndex, editTitle, editBody])

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!story || downloading) return
    setDownloading(format)
    try {
      const res = await fetch(ROUTES.API_STORY_DOWNLOAD(story.id) + `?format=${format}`)
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${story.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.${format}`
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

  if (error || !story) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
          {error ?? 'Story not found'}
        </p>
        <Link
          href={ROUTES.SEMESTERS}
          className="text-sm font-medium hover:underline"
          style={{ color: BRAND.ORANGE }}
        >
          &larr; Return to Semesters
        </Link>
      </div>
    )
  }

  const generatedDate = new Date(story.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <>
      <style jsx global>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          main { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <div className="max-w-[720px] mx-auto font-[family-name:var(--font-dm-sans)]">
        {/* Back link */}
        <Link
          href={ROUTES.SEMESTERS}
          className="no-print inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--brand-orange)] transition-colors duration-200 w-fit mb-6"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Semesters
        </Link>

        {/* Header */}
        <div className="mb-10 animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1
                className="text-4xl font-bold mb-2"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  color: 'var(--text-primary)',
                }}
              >
                {story.title}
              </h1>
              <div className="h-0.5 w-16 mb-3" style={{ backgroundColor: BRAND.ORANGE }} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>A Semester Narrative</span>
                <span className="opacity-40">&middot;</span>
                <span>Generated {generatedDate}</span>
                <span className="opacity-40">&middot;</span>
                <span>{story.sessionIds.length} session{story.sessionIds.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Download buttons */}
            <div className="no-print shrink-0 pt-1 flex items-center gap-2">
              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-colors duration-200 disabled:opacity-50"
                style={{ color: BRAND.ORANGE, borderColor: BRAND.ORANGE }}
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
                style={{ color: BRAND.PURPLE, borderColor: BRAND.PURPLE }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                {downloading === 'docx' ? 'Downloading...' : 'DOCX'}
              </button>
            </div>
          </div>
        </div>

        {/* Story sections */}
        <div className="space-y-10 animate-fade-up-delay-1">
          {story.sections.map((section, index) => (
            <section key={section.key} className="group">
              {editingIndex === index ? (
                /* ── Editing mode ── */
                <div
                  className="rounded-xl p-6"
                  style={{
                    background: 'var(--surface-elevated)',
                    border: `1px solid ${BRAND.ORANGE}44`,
                  }}
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xl font-bold mb-4 bg-transparent border-b outline-none pb-2"
                    style={{
                      fontFamily: 'var(--font-playfair)',
                      color: 'var(--text-primary)',
                      borderColor: `${BRAND.ORANGE}44`,
                    }}
                  />
                  <textarea
                    ref={textareaRef}
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    className="w-full bg-transparent text-sm leading-relaxed outline-none resize-none min-h-[200px]"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <button
                      onClick={saveSection}
                      disabled={saving}
                      className="text-xs font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: BRAND.ORANGE }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="text-xs font-medium rounded-lg px-4 py-2 transition-opacity hover:opacity-80"
                      style={{
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Reading mode ── */
                <div className="relative">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2
                      className="text-xl font-bold"
                      style={{
                        fontFamily: 'var(--font-playfair)',
                        color: BRAND.PURPLE,
                      }}
                    >
                      {section.title}
                    </h2>
                    <button
                      onClick={() => startEditing(index, section)}
                      className="no-print opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-xs rounded-lg px-3 py-1.5"
                      style={{
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      Edit
                    </button>
                  </div>
                  <div
                    className="h-0.5 w-10 mb-5 rounded-full"
                    style={{ backgroundColor: BRAND.ORANGE }}
                  />
                  <div className="space-y-4">
                    {section.body.split(/\n\n+/).filter(Boolean).map((paragraph, pi) => (
                      <p
                        key={pi}
                        className="text-sm leading-[1.85]"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {paragraph.trim()}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer */}
        <div
          className="text-center text-xs py-8 mt-10"
          style={{
            color: 'var(--text-muted)',
            borderTop: '1px solid var(--border)',
          }}
        >
          Generated by Drennen MGMT 305 &middot; {generatedDate}
        </div>
      </div>
    </>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-[720px] mx-auto space-y-6 animate-fade-up">
      <div className="h-10 w-80 rounded-lg bg-[var(--surface-elevated)] animate-pulse" />
      <div className="h-4 w-48 rounded bg-[var(--surface-elevated)] animate-pulse" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-6 w-64 rounded bg-[var(--surface-elevated)] animate-pulse" />
          <div className="h-40 rounded-xl bg-[var(--surface-elevated)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}
