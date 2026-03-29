'use client'

import { useState } from 'react'
import { BRAND, ROUTES } from '@/lib/constants'
import type { SubscriptionAccess } from '@/types'

interface PaywallModalProps {
  reason: SubscriptionAccess['reason'] | null
  onClose?: () => void
}

export function PaywallModal({ reason, onClose }: PaywallModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl p-8 shadow-2xl animate-fade-up relative overflow-hidden"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-accent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative corner glow */}
        <div 
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: BRAND.ORANGE }}
        />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-2xl leading-none text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        )}

        <div className="text-center mb-8 relative z-10">
          <h2 className="font-[family-name:var(--font-playfair)] text-[var(--text-primary)] text-3xl font-bold mb-3 tracking-tight">
            Upgrade to Continue
          </h2>
          <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)] max-w-sm mx-auto">
            {subtext}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8 relative z-10">
          {/* Monthly card */}
          <button
            onClick={() => handleCheckout('monthly')}
            disabled={loadingPlan !== null}
            className="flex-1 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg text-left disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none group"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-accent)',
            }}
          >
            <div
              className="text-xs font-bold uppercase tracking-widest mb-2 font-[family-name:var(--font-dm-sans)] transition-colors group-hover:text-[#f36f21]"
              style={{ color: 'var(--text-muted)' }}
            >
              Flexible
            </div>
            <div
              className="text-[var(--text-primary)] text-2xl font-bold mb-1 font-[family-name:var(--font-playfair)]"
            >
              $25<span className="text-lg text-[var(--text-muted)] font-normal">/mo</span>
            </div>
            <div
              className="text-sm font-[family-name:var(--font-dm-sans)] leading-relaxed mt-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Pay month-to-month. Cancel anytime.
            </div>
            {loadingPlan === 'monthly' && (
              <div
                className="text-xs mt-3 font-semibold font-[family-name:var(--font-dm-sans)] animate-pulse"
                style={{ color: BRAND.ORANGE }}
              >
                Redirecting securely...
              </div>
            )}
          </button>

          {/* Annual card */}
          <button
            onClick={() => handleCheckout('annual')}
            disabled={loadingPlan !== null}
            className="flex-1 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg text-left relative disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none bg-gradient-to-b"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(243, 111, 33, 0.03), rgba(243, 111, 33, 0.1))`,
              border: `1px solid ${BRAND.ORANGE}40`,
            }}
          >
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest rounded-full px-3 py-1 font-bold shadow-sm"
              style={{ backgroundColor: BRAND.ORANGE, color: '#fff' }}
            >
              Best Value
            </span>
            <div
              className="text-xs font-bold uppercase tracking-widest mb-2 font-[family-name:var(--font-dm-sans)]"
              style={{ color: BRAND.ORANGE }}
            >
              Annual
            </div>
            <div
              className="text-[var(--text-primary)] text-2xl font-bold mb-1 font-[family-name:var(--font-playfair)]"
            >
              $20<span className="text-lg text-[var(--text-muted)] font-normal">/mo</span>
            </div>
            <div
              className="text-sm font-[family-name:var(--font-dm-sans)] leading-relaxed mt-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              Billed $240 yearly. Save $60 instantly.
            </div>
            {loadingPlan === 'annual' && (
              <div
                className="text-xs mt-3 font-semibold font-[family-name:var(--font-dm-sans)] animate-pulse"
                style={{ color: BRAND.ORANGE }}
              >
                Redirecting securely...
              </div>
            )}
          </button>
        </div>

        <p
          className="text-center text-xs font-[family-name:var(--font-dm-sans)] relative z-10"
          style={{ color: 'var(--text-muted)' }}
        >
          Secure payment via Stripe. Your data naturally remains accessible.
        </p>
      </div>
    </div>
  )
}
