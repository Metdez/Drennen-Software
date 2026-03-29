'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { parseQuestionsFromOutput } from '@/lib/parse/parseQuestions'
import { ROUTES, BRAND } from '@/lib/constants'
import type { SessionDebrief, QuestionFeedback, QuestionStatus, StudentObservation } from '@/types'

interface Props {
  sessionId: string
  sessionOutput: string
  speakerName: string
  studentNames: string[]
  initialDebrief: SessionDebrief | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const RATING_LABELS = ['', 'Disappointing', 'Below Expectations', 'Solid', 'Strong', 'Exceptional']

const STATUS_OPTIONS: { value: QuestionStatus; label: string; color: string; bg: string }[] = [
  { value: 'home_run', label: 'Home Run', color: BRAND.GREEN, bg: 'rgba(15,107,55,0.12)' },
  { value: 'solid', label: 'Solid', color: BRAND.ORANGE, bg: 'rgba(243,111,33,0.12)' },
  { value: 'flat', label: 'Fell Flat', color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.08)' },
  { value: 'unused', label: "Didn't Use", color: 'var(--text-muted)', bg: 'rgba(128,128,128,0.04)' },
]

function initQuestionsFeedback(output: string, existing?: QuestionFeedback[]): QuestionFeedback[] {
  const parsed = parseQuestionsFromOutput(output)
  if (existing && existing.length > 0) {
    // Merge: keep existing statuses, match by question text
    const statusMap = new Map(existing.map(q => [q.questionText, q.status]))
    return parsed.map(q => ({
      questionText: q.text,
      attribution: q.attribution,
      themeTitle: q.themeTitle,
      role: q.role,
      status: statusMap.get(q.text) ?? 'unused',
    }))
  }
  return parsed.map(q => ({
    questionText: q.text,
    attribution: q.attribution,
    themeTitle: q.themeTitle,
    role: q.role,
    status: 'unused' as QuestionStatus,
  }))
}

export function DebriefPanel({ sessionId, sessionOutput, speakerName, studentNames, initialDebrief }: Props) {
  const isComplete = initialDebrief?.status === 'complete'

  const [overallRating, setOverallRating] = useState<number | null>(initialDebrief?.overallRating ?? null)
  const [questionsFeedback, setQuestionsFeedback] = useState<QuestionFeedback[]>(() =>
    initQuestionsFeedback(sessionOutput, initialDebrief?.questionsFeedback)
  )
  const [surpriseMoments, setSurpriseMoments] = useState(initialDebrief?.surpriseMoments ?? '')
  const [speakerFeedbackText, setSpeakerFeedbackText] = useState(initialDebrief?.speakerFeedback ?? '')
  const [studentObservations, setStudentObservations] = useState<StudentObservation[]>(
    initialDebrief?.studentObservations ?? []
  )
  const [followupTopics, setFollowupTopics] = useState(initialDebrief?.followupTopics ?? '')
  const [privateNotes, setPrivateNotes] = useState(initialDebrief?.privateNotes ?? '')
  const [aiSummary, setAiSummary] = useState<string | null>(initialDebrief?.aiSummary ?? null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [completing, setCompleting] = useState(false)
  const [completedStatus, setCompletedStatus] = useState(isComplete)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)

  const save = useCallback(async () => {
    if (completedStatus) return
    if (savingRef.current) {
      pendingRef.current = true
      return
    }

    savingRef.current = true
    setSaveState('saving')

    try {
      const res = await fetch(ROUTES.API_SESSION_DEBRIEF(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating,
          questionsFeedback,
          surpriseMoments,
          speakerFeedback: speakerFeedbackText,
          studentObservations,
          followupTopics,
          privateNotes,
        }),
      })

      if (!res.ok) throw new Error('Save failed')
      setSaveState('saved')
      setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2000)
    } catch {
      setSaveState('error')
    } finally {
      savingRef.current = false
      if (pendingRef.current) {
        pendingRef.current = false
        save()
      }
    }
  }, [sessionId, overallRating, questionsFeedback, surpriseMoments, speakerFeedbackText, studentObservations, followupTopics, privateNotes, completedStatus])

  // Debounced auto-save
  useEffect(() => {
    if (completedStatus) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(save, 1500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [overallRating, questionsFeedback, surpriseMoments, speakerFeedbackText, studentObservations, followupTopics, privateNotes, save, completedStatus])

  async function handleComplete() {
    if (completing || completedStatus) return
    setCompleting(true)

    // Save current state first
    try {
      await fetch(ROUTES.API_SESSION_DEBRIEF(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallRating,
          questionsFeedback,
          surpriseMoments,
          speakerFeedback: speakerFeedbackText,
          studentObservations,
          followupTopics,
          privateNotes,
        }),
      })

      const res = await fetch(ROUTES.API_SESSION_DEBRIEF_COMPLETE(sessionId), {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Complete failed')

      const data = await res.json()
      setAiSummary(data.debrief.aiSummary)
      setCompletedStatus(true)
    } catch (err) {
      console.error('Failed to complete debrief:', err)
    } finally {
      setCompleting(false)
    }
  }

  function updateQuestionStatus(index: number, status: QuestionStatus) {
    if (completedStatus) return
    setQuestionsFeedback(prev => prev.map((q, i) => (i === index ? { ...q, status } : q)))
  }

  function addStudentObservation() {
    if (completedStatus) return
    setStudentObservations(prev => [...prev, { studentName: '', note: '' }])
  }

  function updateStudentObservation(index: number, field: 'studentName' | 'note', value: string) {
    if (completedStatus) return
    setStudentObservations(prev =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o))
    )
  }

  function removeStudentObservation(index: number) {
    if (completedStatus) return
    setStudentObservations(prev => prev.filter((_, i) => i !== index))
  }

  // Group questions by theme
  const questionsByTheme = questionsFeedback.reduce<Record<string, QuestionFeedback[]>>((acc, q) => {
    const key = q.themeTitle
    if (!acc[key]) acc[key] = []
    acc[key].push(q)
    return acc
  }, {})

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-1">
              Session Debrief
            </p>
            <div className="h-px bg-gradient-to-r from-[#f36f21] via-[#542785] to-transparent" />
          </div>
          <div className="text-xs font-[family-name:var(--font-dm-sans)]">
            {completedStatus && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(15,107,55,0.15)', color: '#5e9e6e' }}>
                Complete
              </span>
            )}
            {!completedStatus && saveState === 'saving' && (
              <span className="text-[var(--text-muted)]">Saving...</span>
            )}
            {!completedStatus && saveState === 'saved' && (
              <span className="text-[#5e9e6e]">Saved</span>
            )}
            {!completedStatus && saveState === 'error' && (
              <span className="text-red-400">Save failed</span>
            )}
          </div>
        </div>

        {/* AI Summary (shown when complete) */}
        {completedStatus && aiSummary && (
          <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
            <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
              <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
                AI Session Summary
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                {aiSummary}
              </p>
            </div>
          </div>
        )}

        {/* 1. Overall Rating */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Overall Session Rating
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => !completedStatus && setOverallRating(n)}
                  disabled={completedStatus}
                  className="flex flex-col items-center gap-1.5 transition-all duration-150"
                >
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold transition-all duration-150"
                    style={{
                      borderColor: overallRating === n ? BRAND.ORANGE : 'var(--border-accent)',
                      background: overallRating === n ? BRAND.ORANGE : 'transparent',
                      color: overallRating === n ? '#fff' : 'var(--text-muted)',
                      cursor: completedStatus ? 'default' : 'pointer',
                    }}
                  >
                    {n}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    {RATING_LABELS[n]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Questions That Landed */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Questions That Landed
            </p>
          </div>
          <div className="divide-y divide-[var(--border-accent)]">
            {Object.entries(questionsByTheme).map(([theme, questions]) => (
              <div key={theme} className="p-6">
                <p className="font-[family-name:var(--font-playfair)] text-sm font-semibold text-[var(--text-primary)] mb-4 border-l-2 border-[#f36f21] pl-3">
                  {theme}
                </p>
                <div className="flex flex-col gap-4">
                  {questions.map((q) => {
                    const globalIndex = questionsFeedback.indexOf(q)
                    return (
                      <div key={globalIndex} className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mt-0.5 w-14 shrink-0">
                            {q.role === 'primary' ? 'Primary' : 'Backup'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed">
                              {q.questionText}
                              <span className="text-[var(--text-muted)] italic ml-1">({q.attribution})</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-16">
                          {STATUS_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => updateQuestionStatus(globalIndex, opt.value)}
                              disabled={completedStatus}
                              className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 font-[family-name:var(--font-dm-sans)]"
                              style={{
                                background: q.status === opt.value ? opt.bg : 'transparent',
                                color: q.status === opt.value ? opt.color : 'var(--text-muted)',
                                border: `1px solid ${q.status === opt.value ? opt.color : 'var(--border-accent)'}`,
                                opacity: q.status === opt.value ? 1 : 0.6,
                                cursor: completedStatus ? 'default' : 'pointer',
                              }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Surprise Moments */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Surprise Moments
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={surpriseMoments}
              onChange={e => setSurpriseMoments(e.target.value)}
              disabled={completedStatus}
              placeholder="Unexpected topics, stories, follow-up questions, moments of tension..."
              rows={3}
              className="w-full bg-transparent border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors resize-y disabled:opacity-60"
            />
          </div>
        </div>

        {/* 4. Speaker Feedback */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Speaker Feedback
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={speakerFeedbackText}
              onChange={e => setSpeakerFeedbackText(e.target.value)}
              disabled={completedStatus}
              placeholder="Did the speaker comment on student questions? Offer to return? Suggest a colleague?"
              rows={3}
              className="w-full bg-transparent border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors resize-y disabled:opacity-60"
            />
          </div>
        </div>

        {/* 5. Student Observations */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)] flex items-center justify-between" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Student Engagement Observations
            </p>
            {!completedStatus && (
              <button
                onClick={addStudentObservation}
                className="text-xs font-medium font-[family-name:var(--font-dm-sans)] px-3 py-1 rounded-full border transition-colors"
                style={{ borderColor: BRAND.ORANGE, color: BRAND.ORANGE }}
              >
                + Add Student
              </button>
            )}
          </div>
          <div className="p-6">
            {studentObservations.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                No student observations yet. Click &quot;+ Add Student&quot; to note individual engagement.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {studentObservations.map((obs, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-40 shrink-0">
                    <input
                      list={`student-names-${i}`}
                      value={obs.studentName}
                      onChange={e => updateStudentObservation(i, 'studentName', e.target.value)}
                      disabled={completedStatus}
                      placeholder="Student name"
                      className="w-full bg-transparent border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors disabled:opacity-60"
                    />
                    <datalist id={`student-names-${i}`}>
                      {studentNames.map(name => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    value={obs.note}
                    onChange={e => updateStudentObservation(i, 'note', e.target.value)}
                    disabled={completedStatus}
                    placeholder="Observation..."
                    className="flex-1 bg-transparent border border-[var(--border-accent)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors disabled:opacity-60"
                  />
                  {!completedStatus && (
                    <button
                      onClick={() => removeStudentObservation(i)}
                      className="text-[var(--text-muted)] hover:text-red-400 transition-colors mt-2 text-sm"
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Follow-up Topics */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Topics for Follow-Up
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={followupTopics}
              onChange={e => setFollowupTopics(e.target.value)}
              disabled={completedStatus}
              placeholder="Threads to revisit, topics needing more depth, connections to other speakers..."
              rows={3}
              className="w-full bg-transparent border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors resize-y disabled:opacity-60"
            />
          </div>
        </div>

        {/* 7. Private Notes */}
        <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
          <div className="px-6 py-4 border-b border-[var(--border-accent)] flex items-center gap-2" style={{ background: 'var(--surface-elevated)' }}>
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="text-[var(--text-muted)]">
              <rect x="1" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 6V4a3 3 0 116 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Private Notes
            </p>
          </div>
          <div className="p-6">
            <textarea
              value={privateNotes}
              onChange={e => setPrivateNotes(e.target.value)}
              disabled={completedStatus}
              placeholder="Personal observations, reminders, ideas for next time..."
              rows={3}
              className="w-full bg-transparent border border-[var(--border-accent)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] transition-colors resize-y disabled:opacity-60"
            />
          </div>
        </div>

        {/* Mark Complete */}
        {!completedStatus && (
          <div className="flex justify-end">
            <button
              onClick={handleComplete}
              disabled={completing}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold font-[family-name:var(--font-dm-sans)] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: BRAND.ORANGE,
                color: '#fff',
              }}
            >
              {completing ? 'Generating Summary...' : 'Mark Complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
