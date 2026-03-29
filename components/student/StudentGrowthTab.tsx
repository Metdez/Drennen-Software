'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { GrowthIntelligencePanel } from '@/components/student/GrowthIntelligencePanel'
import { ProfessorNotesEditor } from '@/components/student/ProfessorNotesEditor'
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
        </div>
      </div>
    </Card>
  )
}

export function StudentGrowthTab({ studentName }: Props) {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(ROUTES.API_STUDENT_PROFILE(studentName))
      if (!res.ok) {
        let msg = 'Failed to load growth data.'
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
      setError(err instanceof Error ? err.message : 'Network error loading growth data.')
    } finally {
      setLoading(false)
    }
  }, [studentName])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="animate-fade-up space-y-4">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

  if (!profile?.growthIntelligence) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-up">
        <p className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Growth intelligence is being generated. This may take a moment.
        </p>
        <button
          onClick={fetchProfile}
          className="px-4 py-2 text-sm font-medium text-white bg-[#f36f21] rounded-lg hover:bg-[#d85f18] transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <GrowthIntelligencePanel growth={profile.growthIntelligence} />
      <ProfessorNotesEditor studentName={studentName} />

      {/* Generated timestamp */}
      <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Growth analysis generated {new Date(profile.generatedAt).toLocaleDateString('en-US', {
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
