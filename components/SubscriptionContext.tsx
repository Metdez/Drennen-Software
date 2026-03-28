'use client'

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

interface SubscriptionContextValue {
  canGenerate: boolean
  reason: SubscriptionAccess['reason'] | null
  trialDaysRemaining: number | null
  subscriptionStatus: string
  freeSessionsRemaining: number
  isLoading: boolean
  refreshSubscription: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined)

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

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return ctx
}
