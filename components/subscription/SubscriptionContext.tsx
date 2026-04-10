'use client'

/**
 * @file SubscriptionContext.tsx
 * React context that exposes the current user's subscription access state app-wide.
 *
 * Consumed by:
 *   - components/subscription/SubscriptionBanner.tsx — shows trial/expired banners
 *   - components/subscription/PaywallModal.tsx — reads reason for context-specific copy
 *   - app/(app)/dashboard/page.tsx — gates the upload form via canGenerate
 *
 * Calls: GET /api/subscription — fetched once on mount, exposed via refreshSubscription
 *
 * Provider: SubscriptionProvider — wrap at the (app) layout level
 * Hook:     useSubscription()    — throws if called outside the provider
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { SubscriptionAccess } from '@/types'

/**
 * This interface defines the structure of the value provided by the `SubscriptionContext`.
 *
 * It is used to ensure type safety and consistency when consuming subscription-related data and functions throughout the application, providing a clear contract for what subscription information is available.
 *
 * Important properties include `canGenerate` (boolean indicating if the user can perform a generation), `reason` (explaining access restrictions), `trialDaysRemaining` (for trial accounts), `subscriptionStatus` (current subscription tier), `freeSessionsRemaining` (for free usage), `isLoading` (fetching state), and `refreshSubscription` (a function to re-fetch the data).
 */
interface SubscriptionContextValue {
  canGenerate: boolean
  reason: SubscriptionAccess['reason'] | null
  trialDaysRemaining: number | null
  subscriptionStatus: string
  freeSessionsRemaining: number
  isLoading: boolean
  refreshSubscription: () => Promise<void>
}

/**
 * This variable creates a React Context object specifically for managing user subscription data.
 *
 * It is used to provide subscription-related state and functions to descendant components without the need for prop drilling, making subscription data easily accessible throughout the application's component tree.
 *
 * The context is initialized with `undefined` and typed as `SubscriptionContextValue | undefined`. The `undefined` initial value allows the `useSubscription` hook to detect if it's being used outside of a `SubscriptionProvider`, prompting a helpful error.
 */
const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

// Feeds SubscriptionBanner and PaywallModal so trial states, warnings, and paywall gating stay in sync.

/**
 * This is a React functional component that acts as the provider for the `SubscriptionContext`. It encapsulates the logic for fetching, managing, and exposing the user's subscription status and access rights.
 *
 * It is used to centralize subscription data management and make it available to all components wrapped within its tree. By placing this provider high up in the component hierarchy, all parts of the application requiring subscription information can easily access the latest status without direct API calls or complex prop passing.
 *
 * Implementation details:
 * - It uses `useState` to manage the `data` (the raw `SubscriptionAccess` object) and an `isLoading` flag.
 * - The `fetchSubscription` function, memoized with `useCallback`, handles the asynchronous API call to `/api/subscription`, updating the state based on the response or any errors.
 * - An `useEffect` hook ensures that `fetchSubscription` is called once when the component mounts, initializing the subscription data.
 * - `useMemo` is used to construct the `value` object that is passed to the context provider. This memoization prevents unnecessary re-renders of consumer components by ensuring the context value only changes when its dependencies (`data`, `isLoading`, `fetchSubscription`) actually change.
 * - It renders `SubscriptionContext.Provider` to make the computed `value` available to its `children` components.
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubscriptionAccess | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/subscription')
      if (!res.ok) throw new Error('Failed to fetch subscription')
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      canGenerate: data?.canGenerate ?? false,
      reason: data?.reason ?? null,
      trialDaysRemaining: data?.trialDaysRemaining ?? null,
      subscriptionStatus: data?.subscriptionStatus ?? 'none',
      freeSessionsRemaining: data?.freeSessionsRemaining ?? 0,
      isLoading,
      refreshSubscription: fetchSubscription,
    }),
    [data, isLoading, fetchSubscription],
  )

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
}

/**
 * This custom React Hook provides a convenient and type-safe way for functional components to consume the subscription context value.
 *
 * It is used to easily access the current user's subscription status, access rights (e.g., `canGenerate`, `freeSessionsRemaining`), the loading state, and a function (`refreshSubscription`) to manually re-fetch the subscription data from anywhere within the `SubscriptionProvider`'s component tree.
 *
 * Implementation details:
 * - It internally calls `useContext(SubscriptionContext)` to retrieve the context's current value.
 * - A crucial runtime check is performed: if the context value is `undefined` (meaning the hook was called outside of a `SubscriptionProvider`), it throws an error. This helps developers identify and correct incorrect usage during development.
 */
export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return ctx
}
