'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '@/components/SubscriptionContext'
import { BRAND, ROUTES } from '@/lib/constants'
import Link from 'next/link'

const DISMISS_KEY = 'trial_banner_dismissed'

export function TrialBanner() {
  const { reason, trialDaysRemaining } = useSubscription()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true')
  }, [])

  if (reason !== 'trial' || trialDaysRemaining === null || dismissed) {
    return null
  }

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div
      className="rounded-lg px-4 py-3 mb-6 flex items-center justify-between"
      style={{
        background: 'var(--surface-elevated)',
        borderLeft: `4px solid ${BRAND.PURPLE}`,
      }}
    >
      <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
        Free trial &mdash; {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining.{' '}
        <Link
          href={ROUTES.ACCOUNT}
          className="font-medium hover:underline"
          style={{ color: BRAND.PURPLE }}
        >
          Subscribe now
        </Link>
      </p>
      <button
        onClick={handleDismiss}
        className="ml-4 text-lg leading-none px-1 rounded hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  )
}
