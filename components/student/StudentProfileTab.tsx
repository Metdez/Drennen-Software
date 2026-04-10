'use client'

/**
 * StudentProfileTab — Profile tab for the per-student detail page.
 *
 * Fetches the student's AI-generated profile on mount and renders three
 * side-by-side cards:
 *  - Interests (observations + tag pills)
 *  - Career Direction (observations + field pills)
 *  - Personality (observations + trait pills)
 *
 * If the professor has added notes, they appear in a full-width card below
 * the grid.  Shows skeleton cards while loading and an inline error with retry
 * on failure.
 *
 * Rendered by: components/student/StudentDetailTabs.tsx (Profile tab)
 * Calls: GET /api/roster/[studentName]/profile
 */

import { useEffect, useState, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/lib/constants'
import type { StudentProfile } from '@/types'

/**
 * Defines the shape of properties expected by the StudentProfileTab component.
 * 1. What it does: Specifies the input interface for the StudentProfileTab component.
 * 2. Why it is used: Ensures type safety and clarity for the data passed into StudentProfileTab, making the component's API clear.
 * 3. Important implementation details: Currently, it only contains a single property, `studentName`, which is crucial for identifying the student whose profile needs to be fetched.
 */
interface Props {
  studentName: string
}

/**
 * Renders a placeholder UI that mimics a loading card, providing visual feedback during data fetching.
 * 1. What it does: Displays an animated skeleton card composed of placeholder shapes, simulating where content will eventually appear.
 * 2. Why it is used: Enhances user experience by indicating that content is being loaded, reducing perceived wait times and preventing sudden layout shifts.
 * 3. Important implementation details: It utilizes the `Card` component for its base structure and applies Tailwind's `animate-pulse` class to create a shimmering effect. Various `div` elements with `bg-[var(--border-accent)]` and rounded corners are used to represent text lines and tags.
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
          <div className="h-6 w-14 bg-[var(--border-accent)] rounded-full" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Renders a small, styled, pill-shaped tag with a label and a customizable color.
 * 1. What it does: Displays a text label within a visually distinct, rounded pill element, with color variations.
 * 2. Why it is used: Provides a consistent and aesthetically pleasing way to categorize or highlight specific pieces of information, such as interests, career fields, or personality traits, within the student profile.
 * 3. Important implementation details: Accepts `label` (string) and an optional `variant` ('purple', 'orange', 'green') props. The `colors` object maps these variants to specific Tailwind CSS classes for background, text, and border styling, ensuring uniformity. It uses `inline-block` for proper display and sizing.
 */
function TagPill({ label, variant = 'purple' }: { label: string; variant?: 'purple' | 'orange' | 'green' }) {
  const colors = {
    purple: 'bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40',
    orange: 'bg-[#f36f21]/20 text-[#f36f21] border-[#f36f21]/40',
    green: 'bg-[#0f6b37]/20 text-[#4ae168] border-[#0f6b37]/40',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full border ${colors[variant]} font-[family-name:var(--font-dm-sans)]`}>
      {label}
    </span>
  )
}

/**
 * Renders a consistent, stylized heading for different content sections within the student profile.
 * 1. What it does: Displays a heading with a specific font style, color, and capitalization for content sections.
 * 2. Why it is used: Ensures a uniform and clear structure for various parts of the student profile (e.g., "Interests", "Career Direction"), improving readability and navigability.
 * 3. Important implementation details: Renders an `h4` HTML element. It applies specific Tailwind CSS classes to achieve a distinct look: `text-[11px]`, `font-semibold`, `text-[var(--text-muted)]`, `uppercase`, `tracking-widest`, and a custom font family.
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)] mb-3">
      {children}
    </h4>
  )
}

/**
 * Renders an unordered list of strings, each item prefixed with a stylized bullet point.
 * 1. What it does: Displays an array of strings as a bulleted list, where each bullet is a custom right-pointing triangle.
 * 2. Why it is used: Provides a clean and easily scannable format for presenting descriptive text, such as student observations or professor notes, within the profile sections.
 * 3. Important implementation details: It takes an `items` array of strings. If the array is empty or `null`, it gracefully returns `null` to prevent rendering an empty list. Each list item (`li`) includes a custom `&#x25B8;` character styled as a bullet point.
 */
function ObservationList({ items }: { items: string[] }) {
  if (!items?.length) return null
  return (
    <ul className="space-y-2 mt-3 mb-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-snug">
          <span className="text-[#f36f21] shrink-0 opacity-80 pt-0.5 text-xs">&#x25B8;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * A client-side React component that fetches, displays, and manages the view of a student's comprehensive profile.
 * 1. What it does: Fetches detailed profile information for a given student from an API, handles loading and error states, and then renders the profile data, including interests, career direction, personality traits, and professor notes.
 * 2. Why it is used: Serves as the primary interface for viewing a student's collected insights, integrating various data points into a cohesive and user-friendly display within a larger application context.
 * 3. Important implementation details: Uses `useState` to manage `profile` data, `loading` status, and `error` messages. The `fetchProfile` function, memoized with `useCallback`, handles the API call and subsequent state updates, including robust error handling. `useEffect` triggers data fetching on component mount. It conditionally renders `SkeletonCard`s during loading, an error message with a retry button on failure, or the full profile content using composed sub-components like `Card`, `SectionLabel`, `ObservationList`, and `TagPill`. The component is marked with `'use client'` to indicate it's a client-side component.
 */
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
      {/* 3-card grid: Interests, Career Direction, Personality (Growth moved to Growth tab) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Interests */}
        <Card padding="md" elevated className="flex flex-col">
          <SectionLabel>Interests</SectionLabel>
          <ObservationList items={profile.interests.observations} />
          <div className="mt-auto pt-4 mt-4 border-t border-[var(--border-accent)] flex flex-wrap gap-1.5">
            {profile.interests.tags.map((tag) => (
              <TagPill key={tag} label={tag} variant="purple" />
            ))}
          </div>
        </Card>

        {/* Career Direction */}
        <Card padding="md" elevated className="flex flex-col">
          <SectionLabel>Career Direction</SectionLabel>
          <ObservationList items={profile.careerDirection.observations} />
          <div className="mt-auto pt-4 mt-4 border-t border-[var(--border-accent)] flex flex-wrap gap-1.5">
            {profile.careerDirection.fields.map((field) => (
              <TagPill key={field} label={field} variant="orange" />
            ))}
          </div>
        </Card>

        {/* Personality */}
        <Card padding="md" elevated className="flex flex-col">
          <SectionLabel>Personality</SectionLabel>
          <ObservationList items={profile.personality.observations} />
          <div className="mt-auto pt-4 mt-4 border-t border-[var(--border-accent)] flex flex-wrap gap-1.5">
            {profile.personality.traits.map((trait) => (
              <TagPill key={trait} label={trait} variant="purple" />
            ))}
          </div>
        </Card>
      </div>

      {/* Professor Notes — full width. These entries mirror what the Growth tab editor reads/writes so the shared notes stay synced across tabs. */}
      {profile.professorNotes.length > 0 && (
        <Card padding="md" elevated className="border-[#0f6b37]/20 bg-[#0f6b37]/5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f6b37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <h3 className="text-sm font-bold text-[#0f6b37] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Professor Notes
            </h3>
          </div>
          <ul className="space-y-2 mt-3 mb-4">
            {profile.professorNotes.map((note, i) => (
              <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-snug">
                <span className="text-[#0f6b37] shrink-0 opacity-80 pt-0.5 text-xs">&#x25B8;</span>
                <span>{note}</span>
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
