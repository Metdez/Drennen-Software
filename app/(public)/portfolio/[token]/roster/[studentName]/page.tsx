'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import type { StudentProfile } from '@/types'

interface StudentDetailData {
  studentName: string
  sessionCount: number
  totalSessions: number
  sessions: Array<{
    sessionId: string
    speakerName: string
    createdAt: string
    submissionText: string
  }>
  profile: StudentProfile | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PortfolioStudentDetailPage() {
  const params = useParams<{ token: string; studentName: string }>()
  const [detail, setDetail] = useState<StudentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'submissions'>('profile')

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/portfolio/${params.token}/roster/${encodeURIComponent(params.studentName)}`)
        if (!res.ok) return
        const data = await res.json()
        setDetail(data)
      } catch {
        // non-critical
      } finally {
        setLoading(false)
      }
    }
    fetchDetail()
  }, [params.token, params.studentName])

  if (loading) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }

  if (!detail) {
    return <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Student not found.</p>
  }

  const { profile } = detail
  const rate = detail.totalSessions > 0 ? detail.sessionCount / detail.totalSessions : 0

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
        <Link href={`/portfolio/${params.token}`} className="hover:text-[var(--text-secondary)] transition-colors">Portfolio</Link>
        <span className="mx-2">›</span>
        <Link href={`/portfolio/${params.token}/roster`} className="hover:text-[var(--text-secondary)] transition-colors">Roster</Link>
        <span className="mx-2">›</span>
        <span style={{ color: 'var(--text-secondary)' }}>{detail.studentName}</span>
      </nav>

      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-[var(--text-primary)] mb-2">
          {detail.studentName}
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
          {detail.sessionCount}/{detail.totalSessions} sessions · {Math.round(rate * 100)}% participation
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border-accent)]">
        <div className="flex">
          {(['profile', 'submissions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 text-sm font-medium font-[family-name:var(--font-dm-sans)] border-b-2 -mb-px transition-colors duration-200 capitalize ${
                activeTab === tab
                  ? 'text-[#f36f21] border-[#f36f21]'
                  : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="animate-fade-up flex flex-col gap-4">
          {!profile ? (
            <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
              No AI profile generated yet.
            </p>
          ) : (
            <>
              {profile.interests && (
                <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
                  <h3 className="text-xs uppercase tracking-wide font-semibold mb-2 font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Interests</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profile.interests.tags.map(tag => (
                      <span key={tag} className="text-xs rounded-full px-2.5 py-0.5 font-[family-name:var(--font-dm-sans)]" style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)' }}>{tag}</span>
                    ))}
                  </div>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{profile.interests.observations.join('. ')}</p>
                </div>
              )}
              {profile.careerDirection && (
                <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
                  <h3 className="text-xs uppercase tracking-wide font-semibold mb-2 font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Career Direction</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profile.careerDirection.fields.map(field => (
                      <span key={field} className="text-xs rounded-full px-2.5 py-0.5 font-[family-name:var(--font-dm-sans)]" style={{ background: 'rgba(84,39,133,0.12)', color: '#542785' }}>{field}</span>
                    ))}
                  </div>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{profile.careerDirection.observations.join('. ')}</p>
                </div>
              )}
              {profile.growthTrajectory && (
                <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
                  <h3 className="text-xs uppercase tracking-wide font-semibold mb-2 font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Growth Trajectory</h3>
                  <span
                    className="text-xs font-semibold rounded-full px-2.5 py-0.5 mb-2 inline-block"
                    style={{
                      color: profile.growthTrajectory.direction === 'improving' ? '#0f6b37' : profile.growthTrajectory.direction === 'declining' ? '#dc2626' : 'var(--text-secondary)',
                      background: profile.growthTrajectory.direction === 'improving' ? 'rgba(15,107,55,0.12)' : profile.growthTrajectory.direction === 'declining' ? 'rgba(220,38,38,0.12)' : 'var(--surface-hover)',
                    }}
                  >
                    {profile.growthTrajectory.direction}
                  </span>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{profile.growthTrajectory.observations.join('. ')}</p>
                </div>
              )}
              {profile.personality && (
                <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}>
                  <h3 className="text-xs uppercase tracking-wide font-semibold mb-2 font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>Personality</h3>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profile.personality.traits.map(trait => (
                      <span key={trait} className="text-xs rounded-full px-2.5 py-0.5 font-[family-name:var(--font-dm-sans)]" style={{ background: 'rgba(243,111,33,0.12)', color: '#f36f21' }}>{trait}</span>
                    ))}
                  </div>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>{profile.personality.observations.join('. ')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        <div className="animate-fade-up flex flex-col gap-3">
          {detail.sessions.map((s) => (
            <div
              key={s.sessionId}
              className="rounded-xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <Link
                  href={`/portfolio/${params.token}/sessions/${s.sessionId}`}
                  className="text-sm font-semibold font-[family-name:var(--font-dm-sans)] text-[#f36f21] hover:underline"
                >
                  {s.speakerName}
                </Link>
                <span className="text-xs font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(s.createdAt)}
                </span>
              </div>
              <p className="text-sm font-[family-name:var(--font-dm-sans)] whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {s.submissionText.length > 500 ? s.submissionText.slice(0, 500) + '...' : s.submissionText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
