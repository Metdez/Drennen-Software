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

interface SemesterContextValue {
  semesters: SemesterSummary[]
  activeSemesterId: string | null
  activeSemester: SemesterSummary | null
  setSemester: (id: string | null) => void
  loading: boolean
  hasUnassigned: boolean
  refreshSemesters: () => Promise<void>
}

const SemesterContext = createContext<SemesterContextValue | undefined>(undefined)

export function SemesterProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [semesters, setSemesters] = useState<SemesterSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUnassigned, setHasUnassigned] = useState(false)

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

  const activeSemesterId = useMemo(() => {
    if (semesterParam) return semesterParam
    const active = semesters.find((s) => s.status === 'active')
    return active?.id ?? null
  }, [semesterParam, semesters])

  const activeSemester = useMemo(() => {
    if (!activeSemesterId) return null
    return semesters.find((s) => s.id === activeSemesterId) ?? null
  }, [activeSemesterId, semesters])

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

export function useSemesterContext(): SemesterContextValue {
  const ctx = useContext(SemesterContext)
  if (!ctx) {
    throw new Error('useSemesterContext must be used within a SemesterProvider')
  }
  return ctx
}
