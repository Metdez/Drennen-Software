'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/lib/constants'
import type { StudentProfile } from '@/types'

interface Props {
  studentName: string
}

function SkeletonCard() {
  return (
    <Card padding="md">
      <div className="animate-pulse">
        <div className="h-4 w-24 bg-[var(--border-accent)] rounded mb-3" />
        <div className="h-3 w-full bg-[var(--border-accent)] rounded mb-2" />
        <div className="h-3 w-3/4 bg-[var(--border-accent)] rounded mb-3" />
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-[var(--border-accent)] rounded-full" />
          <div className="h-6 w-20 bg-[var(--border-accent)] rounded-full" />
          <div className="h-6 w-14 bg-[var(--border-accent)] rounded-full" />
        </div>
      </div>
    </Card>
  )
}

function TagPill({ label, variant = 'purple' }: { label: string; variant?: 'purple' | 'orange' | 'green' }) {
  const colors = {
    purple: 'bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40',
    orange: 'bg-[#f36f21]/20 text-[#f36f21] border-[#f36f21]/40',
    green: 'bg-[#0f6b37]/20 text-[#4ae168] border-[#0f6b37]/40',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs rounded-full border ${colors[variant]} font-[family-name:var(--font-dm-sans)]`}>
      {label}
    </span>
  )
}

function GrowthBar({ direction }: { direction: string }) {
  const widths: Record<string, string> = {
    improving: 'w-3/4',
    stable: 'w-1/2',
    declining: 'w-1/4',
    insufficient_data: 'w-1/6',
  }
  const colors: Record<string, string> = {
    improving: 'from-[#f36f21] to-[#4ae168]',
    stable: 'from-[#542785] to-[#542785]',
    declining: 'from-[#f36f21] to-[#f36f21]',
    insufficient_data: 'from-[#555] to-[#555]',
  }
  return (
    <div className="h-1.5 bg-[var(--border-accent)] rounded-full mt-2 overflow-hidden">
      <div
        className={`h-full ${widths[direction] ?? 'w-1/2'} bg-gradient-to-r ${colors[direction] ?? colors.stable} rounded-full transition-all duration-500`}
      />
    </div>
  )
}

function DirectionLabel({ direction }: { direction: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    improving: { text: 'Improving', color: 'text-[#4ae168]' },
    stable: { text: 'Stable', color: 'text-[#c9a0ff]' },
    declining: { text: 'Declining', color: 'text-[#f36f21]' },
    insufficient_data: { text: 'Not enough data', color: 'text-[var(--text-muted)]' },
  }
  const label = labels[direction] ?? labels.stable
  return <span className={`text-xs font-medium ${label.color}`}>{label.text}</span>
}

export function StudentProfileTab({ studentName }: Props) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(ROUTES.API_STUDENT_PROFILE(studentName))
      if (!res.ok) {
        let msg = 'Failed to load student profile.'
        try {
          const errData = await res.json()
          if (errData.error) msg = errData.error
        } catch { /* ignore */ }
        setError(msg)
        return
      }
      const data = await res.json()
      if (data.profile) {
        setProfile(data.profile)
      } else {
        setError('No profile data available yet. Try uploading a session first.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error loading profile.')
    } finally {
      setLoading(false)
    }
  }, [studentName])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="animate-fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-up">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">{error}</p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 text-sm font-medium text-white bg-[#f36f21] rounded-lg hover:bg-[#d85f18] transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="animate-fade-up">
      {/* 2x2 grid of analysis cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Interests */}
        <Card padding="md" elevated>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 font-[family-name:var(--font-dm-sans)]">
            Interests
          </h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 font-[family-name:var(--font-dm-sans)]">
            {profile.interests.narrative}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.tags.map((tag) => (
              <TagPill key={tag} label={tag} variant="purple" />
            ))}
          </div>
        </Card>

        {/* Career Direction */}
        <Card padding="md" elevated>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 font-[family-name:var(--font-dm-sans)]">
            Career Direction
          </h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 font-[family-name:var(--font-dm-sans)]">
            {profile.careerDirection.narrative}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.careerDirection.fields.map((field) => (
              <TagPill key={field} label={field} variant="orange" />
            ))}
          </div>
        </Card>

        {/* Growth Trajectory */}
        <Card padding="md" elevated>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 font-[family-name:var(--font-dm-sans)]">
            Growth Trajectory
          </h4>
          <div className="flex items-center gap-2 mb-2">
            <DirectionLabel direction={profile.growthTrajectory.direction} />
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-[family-name:var(--font-dm-sans)]">
            {profile.growthTrajectory.narrative}
          </p>
          <GrowthBar direction={profile.growthTrajectory.direction} />
        </Card>

        {/* Personality */}
        <Card padding="md" elevated>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 font-[family-name:var(--font-dm-sans)]">
            Personality
          </h4>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3 font-[family-name:var(--font-dm-sans)]">
            {profile.personality.narrative}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {profile.personality.traits.map((trait) => (
              <TagPill key={trait} label={trait} variant="purple" />
            ))}
          </div>
        </Card>
      </div>

      {/* Professor Notes — full width */}
      {profile.professorNotes.length > 0 && (
        <Card padding="md" elevated>
          <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3 font-[family-name:var(--font-dm-sans)]">
            Professor Notes
          </h4>
          <ul className="space-y-2">
            {profile.professorNotes.map((note, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                <span className="text-[#f36f21] shrink-0">&#x2022;</span>
                <span className="leading-relaxed">{note}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Generated timestamp */}
      <p className="text-xs text-[var(--text-muted)] mt-4 font-[family-name:var(--font-dm-sans)]">
        Profile generated {new Date(profile.generatedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
        {' · '}Based on {profile.sessionCount} session{profile.sessionCount !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
