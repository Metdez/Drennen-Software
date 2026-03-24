"use client"

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ROUTES, BRAND, submissionsApiUrl } from '@/lib/constants'
import { StudentSubmission } from '@/types'

const MAX_POLL_ATTEMPTS = 40

function ScorePill({ score, timedOut }: { score: number | null; timedOut: boolean }) {
  if (score === null) {
    if (timedOut) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-accent)]">
          —
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--surface)] text-[var(--text-muted)] border border-[var(--border-accent)]">
        <span
          className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin"
          style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
        />
        Scoring…
      </span>
    )
  }

  let bg: string
  let color: string
  if (score >= 70) {
    bg = `${BRAND.GREEN}22`
    color = BRAND.GREEN
  } else if (score >= 40) {
    bg = `${BRAND.AMBER}22`
    color = BRAND.AMBER
  } else {
    bg = `${BRAND.RED}22`
    color = BRAND.RED
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums"
      style={{ backgroundColor: bg, color }}
    >
      {score}
    </span>
  )
}

function RosterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [speakerName, setSpeakerName] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const pollAttempts = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function fetchSubmissions(sid: string): Promise<StudentSubmission[]> {
    const res = await fetch(submissionsApiUrl(sid))
    if (!res.ok) throw new Error('Failed to fetch submissions')
    const data = await res.json()
    return data.submissions as StudentSubmission[]
  }

  useEffect(() => {
    if (!sessionId) {
      router.replace(ROUTES.HISTORY)
      return
    }

    async function init() {
      try {
        // Fetch session for speakerName
        const sessionRes = await fetch(`${ROUTES.API_SESSIONS}/${sessionId}`)
        if (!sessionRes.ok) {
          router.replace(ROUTES.HISTORY)
          return
        }
        const sessionData = await sessionRes.json()
        setSpeakerName(sessionData.session.speakerName)

        // Fetch submissions
        const subs = await fetchSubmissions(sessionId!)
        setSubmissions(subs)

        const allScored = subs.every((s) => s.score !== null)
        if (!allScored) {
          intervalRef.current = setInterval(async () => {
            pollAttempts.current += 1
            if (pollAttempts.current >= MAX_POLL_ATTEMPTS) {
              stopPolling()
              setTimedOut(true)
              return
            }
            try {
              const updated = await fetchSubmissions(sessionId!)
              setSubmissions(updated)
              if (updated.every((s) => s.score !== null)) {
                stopPolling()
              }
            } catch {
              // Silently ignore poll errors; keep trying until timeout
            }
          }, 3000)
        }
      } catch {
        setError('Failed to load roster')
      } finally {
        setLoading(false)
      }
    }

    init()

    return () => {
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return b.score - a.score
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Loading roster…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">{error}</p>
        <Link
          href={ROUTES.HISTORY}
          className="text-[#f36f21] hover:underline text-sm font-medium font-[family-name:var(--font-dm-sans)]"
        >
          ← Return to History
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Back link */}
      <Link
        href={`${ROUTES.PREVIEW}?sessionId=${sessionId}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[#f36f21] transition-colors duration-200 w-fit font-[family-name:var(--font-dm-sans)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to Interview Sheet
      </Link>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          Student Roster — {speakerName}
        </h1>
        <div className="h-0.5 w-16 bg-[#f36f21] mb-3" />
        <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
          {timedOut && (
            <span className="ml-2 text-amber-500">· Scoring timed out for some students</span>
          )}
        </p>
      </div>

      {/* Table */}
      <div className="animate-fade-up-delay-1 overflow-x-auto rounded-lg border border-[var(--border-accent)]">
        <table className="w-full text-sm font-[family-name:var(--font-dm-sans)]">
          <thead>
            <tr className="border-b border-[var(--border-accent)] bg-[var(--surface)]">
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium w-1/4">
                Student
              </th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium w-20">
                Score
              </th>
              <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-[var(--text-muted)] font-medium">
                Explanation
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSubmissions.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-[var(--text-muted)]">
                  No submissions found.
                </td>
              </tr>
            ) : (
              sortedSubmissions.map((sub, idx) => (
                <tr
                  key={sub.id}
                  className={`border-b border-[var(--border-accent)] last:border-0 transition-colors ${
                    idx % 2 === 0 ? '' : 'bg-[var(--surface)]'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)] whitespace-nowrap">
                    {sub.studentName}
                  </td>
                  <td className="px-4 py-3">
                    <ScorePill score={sub.score} timedOut={timedOut && sub.score === null} />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] leading-relaxed">
                    {sub.score === null
                      ? timedOut
                        ? 'Scoring unavailable'
                        : ''
                      : sub.explanation ?? ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function RosterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Loading…
        </div>
      }
    >
      <RosterContent />
    </Suspense>
  )
}
