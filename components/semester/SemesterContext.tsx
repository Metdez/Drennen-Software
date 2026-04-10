/**
 * SemesterContext — Global semester filter state for the analytics and history pages.
 *
 * Provides a React context that:
 *  - Fetches all semesters for the current professor on mount via GET /api/semesters
 *  - Derives the active semester from the `?semester=` URL query param, falling
 *    back to the first active semester, then null (all sessions)
 *  - Exposes setSemester() which updates the URL query param via router.replace()
 *    to keep the filter shareable via URL
 *  - Tracks whether any sessions remain unassigned (for onboarding banner)
 *
 * Consumed by: components/semester/SemesterSelector.tsx,
 *              components/semester/AssignSessionsModal.tsx,
 *              components/semester/SemesterManageModal.tsx,
 *              components/semester/SemesterOnboardingBanner.tsx,
 *              app/(app)/analytics/page.tsx,
 *              app/(app)/history/page.tsx
 *
 * Calls: GET /api/semesters
 */
'use client'

import { SemesterSummary } from '@/types'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/** Public API exposed by SemesterContext. */
/**
 * Public API exposed by SemesterContext.
 * 1. What it does: Defines the structure and types of the values made available by the SemesterContext.
 * 2. Why it is used: To provide a consistent and type-safe interface for components consuming semester-related state and functions.
 * 3. Important implementation details: Includes the full list of semesters, the currently selected semester's ID and object, a function to update the active semester, loading status, a flag for unassigned sessions, and a method to re-fetch semesters.
 */
interface SemesterContextValue {
  /** Full list of semesters for the current professor (active + archived). */
  semesters: SemesterSummary[]
  /** Currently selected semester ID, or null for "all sessions". */
  activeSemesterId: string | null
  /** The full SemesterSummary object for activeSemesterId, or null. */
  activeSemester: SemesterSummary | null
  /** Update the active semester filter; syncs to the `?semester=` URL param. */
  setSemester: (id: string | null) => void
  /** True while the initial /api/semesters fetch is in-flight. */
  loading: boolean
  /** True when at least one session has no semester_id assigned. */
  hasUnassigned: boolean
  /** Re-fetches semester list (call after create/archive/assign operations). */
  refreshSemesters: () => Promise<void>
}

/**
 * Creates a React context specifically for managing semester-related data and functions.
 * 1. What it does: Acts as the container for the semester-related state that can be shared across the component tree.
 * 2. Why it is used: It allows components deep within the hierarchy to access and interact with semester data (e.g., active semester, list of semesters) without the need for prop drilling.
 * 3. Important implementation details: It's initialized with `undefined`, indicating that any attempt to use the context outside of a `SemesterProvider` will result in an error, which is enforced by the `useSemesterContext` hook.
 */
const SemesterContext = createContext<SemesterContextValue | undefined>(undefined)

/**
 * The main provider component for the SemesterContext, responsible for managing semester-related state and logic.
 * 1. What it does: Fetches semester data, maintains the active semester state (including synchronization with URL query parameters), and provides these values to its children via the SemesterContext.
 * 2. Why it is used: It encapsulates all the logic for fetching, selecting, and updating semesters, making it a central point for semester management. By wrapping a part of the application with this provider, all nested components can easily access semester information.
 * 3. Important implementation details:
 *    - Uses `useState` to manage `semesters`, `loading`, and `hasUnassigned` state.
 *    - Utilizes `useEffect` to trigger an initial fetch of semesters on component mount and `useCallback` to memoize the `fetchSemesters` function.
 *    - Reads the `?semester=` query parameter from the URL using `useSearchParams` to determine the initial `activeSemesterId`.
 *    - Provides a `setSemester` function that updates the URL query parameter using `useRouter` and `usePathname` to ensure URL synchronization without polluting browser history.
 *    - `activeSemesterId` and `activeSemester` are derived using `useMemo` for efficient memoization.
 *    - The provided `value` for the context is also memoized to prevent unnecessary re-renders of consuming components.
 */
export function SemesterProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [semesters, setSemesters] = useState<SemesterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUnassigned, setHasUnassigned] = useState(false)

  // Read the ?semester= query param to initialise the filter from the URL
  const semesterParam = searchParams.get('semester')

  const fetchSemesters = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/semesters')
      if (!res.ok) throw new Error('Failed to fetch semesters')
      const data = await res.json()
      setSemesters(data.semesters ?? [])
      setHasUnassigned((data.unassignedCount ?? 0) > 0)
    } catch {
      setSemesters([])
      setHasUnassigned(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSemesters()
  }, [fetchSemesters])

  // Priority: URL param → first active semester → null (all sessions)
  const activeSemesterId = useMemo(() => {
    if (semesterParam) return semesterParam
    const active = semesters.find((s) => s.status === 'active')
    return active?.id ?? null
  }, [semesterParam, semesters])

  const activeSemester = useMemo(() => {
    if (!activeSemesterId) return null
    return semesters.find((s) => s.id === activeSemesterId) ?? null
  }, [activeSemesterId, semesters])

  /**
   * Update the active semester filter. Passes null to show all sessions.
   * Uses router.replace() to avoid polluting browser history with filter changes.
   * Preserves any other existing query params (e.g. tab= on the analytics page).
   */
  const setSemester = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id) {
        params.set('semester', id)
      } else {
        params.delete('semester')
      }
      const qs = params.toString()
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`)
    },
    [router, pathname, searchParams],
  )

  const value = useMemo<SemesterContextValue>(
    () => ({
      semesters,
      activeSemesterId,
      activeSemester,
      setSemester,
      loading,
      hasUnassigned,
      refreshSemesters: fetchSemesters,
    }),
    [semesters, activeSemesterId, activeSemester, setSemester, loading, hasUnassigned, fetchSemesters],
  )

  return <SemesterContext.Provider value={value}>{children}</SemesterContext.Provider>
}

/**
 * A custom React hook to conveniently consume the SemesterContext.
 * 1. What it does: Provides a simple, type-safe way for functional components to access the semester-related state and functions exposed by the `SemesterContext`.
 * 2. Why it is used: It abstracts away the direct `useContext` call and adds a crucial check to ensure that the hook is only used within a `SemesterProvider`'s scope, preventing runtime errors and enforcing correct API usage.
 * 3. Important implementation details: It calls `useContext(SemesterContext)` and immediately checks if the returned context value is `undefined`. If it is, it throws an error, clearly indicating that the hook has been used incorrectly (i.e., outside its provider).
 */
export function useSemesterContext(): SemesterContextValue {
  const ctx = useContext(SemesterContext)
  if (!ctx) {
    throw new Error('useSemesterContext must be used within a SemesterProvider')
  }
  return ctx
}
