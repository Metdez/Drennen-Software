"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, BRAND } from '@/lib/constants'
import type { ThemeAnalysis, ThemeQuestion } from '@/types'

interface ThemePageData extends ThemeAnalysis {
  theme_name: string
  questions: ThemeQuestion[]
}

function ThemeContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const theme = searchParams.get('theme')

  const [data, setData] = useState<ThemePageData | null>(null)
  const [speakerName, setSpeakerName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId || !theme) {
      setError('Missing session or theme')
      setLoading(false)
      return
    }

    const cacheKey = `theme_${sessionId}_${encodeURIComponent(theme)}`
    let cacheLoaded = false

    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        setData(JSON.parse(cached))
        setLoading(false)
        cacheLoaded = true
      } catch {
        sessionStorage.removeItem(cacheKey)
      }
    }

    const controller = new AbortController()

    async function fetchThemeAnalysis() {
      if (cacheLoaded) return
      try {
        const url = `${ROUTES.API_SESSION_THEME_ANALYSIS(sessionId!)}?theme=${encodeURIComponent(theme!)}`
        const res = await fetch(url, { signal: controller.signal })
        if (!res.ok) throw new Error('Failed to load theme analysis')
        const result = await res.json()
        setData(result)
        sessionStorage.setItem(cacheKey, JSON.stringify(result))
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load theme analysis')
      } finally {
        setLoading(false)
      }
    }

    async function fetchSpeakerName() {
      try {
        const res = await fetch(`${ROUTES.API_SESSIONS}/${sessionId}`, { signal: controller.signal })
        if (res.ok) {
          const d = await res.json()
          setSpeakerName(d.session?.speakerName ?? '')
        }
      } catch {
        // non-fatal — breadcrumb falls back to 'Preview'
      }
    }

    fetchThemeAnalysis()
    fetchSpeakerName()

    return () => controller.abort()
  }, [sessionId, theme])

  const backHref = sessionId ? `${ROUTES.PREVIEW}?sessionId=${sessionId}` : ROUTES.DASHBOARD

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Analyzing theme...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">{error ?? 'Something went wrong'}</p>
        <Link href={backHref} className="text-[#f36f21] hover:underline text-sm font-medium font-[family-name:var(--font-dm-sans)]">
          ← Back
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-[-1.5rem] w-[calc(100%+3rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] min-h-screen">

        {/* MAIN CONTENT */}
        <div className="px-8 py-10 border-r border-[var(--border-accent)]">
          <div className="max-w-2xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-8 font-[family-name:var(--font-dm-sans)]">
              <Link href={backHref} className="text-[#f36f21] text-sm hover:underline">
                ← {speakerName || 'Preview'}
              </Link>
              <span className="text-[var(--text-muted)] text-sm">/</span>
              <span className="text-[var(--text-muted)] text-sm">{data.theme_name}</span>
            </div>

            {/* Heading */}
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
              {data.theme_name}
            </h1>
            <div className="h-0.5 w-12 mb-2" style={{ background: BRAND.ORANGE }} />
            <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)] mb-6">
              {(data.questions ?? []).length} student questions · analyzed by Gemini
            </p>

            {/* Narrative analysis */}
            <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#7dd4d4] animate-pulse" />
                <span className="text-[0.6rem] uppercase tracking-widest text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                  Gemini Analysis
                </span>
              </div>
              <div className="text-sm text-[var(--text-secondary)] leading-relaxed font-[family-name:var(--font-dm-sans)] whitespace-pre-line">
                {data.narrative}
              </div>
            </div>

            {/* Questions list */}
            <div className="flex flex-col gap-3">
              {(data.questions ?? []).map((q, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-4"
                >
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed italic font-[family-name:var(--font-dm-sans)] mb-2">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    — {q.student_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="px-4 py-10 flex flex-col gap-4">
          <p className="text-[0.6rem] uppercase tracking-widest text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
            Deep-Dive Insights
          </p>

          {/* Probe Questions */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              ✦ Probe Questions
            </p>
            <p className="text-[0.58rem] text-[var(--text-muted)] mb-2 font-[family-name:var(--font-dm-sans)]">
              Push past the surface answers
            </p>
            <div className="flex flex-col gap-1.5">
              {(data.probe_questions ?? []).map((p, i) => (
                <div
                  key={i}
                  className="rounded-lg p-2"
                  style={{ background: 'rgba(13,24,24,0.8)', border: '1px solid rgba(26,48,48,0.8)' }}
                >
                  <p className="text-[0.62rem] italic leading-relaxed" style={{ color: '#7dd4d4' }}>
                    &ldquo;{p.question}&rdquo;
                  </p>
                  <p className="text-[0.58rem] mt-1" style={{ color: '#4a8080' }}>{p.why}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What Students Missed */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              🔍 What Students Missed
            </p>
            <div className="flex flex-col divide-y divide-[var(--border-accent)]">
              {(data.missed_angles ?? []).map((angle, i) => (
                <div key={i} className="flex gap-2 py-1.5 first:pt-0 last:pb-0">
                  <span className="text-[#f36f21] text-[0.65rem] flex-shrink-0">›</span>
                  <p className="text-[0.62rem] text-[var(--text-muted)] leading-snug font-[family-name:var(--font-dm-sans)]">
                    {angle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Patterns */}
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-3">
            <p className="text-[0.65rem] font-semibold text-[var(--text-secondary)] mb-2 font-[family-name:var(--font-dm-sans)]">
              Patterns
            </p>
            <div className="flex flex-col divide-y divide-[var(--border-accent)]">
              {(data.patterns ?? []).map((pat, i) => (
                <div key={i} className="flex gap-2 py-1.5 first:pt-0 last:pb-0 items-start">
                  <span className="text-sm flex-shrink-0">{pat.emoji}</span>
                  <p className="text-[0.62rem] text-[var(--text-muted)] leading-snug font-[family-name:var(--font-dm-sans)]">
                    {pat.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-[#7dd4d4] animate-pulse" />
            <span className="text-[0.58rem] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">Powered by Gemini</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function ThemePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <ThemeContent />
    </Suspense>
  )
}
