'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SemesterSummary, SessionSummary } from '@/types'

export interface PortfolioSections {
  sessions: boolean
  analytics: boolean
  roster: boolean
  reports: boolean
}

export interface PortfolioData {
  token: string
  semesters: SemesterSummary[]
  sessions: SessionSummary[]
  totalStudents: number
  totalSubmissions: number
  dateRange: { earliest: string; latest: string } | null
  sections: PortfolioSections
}

interface PortfolioContextValue {
  data: PortfolioData | null
  loading: boolean
  error: boolean
}

const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined)

export function PortfolioProvider({ token, children }: { token: string; children: ReactNode }) {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchLanding() {
      try {
        const res = await fetch(`/api/portfolio/${token}`)
        if (!res.ok) {
          setError(true)
          return
        }
        const json = await res.json()
        setData({ token, ...json })
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    fetchLanding()
  }, [token])

  return (
    <PortfolioContext.Provider value={{ data, loading, error }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}
