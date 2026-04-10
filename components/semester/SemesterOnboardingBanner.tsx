/**
 * SemesterOnboardingBanner — First-time banner prompting professors to create semesters.
 *
 * Appears when: no semesters exist yet AND there are unassigned sessions AND the user
 * has not dismissed it. Dismissal state is persisted to localStorage under
 * `semester_onboarding_dismissed`. On dismiss or when hidden, still renders the
 * create/assign modals as portals so they can be triggered programmatically.
 *
 * Clicking "Set Up Semesters" opens SemesterManageModal; on save it automatically
 * opens AssignSessionsModal to immediately assign existing sessions.
 *
 * Rendered by: app/(app)/dashboard/page.tsx (or history page),
 *              typically at the top of protected pages that list sessions
 * Reads: SemesterContext (semesters, hasUnassigned, loading, refreshSemesters)
 */
'use client'

import { useState, useEffect } from 'react'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { SemesterManageModal } from '@/components/semester/SemesterManageModal'
import { AssignSessionsModal } from '@/components/semester/AssignSessionsModal'
import { BRAND } from '@/lib/constants'

/** localStorage key used to persist the user's one-time dismissal of this banner. */
/**
 * What it does: Defines the key used to store the dismissal status of the semester onboarding banner in local storage.
 * Why it is used: To persist the user's decision to dismiss the banner, ensuring it only appears once unless explicitly reset.
 * Important implementation details: It's a simple string constant, 'semester_onboarding_dismissed', used with `localStorage.getItem` and `localStorage.setItem`.
 */
const LS_KEY = 'semester_onboarding_dismissed'

/**
 * What it does: Displays a prominent banner to users who have unassigned sessions and no existing semesters, encouraging them to set up semesters.
 * Why it is used: To guide new or unorganized users towards leveraging the semester organization feature, which unlocks advanced analytics and comparisons.
 * Important implementation details: The banner's visibility is controlled by several factors: loading state, whether it has been dismissed (stored in `localStorage`), if semesters already exist, and if there are any unassigned sessions. It uses `useState` and `useEffect` for managing its own dismissal state and the open/closed state of associated modals. Clicking 'Set Up Semesters' opens `SemesterManageModal`, and upon successful creation, automatically opens `AssignSessionsModal`. The banner can also be dismissed via an 'x' button, which persists the dismissal in local storage.
 */
export function SemesterOnboardingBanner() {
  const { semesters, hasUnassigned, loading, refreshSemesters } =
    useSemesterContext()
  // Watches the semester list + unassigned flag so onboarding modals open in the same flow as the selector/context.

  const [dismissed, setDismissed] = useState(true) // default hidden to avoid flash
  const [createOpen, setCreateOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(LS_KEY) === 'true')
  }, [])

  // Don't show while loading, if dismissed, or if there are already semesters,
  // or if there are no unassigned sessions
  if (loading || dismissed || semesters.length > 0 || !hasUnassigned) {
    return (
      <>
        <SemesterManageModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            refreshSemesters()
            // After creating a semester, open the assign modal
            setAssignOpen(true)
          }}
        />
        <AssignSessionsModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => refreshSemesters()}
        />
      </>
    )
  }

  function handleDismiss() {
    localStorage.setItem(LS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <>
      <div
        className="rounded-xl p-5 mb-6 animate-fade-up"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${BRAND.ORANGE}`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3
              className="text-lg font-bold mb-1"
              style={{
                fontFamily: 'var(--font-playfair)',
                color: 'var(--text-primary)',
              }}
            >
              Organize by Semester
            </h3>
            <p
              className="text-sm mb-4"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                color: 'var(--text-secondary)',
              }}
            >
              You have sessions that aren&apos;t assigned to a semester. Create
              your first semester to unlock comparison and better analytics.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="text-sm font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: BRAND.ORANGE,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Set Up Semesters
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="text-xl leading-none px-1 rounded hover:opacity-70 transition-opacity shrink-0"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      </div>

      <SemesterManageModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          refreshSemesters()
          setAssignOpen(true)
        }}
      />
      <AssignSessionsModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => refreshSemesters()}
      />
    </>
  )
}
