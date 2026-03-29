"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ROUTES, BRAND, APP_NAME } from '@/lib/constants'
import type { SpeakerPortalContent, PostSessionFeedback } from '@/types'

interface PortalData {
  welcome: SpeakerPortalContent['welcome']
  studentInterests: SpeakerPortalContent['studentInterests']
  sampleQuestions?: SpeakerPortalContent['sampleQuestions']
  talkingPoints: SpeakerPortalContent['talkingPoints']
  audienceProfile: SpeakerPortalContent['audienceProfile']
  pastSpeakerInsights: SpeakerPortalContent['pastSpeakerInsights']
  postSession: PostSessionFeedback | null
}

function SentimentBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--text-muted)] w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-[var(--border-accent)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold text-[var(--text-secondary)] w-10 text-right">{value}%</span>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <svg
          key={i}
          className={`h-6 w-6 ${i <= rating ? 'text-[#f36f21]' : 'text-[var(--border-accent)]'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function SpeakerPortalPage() {
  const params = useParams<{ token: string }>()
  const token = params.token

  const [data, setData] = useState<PortalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    async function fetchPortal() {
      try {
        const res = await fetch(ROUTES.API_SPEAKER_PORTAL(token))
        if (!res.ok) {
          if (res.status === 404) {
            setError('This portal is no longer available. The link may have been revoked.')
          } else {
            setError('Something went wrong loading this portal.')
          }
          return
        }
        const json = await res.json()
        setData(json)
      } catch {
        setError('Failed to load the speaker portal.')
      } finally {
        setLoading(false)
      }
    }
    fetchPortal()
  }, [token])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--text-muted)] border-t-[#f36f21] rounded-full" />
          <p className="text-sm text-[var(--text-muted)]">Preparing your portal...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-16 h-16 rounded-full bg-[rgba(243,111,33,0.1)] flex items-center justify-center">
          <svg className="h-8 w-8 text-[#f36f21]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-[var(--text-secondary)] text-sm text-center max-w-md">{error}</p>
      </div>
    )
  }

  const { welcome, studentInterests, sampleQuestions, talkingPoints, audienceProfile, pastSpeakerInsights, postSession } = data

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-16">
      {/* Hero / Welcome Section */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-accent)]" style={{ background: 'var(--surface)' }}>
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${BRAND.ORANGE}, ${BRAND.PURPLE})` }} />
        <div className="px-8 py-10">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4 uppercase tracking-wider">
            <span>{welcome.courseLabel}</span>
            <span className="opacity-40">·</span>
            <span>{welcome.sessionDate}</span>
            <span className="opacity-40">·</span>
            <span>{welcome.studentCount} students</span>
          </div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-playfair)' }}>
            Welcome, {welcome.speakerName}
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed text-base">
            {welcome.greeting}
          </p>
        </div>
      </div>

      {/* Section 2: What Students Want to Know */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.ORANGE}15` }}>
            <svg className="h-4 w-4" style={{ color: BRAND.ORANGE }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            What Students Want to Know
          </h2>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-5">
          {studentInterests.narrative}
        </p>
        <div className="grid gap-3">
          {studentInterests.topThemes.map((theme, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border-accent)] px-5 py-4"
              style={{ background: 'var(--surface)' }}
            >
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1" style={{ color: BRAND.ORANGE }}>
                {theme.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {theme.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section: What Students Are Asking */}
      {sampleQuestions && sampleQuestions.questions.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.ORANGE}15` }}>
              <svg className="h-4 w-4" style={{ color: BRAND.ORANGE }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
              What Students Are Asking
            </h2>
          </div>
          <p className="text-[var(--text-muted)] text-sm italic mb-4">
            {sampleQuestions.narrative}
          </p>
          <div className="flex flex-col gap-3">
            {sampleQuestions.questions.map((sq, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border-accent)] px-5 py-4"
                style={{ background: 'var(--surface)' }}
              >
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: BRAND.ORANGE }}>
                  {sq.theme}
                </p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  &ldquo;{sq.question}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Suggested Talking Points */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.PURPLE}15` }}>
            <svg className="h-4 w-4" style={{ color: BRAND.PURPLE }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Suggested Talking Points
          </h2>
        </div>
        <div className="flex flex-col gap-4">
          {talkingPoints.map((tp, i) => (
            <div key={i} className="flex gap-4">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: BRAND.PURPLE }}
              >
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{tp.point}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 italic leading-relaxed">{tp.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Know Your Audience */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.GREEN}15` }}>
            <svg className="h-4 w-4" style={{ color: BRAND.GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Know Your Audience
          </h2>
        </div>
        <p className="text-[var(--text-secondary)] leading-relaxed mb-5">
          {audienceProfile.narrative}
        </p>

        {/* Sentiment bars */}
        <div className="rounded-xl border border-[var(--border-accent)] px-5 py-4 mb-4" style={{ background: 'var(--surface)' }}>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Student Mindset</p>
          <div className="flex flex-col gap-2.5">
            <SentimentBar label="Aspirational" value={audienceProfile.sentiment.aspirational} color={BRAND.ORANGE} />
            <SentimentBar label="Curious" value={audienceProfile.sentiment.curious} color={BRAND.PURPLE} />
            <SentimentBar label="Personal" value={audienceProfile.sentiment.personal} color={BRAND.GREEN} />
            <SentimentBar label="Critical" value={audienceProfile.sentiment.critical} color="#6b7280" />
          </div>
        </div>

        {audienceProfile.recurringInterests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {audienceProfile.recurringInterests.map((interest, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-[var(--border-accent)]"
                style={{ background: 'var(--surface)', color: 'var(--text-secondary)' }}
              >
                {interest}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Section 5: What Past Speakers Found Useful */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.ORANGE}15` }}>
            <svg className="h-4 w-4" style={{ color: BRAND.ORANGE }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            What Past Speakers Found Useful
          </h2>
        </div>
        {pastSpeakerInsights.available ? (
          <>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
              {pastSpeakerInsights.narrative}
            </p>
            <div className="flex flex-col gap-3">
              {pastSpeakerInsights.highlights.map((h, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-[var(--border-accent)] px-5 py-4"
                  style={{ background: 'var(--surface)' }}
                >
                  <svg className="h-5 w-5 shrink-0 mt-0.5" style={{ color: BRAND.ORANGE }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{h.insight}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{h.context}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-accent)] px-6 py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No prior speaker feedback available yet. As more sessions are completed, insights from past speakers will appear here.
            </p>
          </div>
        )}
      </section>

      {/* Section 6: Post-Session Feedback */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND.GREEN}15` }}>
            <svg className="h-4 w-4" style={{ color: BRAND.GREEN }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
            Post-Session Feedback
          </h2>
        </div>
        {postSession ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-[var(--border-accent)] px-6 py-5" style={{ background: 'var(--surface)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Session Rating</p>
                <StarRating rating={postSession.overallRating} />
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {postSession.narrative}
              </p>
            </div>

            {postSession.topicsResonated.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Topics That Resonated</p>
                <div className="flex flex-wrap gap-2">
                  {postSession.topicsResonated.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${BRAND.GREEN}15`, color: BRAND.GREEN }}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {postSession.studentHighlights && (
              <div className="rounded-xl border border-[var(--border-accent)] px-6 py-5" style={{ background: 'var(--surface)' }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Student Highlights</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {postSession.studentHighlights}
                </p>
              </div>
            )}

            {postSession.professorNotes && (
              <div className="rounded-xl border border-[var(--border-accent)] px-6 py-5" style={{ background: 'var(--surface)' }}>
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Professor&apos;s Notes</p>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">
                  {postSession.professorNotes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[var(--border-accent)] px-6 py-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              Thank you for visiting! Post-session highlights will appear here after your session with the class.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <div className="border-t border-[var(--border-accent)] pt-6 text-center">
        <p className="text-xs text-[var(--text-muted)]">
          Powered by {APP_NAME}
        </p>
      </div>
    </div>
  )
}
