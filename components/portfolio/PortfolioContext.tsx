'use client'

/**
 * PortfolioContext — Client-side data store for a public portfolio view.
 *
 * Fetches the portfolio landing payload on mount via GET /api/portfolio/[token]
 * and exposes it to all descendant components without prop drilling.  Unlike
 * SemesterContext there is no URL-param sync; the token is fixed for the
 * lifetime of the page.
 *
 * Provides:
 *  - data       — PortfolioData (token, semesters, sessions, totals, sections)
 *  - loading    — true while the initial fetch is in-flight
 *  - error      — true if the fetch failed or returned a non-OK status
 *
 * Consumed by: PortfolioNav and all app/(public)/portfolio/[token]/** pages
 * Calls: GET /api/portfolio/[token]
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { SemesterSummary, SessionSummary } from '@/types'

/** Defines the structure for tracking the visibility or enabled status of different sections within the portfolio UI. This interface is used to control which parts of the portfolio interface are active or displayed, allowing for feature toggling or dynamic UI rendering based on permissions or configuration. Each property is a boolean indicating the status of a specific portfolio section (sessions, analytics, roster, reports). */
export interface PortfolioSections {
  sessions: boolean
  analytics: boolean
  roster: boolean
  reports: boolean
}

/** Defines the comprehensive data structure for an entire user's portfolio. This interface encapsulates all the necessary information (token, summaries, totals, date range, section states) required to render and manage a user's portfolio view, serving as the central data model for the PortfolioContext. It includes an authentication `token`, arrays of `SemesterSummary` and `SessionSummary`, aggregated `totalStudents` and `totalSubmissions`, an optional `dateRange` object indicating the earliest and latest dates of data, and a `PortfolioSections` object to manage UI state. */
export interface PortfolioData {
  token: string
  semesters: SemesterSummary[]
  sessions: SessionSummary[]
  totalStudents: number
  totalSubmissions: number
  dateRange: { earliest: string; latest: string } | null
  sections: PortfolioSections
}

/** Defines the shape of the object provided by the PortfolioContext. This interface is used to standardize the data structure that consumers of the context will receive, ensuring type safety and consistency when accessing portfolio-related data, loading status, and error state. It contains `data` (of type `PortfolioData` or `null` if not yet loaded or an error occurred), a `loading` boolean indicating if data is currently being fetched, and an `error` boolean indicating if an error occurred during data fetching. */
interface PortfolioContextValue {
  data: PortfolioData | null
  loading: boolean
  error: boolean
}

/** Creates a React Context object specifically for managing portfolio-related data and state. This context is used to allow components deep in the component tree to access portfolio data, loading status, and error state without prop-drilling. It provides a way to share global state relevant to the user's portfolio. It is initialized with `undefined` to indicate that it must be used within a `PortfolioProvider` and expects a value conforming to `PortfolioContextValue`. */
const PortfolioContext = createContext<PortfolioContextValue | undefined>(undefined)

/** A React component that acts as the provider for PortfolioContext. It is responsible for fetching a user's portfolio data from an API endpoint, managing its loading and error states, and then making this data and state available to all descendant components via the PortfolioContext. This centralizes data management and state logic for the portfolio. It accepts a `token` prop, which is used for API calls to retrieve portfolio data. It uses `useState` to manage `data`, `loading`, and `error` states, and `useEffect` to perform an asynchronous API call (`/api/portfolio/${token}`) when the component mounts or when the `token` changes. It handles the API response, setting `data` on success or `error` on failure, and always sets `loading` to `false` in the `finally` block. Finally, it wraps its `children` with `PortfolioContext.Provider`, passing the current `data`, `loading`, and `error` states as the context value. */
// Fetches the portfolio snapshot that powers the portal's shared overview, navigation, and analytics views.
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

/** A custom React Hook designed to easily consume the PortfolioContext. This hook provides a convenient and type-safe way for functional components to access the portfolio data, loading status, and error state provided by the `PortfolioProvider` without directly calling `useContext` and remembering the context object. It calls `useContext(PortfolioContext)` to retrieve the current context value and includes a runtime check (`if (!ctx)`) to ensure the hook is called within a `PortfolioProvider`, throwing an error if not, which helps prevent common developer mistakes. It returns the `PortfolioContextValue` object. */
// Hook that lets portal components read the shared portfolio snapshot.
export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}
