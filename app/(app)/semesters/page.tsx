'use client'

import { useState } from 'react'
import { useSemesterContext } from '@/components/SemesterContext'
import { SemesterManageModal } from '@/components/SemesterManageModal'
import { AssignSessionsModal } from '@/components/AssignSessionsModal'
import { BRAND, ROUTES } from '@/lib/constants'
import type { SemesterSummary } from '@/types'

function formatDateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  return `${fmt(start)} \u2013 ${fmt(end)}`
}

export default function SemestersPage() {
  const { semesters, loading, hasUnassigned, refreshSemesters } =
    useSemesterContext()

  const [manageOpen, setManageOpen] = useState(false)
  const [editingSemester, setEditingSemester] =
    useState<SemesterSummary | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [archivingId, setArchivingId] = useState<string | null>(null)

  function openCreate() {
    setEditingSemester(null)
    setManageOpen(true)
  }

  function openEdit(semester: SemesterSummary) {
    setEditingSemester(semester)
    setManageOpen(true)
  }

  async function handleArchive(semester: SemesterSummary) {
    setArchivingId(semester.id)
    try {
      const res = await fetch(ROUTES.API_SEMESTER(semester.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      })
      if (res.ok) {
        await refreshSemesters()
      }
    } finally {
      setArchivingId(null)
    }
  }

  function handleSaved() {
    refreshSemesters()
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-4xl font-bold mb-2"
              style={{
                fontFamily: 'var(--font-playfair)',
                color: 'var(--text-primary)',
              }}
            >
              Semesters
            </h1>
            <div
              className="h-0.5 w-12 mb-3"
              style={{ backgroundColor: BRAND.ORANGE }}
            />
            <p
              className="text-sm"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                color: 'var(--text-secondary)',
              }}
            >
              Organize your sessions by semester for better tracking and
              comparison.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="text-sm font-medium rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90 shrink-0"
            style={{
              backgroundColor: BRAND.ORANGE,
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            Create New Semester
          </button>
        </div>
      </div>

      {/* Unassigned banner */}
      {hasUnassigned && semesters.length > 0 && (
        <div
          className="rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 animate-fade-up"
          style={{
            background: `${BRAND.ORANGE}0a`,
            border: `1px solid ${BRAND.ORANGE}33`,
          }}
        >
          <p
            className="text-sm"
            style={{
              fontFamily: 'var(--font-dm-sans)',
              color: 'var(--text-secondary)',
            }}
          >
            You have unassigned sessions that are not linked to any semester.
          </p>
          <button
            onClick={() => setAssignOpen(true)}
            className="text-sm font-medium rounded-lg px-4 py-2 transition-opacity hover:opacity-90 shrink-0"
            style={{
              color: BRAND.ORANGE,
              border: `1px solid ${BRAND.ORANGE}44`,
              fontFamily: 'var(--font-dm-sans)',
            }}
          >
            Assign Sessions
          </button>
        </div>
      )}

      {/* Content */}
      <div className="animate-fade-up-delay-1">
        {loading ? (
          <div
            className="text-center py-12 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Loading semesters...
          </div>
        ) : semesters.length === 0 ? (
          /* Empty state */
          <div
            className="rounded-xl p-10 text-center"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="text-5xl mb-4"
              style={{ color: 'var(--text-muted)', opacity: 0.4 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: 'var(--font-playfair)',
                color: 'var(--text-primary)',
              }}
            >
              No Semesters Yet
            </h3>
            <p
              className="text-sm mb-6 max-w-sm mx-auto"
              style={{
                fontFamily: 'var(--font-dm-sans)',
                color: 'var(--text-muted)',
              }}
            >
              Create your first semester to start organizing sessions and unlock
              semester-over-semester comparisons.
            </p>
            <button
              onClick={openCreate}
              className="text-sm font-medium rounded-lg px-5 py-2.5 text-white transition-opacity hover:opacity-90"
              style={{
                backgroundColor: BRAND.ORANGE,
                fontFamily: 'var(--font-dm-sans)',
              }}
            >
              Create First Semester
            </button>
          </div>
        ) : (
          /* Semester cards */
          <div className="space-y-3">
            {semesters.map((semester) => (
              <div
                key={semester.id}
                className="rounded-xl p-5 transition-colors"
                style={{
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <h3
                        className="text-base font-bold truncate"
                        style={{
                          fontFamily: 'var(--font-dm-sans)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {semester.name}
                      </h3>

                      {/* Status badge */}
                      <span
                        className="text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0"
                        style={{
                          backgroundColor:
                            semester.status === 'active'
                              ? `${BRAND.GREEN}1a`
                              : 'var(--border)',
                          color:
                            semester.status === 'active'
                              ? BRAND.GREEN
                              : 'var(--text-muted)',
                          border: `1px solid ${
                            semester.status === 'active'
                              ? `${BRAND.GREEN}33`
                              : 'var(--border)'
                          }`,
                        }}
                      >
                        {semester.status === 'active' ? 'Active' : 'Archived'}
                      </span>

                      {/* Session count badge */}
                      <span
                        className="text-xs font-medium rounded-full px-2.5 py-0.5 shrink-0"
                        style={{
                          backgroundColor: `${BRAND.PURPLE}14`,
                          color: BRAND.PURPLE,
                          border: `1px solid ${BRAND.PURPLE}22`,
                        }}
                      >
                        {semester.sessionCount} session
                        {semester.sessionCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <p
                      className="text-sm"
                      style={{
                        fontFamily: 'var(--font-dm-sans)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {formatDateRange(semester.startDate, semester.endDate)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(semester)}
                      className="text-xs rounded-lg px-3 py-1.5 transition-opacity hover:opacity-80"
                      style={{
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        fontFamily: 'var(--font-dm-sans)',
                      }}
                    >
                      Edit
                    </button>
                    {semester.status === 'active' && (
                      <button
                        onClick={() => handleArchive(semester)}
                        disabled={archivingId === semester.id}
                        className="text-xs rounded-lg px-3 py-1.5 transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          fontFamily: 'var(--font-dm-sans)',
                        }}
                      >
                        {archivingId === semester.id
                          ? 'Archiving...'
                          : 'Archive'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <SemesterManageModal
        open={manageOpen}
        onClose={() => {
          setManageOpen(false)
          setEditingSemester(null)
        }}
        editingSemester={editingSemester}
        onSaved={handleSaved}
      />
      <AssignSessionsModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssigned={() => refreshSemesters()}
      />
    </div>
  )
}
