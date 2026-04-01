"use client"

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { OutputPreview } from '@/components/session/OutputPreview'
import { DownloadButtons } from '@/components/session/DownloadButtons'
import { ShareButton } from '@/components/session/ShareButton'
import { SystemPromptEditor } from '@/components/session/SystemPromptEditor'
import { GeneratePortalButton } from '@/components/speaker/GeneratePortalButton'
import { AnalysisPanelLeft } from '@/components/analytics/AnalysisPanelLeft'
import { AnalysisPanelRight } from '@/components/analytics/AnalysisPanelRight'
import { DebriefPanel } from '@/components/debrief/DebriefPanel'
import { SpeakerAnalysisUploadZone } from '@/components/speaker/SpeakerAnalysisUploadZone'
import { SpeakerAnalysisPanel } from '@/components/speaker/SpeakerAnalysisPanel'
import { StudentDebriefUploadZone } from '@/components/speaker/StudentDebriefUploadZone'
import { StudentReflectionsPanel } from '@/components/student/StudentReflectionsPanel'
import { ROUTES } from '@/lib/constants'
import type { Session, SessionAnalysis, SessionDebrief, StudentSpeakerAnalysis, StudentDebriefAnalysis } from '@/types'

type Tab = 'questions' | 'analysis' | 'insights' | 'debrief' | 'speaker-analysis' | 'reflections'

function PreviewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<Session | null>(null)
  const [output, setOutput] = useState<string | null>(null)
  const [overlappingThemes, setOverlappingThemes] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('questions')
  const [debrief, setDebrief] = useState<SessionDebrief | null>(null)
  const [debriefLoading, setDebriefLoading] = useState(false)
  const [debriefFetched, setDebriefFetched] = useState(false)
  const [studentNames, setStudentNames] = useState<string[]>([])
  const [speakerAnalysis, setSpeakerAnalysis] = useState<StudentSpeakerAnalysis | null>(null)
  const [speakerAnalysisFileCount, setSpeakerAnalysisFileCount] = useState(0)
  const [hasSpeakerAnalyses, setHasSpeakerAnalyses] = useState(false)
  const [speakerAnalysisLoading, setSpeakerAnalysisLoading] = useState(false)
  const [speakerAnalysisFetched, setSpeakerAnalysisFetched] = useState(false)
  const [studentDebriefAnalysis, setStudentDebriefAnalysis] = useState<StudentDebriefAnalysis | null>(null)
  const [studentDebriefFileCount, setStudentDebriefFileCount] = useState(0)
  const [hasStudentDebriefs, setHasStudentDebriefs] = useState(false)
  const [studentDebriefLoading, setStudentDebriefLoading] = useState(false)
  const [studentDebriefFetched, setStudentDebriefFetched] = useState(false)
  const [promptEditorOpen, setPromptEditorOpen] = useState(false)
  const [promptVersion, setPromptVersion] = useState<{ id: string; version: number; label: string | null } | null>(null)

  const fetchAnalysis = useCallback(async () => {
    if (!sessionId) return
    setAnalysisError(null)
    setAnalysis(null)
    setAnalysisLoading(true)

    // Check sessionStorage cache first
    const storedAnalysis = sessionStorage.getItem(`analysis_${sessionId}`)
    if (storedAnalysis) {
      try {
        setAnalysis(JSON.parse(storedAnalysis))
        setAnalysisLoading(false)
        return
      } catch {
        sessionStorage.removeItem(`analysis_${sessionId}`)
      }
    }

    try {
      const res = await fetch(ROUTES.API_SESSION_ANALYSIS(sessionId))
      if (!res.ok) {
        let msg = 'Analysis failed to load.'
        try {
          const errData = await res.json()
          // Gemini errors can be nested JSON in the message string
          let raw = errData.error ?? ''
          try {
            const parsed = JSON.parse(raw)
            raw = parsed?.error?.message ?? raw
          } catch { /* not JSON */ }
          if (raw) msg = raw
        } catch { /* ignore parse errors */ }
        setAnalysisError(msg)
        return
      }
      const data = await res.json()
      if (data.empty) {
        // genuinely no submissions saved for this session
        return
      }
      if (data.error) {
        setAnalysisError(data.error)
        return
      }
      setAnalysis(data)
      sessionStorage.setItem(`analysis_${sessionId}`, JSON.stringify(data))
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Network error loading analysis.')
    } finally {
      setAnalysisLoading(false)
    }
  }, [sessionId])

  const fetchDebrief = useCallback(async () => {
    if (!sessionId || debriefFetched) return
    setDebriefLoading(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_DEBRIEF(sessionId))
      if (!res.ok) return
      const data = await res.json()
      setDebrief(data.debrief)
      setStudentNames(data.studentNames ?? [])
      setDebriefFetched(true)
    } catch {
      // non-fatal
    } finally {
      setDebriefLoading(false)
    }
  }, [sessionId, debriefFetched])

  const fetchStudentDebriefs = useCallback(async () => {
    if (!sessionId) return
    setStudentDebriefLoading(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_STUDENT_DEBRIEFS(sessionId))
      if (!res.ok) return
      const data = await res.json()
      setHasStudentDebriefs(data.hasDebriefs ?? false)
      setStudentDebriefAnalysis(data.analysis ?? null)
      setStudentDebriefFileCount(data.fileCount ?? 0)
      setStudentDebriefFetched(true)
    } catch {
      // non-fatal
    } finally {
      setStudentDebriefLoading(false)
    }
  }, [sessionId])

  // Lazy-load debrief data when the tab is first selected
  useEffect(() => {
    if (activeTab === 'debrief' && !debriefFetched) {
      fetchDebrief()
    }
  }, [activeTab, debriefFetched, fetchDebrief])

  const fetchSpeakerAnalyses = useCallback(async () => {
    if (!sessionId) return
    setSpeakerAnalysisLoading(true)
    try {
      const res = await fetch(ROUTES.API_SESSION_SPEAKER_ANALYSES(sessionId))
      if (!res.ok) return
      const data = await res.json()
      setHasSpeakerAnalyses(data.hasAnalyses ?? false)
      setSpeakerAnalysis(data.analysis ?? null)
      setSpeakerAnalysisFileCount(data.fileCount ?? 0)
      setSpeakerAnalysisFetched(true)
    } catch {
      // non-fatal
    } finally {
      setSpeakerAnalysisLoading(false)
    }
  }, [sessionId])

  // Lazy-load student debrief reflections when the tab is first selected
  useEffect(() => {
    if (activeTab === 'reflections' && !studentDebriefFetched) {
      fetchStudentDebriefs()
    }
  }, [activeTab, studentDebriefFetched, fetchStudentDebriefs])

  // Lazy-load speaker analyses when the tab is first selected
  useEffect(() => {
    if (activeTab === 'speaker-analysis' && !speakerAnalysisFetched) {
      fetchSpeakerAnalyses()
    }
  }, [activeTab, speakerAnalysisFetched, fetchSpeakerAnalyses])

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID provided')
      setLoading(false)
      setAnalysisLoading(false)
      return
    }

    const storedOutput = sessionStorage.getItem(`session_${sessionId}`)
    if (storedOutput) {
      setOutput(storedOutput)
    }

    const storedOverlap = sessionStorage.getItem(`overlap_${sessionId}`)
    if (storedOverlap) {
      try {
        setOverlappingThemes(JSON.parse(storedOverlap))
      } catch {
        // ignore malformed data
      }
    }

    async function fetchSession() {
      try {
        const res = await fetch(`${ROUTES.API_SESSIONS}/${sessionId}`)
        if (!res.ok) throw new Error('Failed to fetch session metadata')

        const data = await res.json()
        setSession(data.session)
        setPromptVersion(data.promptVersion ?? null)
        if (!storedOutput && data.session?.output) {
          setOutput(data.session.output)
        }
      } catch (err: unknown) {
        if (!storedOutput) {
          setError(err instanceof Error ? err.message : 'Failed to load session')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
    fetchAnalysis()
  }, [sessionId, fetchAnalysis])

  if (loading && !output) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading preview...
      </div>
    )
  }

  if (error || !sessionId) {
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'questions', label: 'Questions' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'insights', label: 'Insights' },
    { key: 'debrief', label: 'Debrief' },
    { key: 'reflections', label: 'Reflections' },
    { key: 'speaker-analysis', label: 'Speaker Analysis' },
  ]

  const tabIcons: Record<Tab, JSX.Element> = {
    questions: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    analysis: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    insights: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    debrief: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    reflections: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    'speaker-analysis': (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Back link */}
      <Link
        href={ROUTES.DASHBOARD}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 w-fit font-[family-name:var(--font-dm-sans)] mb-5"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        New Session
      </Link>

      {/* Session Hero Card */}
      {session && (
        <div className="animate-fade-up session-hero-card mb-6">
          {/* Top row: Speaker Name + Meta on left, Actions on right */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-5">
            {/* Left: Speaker info */}
            <div className="flex-1 min-w-0">
              <h1 className="font-[family-name:var(--font-playfair)] text-3xl lg:text-4xl font-bold text-[var(--text-primary)] mb-3 truncate">
                {session.speakerName}
              </h1>

              {/* Meta pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="session-meta-pill">
                  <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  {new Date(session.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="session-meta-pill">
                  <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  {session.fileCount} {session.fileCount === 1 ? 'file' : 'files'}
                </span>
                <span className="session-meta-pill">
                  <svg className="h-3.5 w-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-2.122-.707A4.5 4.5 0 014.5 13.5V6A1.5 1.5 0 016 4.5h12A1.5 1.5 0 0119.5 6v7.5a4.5 4.5 0 01-2.378 4.043L15 18.75l-.813-2.846A3 3 0 0011.25 13.5h1.5a3 3 0 00-2.937 2.404Z" />
                  </svg>
                  {promptVersion ? `Custom prompt v${promptVersion.version}` : 'Default prompt'}
                </span>
              </div>
            </div>

            {/* Right: Action buttons — organized into groups */}
            <div className="flex flex-col items-end gap-3 shrink-0">
              {/* Primary actions: Downloads */}
              <div className="flex items-center gap-2">
                <DownloadButtons sessionId={sessionId} speakerName={session.speakerName} />
              </div>

              {/* Secondary actions: Debrief, Portal, Share */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('debrief')}
                  className="session-action-btn session-action-btn--purple"
                  title="Post-session debrief"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                  </svg>
                  <span className="hidden sm:inline">Debrief</span>
                </button>
                <button
                  onClick={() => setPromptEditorOpen((value) => !value)}
                  className="session-action-btn"
                  title="Customize system prompt"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.278c.066.395.33.728.69.871a7.03 7.03 0 011.265.672.75.75 0 001.026-.145l.83-.996a1.125 1.125 0 011.59-.104l1.832 1.832c.39.39.435 1.01.104 1.59l-.996.83a.75.75 0 00-.145 1.026c.265.39.49.814.672 1.265.143.36.476.624.87.69l1.279.213c.542.09.94.56.94 1.11v2.592c0 .55-.398 1.02-.94 1.11l-1.278.213a1.125 1.125 0 00-.871.69 7.03 7.03 0 01-.672 1.265.75.75 0 00.145 1.026l.996.83c.331.58.286 1.2-.104 1.59l-1.832 1.832a1.125 1.125 0 01-1.59-.104l-.83-.996a.75.75 0 00-1.026-.145 7.03 7.03 0 01-1.265.672 1.125 1.125 0 00-.69.87l-.213 1.279c-.09.542-.56.94-1.11.94h-2.592c-.55 0-1.02-.398-1.11-.94l-.213-1.278a1.125 1.125 0 00-.69-.871 7.03 7.03 0 01-1.265-.672.75.75 0 00-1.026.145l-.83.996a1.125 1.125 0 01-1.59.104L2.62 19.484a1.125 1.125 0 01-.104-1.59l.996-.83a.75.75 0 00.145-1.026 7.03 7.03 0 01-.672-1.265 1.125 1.125 0 00-.87-.69l-1.279-.213A1.125 1.125 0 010 13.296v-2.592c0-.55.398-1.02.94-1.11l1.278-.213c.395-.066.728-.33.871-.69a7.03 7.03 0 01.672-1.265.75.75 0 00-.145-1.026l-.996-.83a1.125 1.125 0 01.104-1.59L4.556 2.148a1.125 1.125 0 011.59.104l.83.996a.75.75 0 001.026.145 7.03 7.03 0 011.265-.672 1.125 1.125 0 00.69-.87l.213-1.279Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
                  </svg>
                  <span className="hidden sm:inline">Prompt</span>
                </button>
                <GeneratePortalButton sessionId={sessionId} speakerName={session.speakerName} />
                <ShareButton sessionId={sessionId} />
              </div>
            </div>
          </div>
        </div>
      )}

      {session && promptEditorOpen && (
        <div className="mb-6 animate-fade-up">
          <SystemPromptEditor
            defaultExpanded
            sessionId={sessionId ?? undefined}
            onRerun={(newSessionId) => {
              setActiveTab('questions')
              router.push(`${ROUTES.PREVIEW}?sessionId=${newSessionId}`)
            }}
          />
        </div>
      )}

      {/* Tab bar — pill-style */}
      {session && (
        <div className="session-tab-bar">
          <div className="session-tab-list">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`session-tab ${activeTab === tab.key ? 'session-tab--active' : ''}`}
              >
                {tabIcons[tab.key]}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab panels */}
      {activeTab === 'questions' && (
        <div className="flex flex-col gap-6">
          {output && (
            <div className="animate-fade-up-delay-1">
              <OutputPreview output={output} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="animate-fade-up">
          <AnalysisPanelLeft
            sessionId={sessionId}
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onRetry={fetchAnalysis}
          />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="animate-fade-up">
          <AnalysisPanelRight
            analysis={analysis}
            loading={analysisLoading}
            error={analysisError}
            onRetry={fetchAnalysis}
          />
        </div>
      )}

      {activeTab === 'debrief' && (
        <div className="animate-fade-up">
          {debriefLoading && (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
              Loading debrief...
            </div>
          )}
          {!debriefLoading && output && session && (
            <DebriefPanel
              sessionId={sessionId}
              sessionOutput={output}
              speakerName={session.speakerName}
              studentNames={studentNames}
              initialDebrief={debrief}
            />
          )}
        </div>
      )}

      {activeTab === 'reflections' && (
        <div className="animate-fade-up">
          {studentDebriefLoading && (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
              Loading reflections...
            </div>
          )}
          {!studentDebriefLoading && hasStudentDebriefs && studentDebriefAnalysis && (
            <StudentReflectionsPanel
              analysis={studentDebriefAnalysis}
              fileCount={studentDebriefFileCount}
            />
          )}
          {!studentDebriefLoading && !hasStudentDebriefs && (
            <StudentDebriefUploadZone
              sessionId={sessionId}
              onUploadComplete={() => {
                setStudentDebriefFetched(false)
                fetchStudentDebriefs()
              }}
            />
          )}
          {!studentDebriefLoading && hasStudentDebriefs && !studentDebriefAnalysis && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-4 h-4 border-2 border-[#542785] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                AI analysis is being generated. Check back in a moment.
              </p>
              <button
                onClick={() => { setStudentDebriefFetched(false); fetchStudentDebriefs() }}
                className="text-sm text-[#542785] hover:underline font-[family-name:var(--font-dm-sans)]"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'speaker-analysis' && (
        <div className="animate-fade-up">
          {speakerAnalysisLoading && (
            <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
              Loading speaker analyses...
            </div>
          )}
          {!speakerAnalysisLoading && hasSpeakerAnalyses && speakerAnalysis && (
            <SpeakerAnalysisPanel
              analysis={speakerAnalysis}
              fileCount={speakerAnalysisFileCount}
            />
          )}
          {!speakerAnalysisLoading && !hasSpeakerAnalyses && (
            <SpeakerAnalysisUploadZone
              sessionId={sessionId}
              onUploadComplete={() => {
                setSpeakerAnalysisFetched(false)
                fetchSpeakerAnalyses()
              }}
            />
          )}
          {!speakerAnalysisLoading && hasSpeakerAnalyses && !speakerAnalysis && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-4 h-4 border-2 border-[#0f6b37] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                AI analysis is being generated. Check back in a moment.
              </p>
              <button
                onClick={() => { setSpeakerAnalysisFetched(false); fetchSpeakerAnalyses() }}
                className="text-sm text-[#0f6b37] hover:underline font-[family-name:var(--font-dm-sans)]"
              >
                Refresh
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading...
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  )
}
