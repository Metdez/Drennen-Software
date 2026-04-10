'use client'

/**
 * StudentGrowthTab — Growth intelligence tab for the per-student detail page.
 *
 * Fetches the student's AI profile on mount and renders:
 *  - GrowthIntelligencePanel (thinking sophistication, theme evolution, critical
 *    thinking, engagement pattern, AI recommendations)
 *  - ProfessorNotesEditor (CRUD notes widget)
 *  - Generated-at timestamp + session count
 *
 * Shows skeleton cards while loading, an inline error with retry on failure,
 * and a "still generating" prompt if the profile exists but growthIntelligence
 * is null (fire-and-forget job hasn't completed yet).
 *
 * Rendered by: components/student/StudentDetailTabs.tsx (Growth tab)
 * Calls: GET /api/roster/[studentName]/profile
 */

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { GrowthIntelligencePanel } from '@/components/student/GrowthIntelligencePanel'
import { ProfessorNotesEditor } from '@/components/student/ProfessorNotesEditor'
import { ROUTES } from '@/lib/constants'
import type { StudentProfile } from '@/types'

/**
 * What it does: Defines the properties accepted by the `StudentGrowthTab` component.
 * Why it is used: To specify the required input for the component and enforce type safety.
 * Important implementation details: It currently requires `studentName` to identify the student whose growth data needs to be fetched and displayed.
 */
interface Props {
  studentName: string
}

/**
 * What it does: Renders a visual placeholder (skeleton) card with an animated pulse effect.
 * Why it is used: To provide visual feedback to the user that content is actively being loaded, improving perceived performance and user experience.
 * Important implementation details: It utilizes the `Card` component for consistent styling and applies Tailwind CSS classes like `animate-pulse` to create the loading animation. The internal `div` elements mimic the expected content structure using utility classes for height, width, background color (`var(--border-accent)`), and rounded corners.
 */
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

/**
 * What it does: A client-side React component that is responsible for fetching, displaying, and managing a student's growth intelligence data and associated professor notes.
 * Why it is used: It serves as a dedicated tab within a student's profile interface, allowing educators to review AI-generated insights into a student's growth and to add or edit their own contextual notes.
 * Important implementation details:
 * - Uses `useState` to manage the student `profile` data, `loading` status, and any `error` messages.
 * - Employs `useCallback` to memoize the `fetchProfile` asynchronous function, which prevents unnecessary re-creations and optimizes the `useEffect` dependency.
 * - The `fetchProfile` function makes an API call to `ROUTES.API_STUDENT_PROFILE(studentName)`, handles various error scenarios (network issues, API-specific errors, missing data), and updates the component's state accordingly.
 * - A `useEffect` hook triggers the `fetchProfile` function upon component mount and whenever its dependencies change.
 * - The component conditionally renders different UIs based on its state: `SkeletonCard`s during loading, an error message with a retry button if fetching fails, a message indicating that growth intelligence is being generated (with a refresh option), or the actual `GrowthIntelligencePanel` and `ProfessorNotesEditor` components when data is successfully loaded.
 * - It displays a timestamp of when the growth analysis was generated and the number of sessions it's based on, providing important context.
 * - The `'use client'` directive indicates that this component runs on the client side, enabling the use of React hooks like `useState` and `useEffect` for interactive features.
 */
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
      {/* Growth intelligence and professor notes share the same profile payload the roster drills into, so this tab simply repackages that data for deeper AI insights and note editing. */}
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
