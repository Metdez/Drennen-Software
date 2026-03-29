'use client'

import { useState, useEffect } from 'react'
import { useSubscription } from '@/components/subscription/SubscriptionContext'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { BRAND } from '@/lib/constants'

const DISMISS_KEY = 'subscription_banner_dismissed'

export function SubscriptionBanner() {
  const { reason, trialDaysRemaining } = useSubscription()
  const [dismissed, setDismissed] = useState(true)
  const [showPaywall, setShowPaywall] = useState(false)

  useEffect(() => {
    // Only dismissible for active trials
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true')
  }, [])

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  // Active subscriptions don't need a banner
  if (!reason || reason === 'no_subscription') {
    return null
  }

  // If it's a trial, and they dismissed it, hide it
  if (reason === 'trial' && dismissed) {
    return null
  }

  let bannerContent = null

  if (reason === 'trial') {
    bannerContent = (
      <div
        className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between shadow-sm animate-fade-up"
        style={{
          background: 'var(--surface-elevated)',
          borderLeft: `4px solid ${BRAND.PURPLE}`,
          borderTop: '1px solid var(--border-accent)',
          borderRight: '1px solid var(--border-accent)',
          borderBottom: '1px solid var(--border-accent)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <p className="text-[13px] font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-primary)' }}>
            Free trial &mdash; <span className="font-semibold">{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}</span> remaining.
          </p>
          <button
            onClick={() => setShowPaywall(true)}
            className="text-[13px] font-bold hover:underline"
            style={{ color: BRAND.PURPLE }}
          >
            Upgrade to Pro
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-xl leading-none px-2 rounded hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Dismiss"
        >
          &times;
        </button>
      </div>
    )
  } else if (reason === 'trial_expired' || reason === 'free_used') {
    // Required upgrade states (cannot be dismissed)
    const text = reason === 'trial_expired' 
      ? "Your free trial has ended." 
      : "You've used your free session."
      
    bannerContent = (
      <div
        className="rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fade-up"
        style={{
          background: 'rgba(243, 111, 33, 0.05)',
          border: `1px solid rgba(243, 111, 33, 0.3)`,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-full" style={{ background: 'rgba(243, 111, 33, 0.1)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={BRAND.ORANGE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] font-medium" style={{ color: 'var(--text-primary)' }}>
            {text} <span style={{ color: 'var(--text-secondary)' }}>Subscribe to continue generating insights.</span>
          </p>
        </div>
        <button
          onClick={() => setShowPaywall(true)}
          className="whitespace-nowrap rounded-lg px-5 py-2.5 text-xs tracking-wide uppercase font-bold text-white transition-all duration-200 hover:opacity-90 font-[family-name:var(--font-dm-sans)] shadow-md"
          style={{ backgroundColor: BRAND.ORANGE }}
        >
          Subscribe Now
        </button>
      </div>
    )
  }

  return (
    <>
      {bannerContent}
      {showPaywall && <PaywallModal reason={reason} onClose={() => setShowPaywall(false)} />}
    </>
  )
}
