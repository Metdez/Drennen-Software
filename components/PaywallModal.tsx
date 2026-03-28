'use client'

import { useState } from 'react'
import { BRAND, ROUTES } from '@/lib/constants'
import type { SubscriptionAccess } from '@/types'

interface PaywallModalProps {
  reason: SubscriptionAccess['reason'] | null
}

export function PaywallModal({ reason }: PaywallModalProps) {
  const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null)

  const subtext =
    reason === 'free_used'
      ? 'Thank you for being an early user. The platform now requires a subscription to continue generating sessions.'
      : reason === 'trial_expired'
        ? 'Your free trial has ended. Subscribe to keep generating sessions.'
        : 'A subscription is required to generate new sessions.'

  async function handleCheckout(plan: 'monthly' | 'annual') {
    setLoadingPlan(plan)
    try {
      const res = await fetch(ROUTES.API_STRIPE_CHECKOUT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setLoadingPlan(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 shadow-xl animate-fade-up"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-[var(--text-primary)] text-xl font-bold mb-3">
          Upgrade to Continue
        </h2>

        <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)] mb-6">
          {subtext}
        </p>

        <div className="flex gap-4 mb-6">
          {/* Monthly card */}
          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan !== null}
            className="flex-1 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:opacity-90 text-left disabled:opacity-60"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <div
              className="text-sm font-semibold mb-1 font-[family-name:var(--font-dm-sans)]"
              style={{ color: 'var(--text-primary)' }}
            >
              Monthly
            </div>
            <div
              className="text-lg font-bold mb-2 font-[family-name:var(--font-playfair)]"
              style={{ color: BRAND.ORANGE }}
            >
              $X/mo
            </div>
            <div
              className="text-xs font-[family-name:var(--font-dm-sans)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Flexible monthly billing
            </div>
            {loadingPlan === 'monthly' && (
              <div
                className="text-xs mt-2 font-[family-name:var(--font-dm-sans)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Redirecting...
              </div>
            )}
          </button>

          {/* Annual card */}
          <button
            onClick={() => handleCheckout('annual')}
            disabled={loadingPlan !== null}
            className="flex-1 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:opacity-90 text-left relative disabled:opacity-60"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <span
              className="absolute top-3 right-3 text-xs rounded-full px-2 py-0.5 font-semibold"
              style={{ backgroundColor: BRAND.GREEN, color: '#fff' }}
            >
              Best Value
            </span>
            <div
              className="text-sm font-semibold mb-1 font-[family-name:var(--font-dm-sans)]"
              style={{ color: 'var(--text-primary)' }}
            >
              Annual
            </div>
            <div
              className="text-lg font-bold mb-2 font-[family-name:var(--font-playfair)]"
              style={{ color: BRAND.ORANGE }}
            >
              $X/yr
            </div>
            <div
              className="text-xs font-[family-name:var(--font-dm-sans)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Save with annual billing
            </div>
            {loadingPlan === 'annual' && (
              <div
                className="text-xs mt-2 font-[family-name:var(--font-dm-sans)]"
                style={{ color: 'var(--text-muted)' }}
              >
                Redirecting...
              </div>
            )}
          </button>
        </div>

        <p
          className="text-xs font-[family-name:var(--font-dm-sans)]"
          style={{ color: 'var(--text-muted)' }}
        >
          Your existing sessions and data remain accessible.
        </p>
      </div>
    </div>
  )
}
