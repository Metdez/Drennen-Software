'use client'

/**
 * SemesterSelector — Dropdown pill in NavHeader for switching the active semester filter.
 *
 * Reads SemesterContext (semesters, activeSemesterId, setSemester). Splits semesters into
 * active and archived groups separated by a divider. Selecting an option calls
 * setSemester() which updates the `?semester=` URL param via router.replace().
 * "Manage Semesters" links to ROUTES.SEMESTERS.
 *
 * Rendered by: components/layout/NavHeader.tsx
 * Reads: SemesterContext
 * Calls: None (state changes are handled by SemesterContext)
 */

import { useSemesterContext } from '@/components/semester/SemesterContext'
import { ROUTES } from '@/lib/constants'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/**
 * This client-side React component renders a dropdown menu that enables users to select and switch between different academic semesters or view all sessions. It provides a visual indication of the currently active semester and allows navigation to a dedicated semester management page.
 *
 * It is used to provide a convenient and consistent way for users to filter or scope the application's data based on a specific academic semester. This enhances usability by allowing quick context switching without navigating away from the current view.
 *
 * Important implementation details:
 * - It consumes the `SemesterContext` to access and manage the global active semester state, including `semesters`, `activeSemesterId`, `activeSemester`, `setSemester`, and `loading` status.
 * - Uses `useState` to manage the dropdown's open/closed state (`open`).
 * - Employs a `useRef` to target the component's container for handling outside clicks.
 * - An `useEffect` hook implements an event listener for `mousedown` to close the dropdown when a click occurs outside its boundaries.
 * - Semesters fetched from the context are filtered into `activeSemesters` and `archivedSemesters` for categorized display within the dropdown.
 * - Displays a "Loading..." message when semester data is being fetched.
 * - The primary button displays the name of the `activeSemester` or "All Sessions" if no specific semester is selected.
 * - The dropdown options allow users to set a specific semester as active using `setSemester(s.id)` or clear the selection with `setSemester(null)` for "All Sessions".
 * - Includes a `Link` to `ROUTES.SEMESTERS` to navigate to a page where semesters can be managed.
 * - Styling is primarily handled via inline styles, utilizing CSS variables for consistent theming.
 */
export function SemesterSelector() {
  const { semesters, activeSemesterId, activeSemester, setSemester, loading } =
    useSemesterContext()
  // Dropdown taps SemesterContext so analytics/history filters and management modals share the same semester scope.
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const activeSemesters = semesters.filter((s) => s.status === 'active')
  const archivedSemesters = semesters.filter((s) => s.status === 'archived')

  const label = activeSemester?.name ?? 'All Sessions'

  if (loading) {
    return (
      <div
        className="text-xs text-[var(--text-muted)] px-3 py-1 rounded-full"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
        }}
      >
        Loading...
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium transition-colors duration-200 flex items-center gap-1.5"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
          borderRadius: '9999px',
          padding: '4px 12px',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
        }}
      >
        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 220,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-accent)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 50,
            padding: '6px 0',
          }}
        >
          {/* Active semesters */}
          {activeSemesters.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSemester(s.id)
                setOpen(false)
              }}
              className="semester-option"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '8px 14px',
                background: s.id === activeSemesterId ? 'var(--surface)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--text-primary)',
                fontWeight: s.id === activeSemesterId ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (s.id !== activeSemesterId) e.currentTarget.style.background = 'var(--surface)'
              }}
              onMouseLeave={(e) => {
                if (s.id !== activeSemesterId) e.currentTarget.style.background = 'transparent'
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#f36f21',
                  flexShrink: 0,
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                {s.sessionCount} sessions
              </span>
            </button>
          ))}

          {/* Archived semesters */}
          {archivedSemesters.length > 0 && (
            <>
              {activeSemesters.length > 0 && (
                <div
                  style={{
                    height: 1,
                    background: 'var(--border)',
                    margin: '4px 14px',
                  }}
                />
              )}
              {archivedSemesters.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSemester(s.id)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 14px',
                    background: s.id === activeSemesterId ? 'var(--surface)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    color: 'var(--text-muted)',
                    fontWeight: s.id === activeSemesterId ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (s.id !== activeSemesterId) e.currentTarget.style.background = 'var(--surface)'
                  }}
                  onMouseLeave={(e) => {
                    if (s.id !== activeSemesterId) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--text-muted)',
                      flexShrink: 0,
                      opacity: 0.5,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.name}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {s.sessionCount}
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '4px 14px',
            }}
          />

          {/* All Sessions */}
          <button
            onClick={() => {
              setSemester(null)
              setOpen(false)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 14px',
              background: !activeSemesterId ? 'var(--surface)' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 13,
              color: 'var(--text-secondary)',
              fontWeight: !activeSemesterId ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (activeSemesterId) e.currentTarget.style.background = 'var(--surface)'
            }}
            onMouseLeave={(e) => {
              if (activeSemesterId) e.currentTarget.style.background = 'transparent'
            }}
          >
            All Sessions
          </button>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: 'var(--border)',
              margin: '4px 14px',
            }}
          />

          {/* Manage Semesters link */}
          <Link
            href={ROUTES.SEMESTERS}
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '8px 14px',
              fontSize: 13,
              color: '#f36f21',
              textDecoration: 'none',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Manage Semesters
          </Link>
        </div>
      )}
    </div>
  )
}
