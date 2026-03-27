'use client'

import { useState, useEffect } from 'react'
import { useSemesterContext } from '@/components/SemesterContext'
import { SemesterManageModal } from '@/components/SemesterManageModal'
import { AssignSessionsModal } from '@/components/AssignSessionsModal'
import { BRAND } from '@/lib/constants'

const LS_KEY = 'semester_onboarding_dismissed'

export function SemesterOnboardingBanner() {
  const { semesters, hasUnassigned, loading, refreshSemesters } =
    useSemesterContext()

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
