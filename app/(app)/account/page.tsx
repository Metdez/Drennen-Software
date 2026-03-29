'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSubscription } from '@/components/subscription/SubscriptionContext'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { PortfolioSharePanel } from '@/components/layout/PortfolioSharePanel'
import { BRAND, ROUTES } from '@/lib/constants'

interface Invoice {
  date: string
  amount: number
  status: string | null
  url: string | null
}

export default function AccountPage() {
  const {
    subscriptionStatus,
    reason,
    trialDaysRemaining,
    isLoading: subscriptionLoading,
  } = useSubscription()

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setInvoicesLoading(true)
    try {
      const res = await fetch(ROUTES.API_STRIPE_INVOICES)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data.invoices ?? [])
      }
    } catch {
      // silently fail
    } finally {
      setInvoicesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const res = await fetch(ROUTES.API_STRIPE_PORTAL, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // silently fail
    } finally {
      setPortalLoading(false)
    }
  }

  function getStatusBadge() {
    const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'
    const isTrial = reason === 'trial'
    const isInactive =
      subscriptionStatus === 'canceled' ||
      subscriptionStatus === 'none' ||
      reason === 'trial_expired' ||
      reason === 'no_subscription'

    if (isActive && !isTrial) {
      return {
        label: 'Pro Active',
        bg: BRAND.GREEN,
        text: 'Unlimited sessions unlocked.',
      }
    }
    if (isTrial) {
      return {
        label: 'Trial Active',
        bg: BRAND.PURPLE,
        text: `You have ${trialDaysRemaining ?? 0} days remaining in your trial.`,
      }
    }
    if (isInactive) {
      return {
        label: 'Inactive',
        bg: BRAND.ORANGE,
        text: 'Your subscription is inactive. Upgrade to generate sessions.',
      }
    }
    return {
      label: subscriptionStatus || 'Unknown',
      bg: 'var(--border-accent)',
      text: 'Unable to determine subscription state.',
    }
  }

  const badge = getStatusBadge()
  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'usd',
    }).format(amount)
  }

  function formatDate(isoDate: string) {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      {showPaywall && (
        <div className="relative z-50">
          <PaywallModal reason={reason} onClose={() => setShowPaywall(false)} />
        </div>
      )}

      <div className="max-w-4xl mx-auto flex flex-col gap-10 lg:pl-4">
        {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
            Account Details
          </h1>
          <p className="text-[var(--text-secondary)] text-lg font-[family-name:var(--font-dm-sans)] max-w-xl">
            Manage your subscription, billing history, and portfolio sharing settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Primary actions & status) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Subscription Overview Card */}
          <div
            className="animate-fade-up-delay-1 rounded-3xl p-8 relative overflow-hidden group shadow-sm transition-all hover:shadow-md"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-accent)',
            }}
          >
            {/* Ambient Background Glow based on status */}
            <div 
              className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[80px] opacity-10 transition-colors duration-1000 pointer-events-none"
              style={{ background: badge.bg }}
            />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
                    Current Plan
                  </h2>
                  {!subscriptionLoading && (
                    <span
                      className="text-[11px] uppercase tracking-widest font-bold rounded-full px-3 py-1 shadow-sm"
                      style={{ backgroundColor: badge.bg, color: '#fff' }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                {subscriptionLoading ? (
                  <div className="h-5 w-48 bg-[var(--surface-elevated)] rounded-md animate-pulse mt-3" />
                ) : (
                  <p className="text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] text-sm">
                    {badge.text}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                {!subscriptionLoading && (
                  isSubscribed ? (
                    <button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="whitespace-nowrap rounded-xl px-6 py-3 text-sm font-bold transition-all duration-200 hover:opacity-80 disabled:opacity-50 font-[family-name:var(--font-dm-sans)] shadow-sm bg-[var(--surface-elevated)]"
                      style={{
                        color: 'var(--text-primary)',
                        border: `1px solid var(--border-accent)`,
                      }}
                    >
                      {portalLoading ? 'Redirecting...' : 'Manage Billing'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="whitespace-nowrap rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg font-[family-name:var(--font-dm-sans)] shadow-md"
                      style={{ backgroundColor: BRAND.ORANGE }}
                    >
                      Upgrade to Pro
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Portfolio Share Panel */}
          <div className="animate-fade-up-delay-2">
            <PortfolioSharePanel />
          </div>
        </div>

        {/* Right Column (Billing History & Details) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div
            className="animate-fade-up-delay-3 rounded-3xl p-8 flex-1 flex flex-col"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">
                Invoices
              </h2>
            </div>

            {invoicesLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 w-full bg-[var(--surface)] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[var(--border-accent)] rounded-2xl bg-[var(--surface)] opacity-70">
                <svg className="w-8 h-8 mb-3 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
                  No billing history found.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {invoices.map((invoice, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center justify-between p-4 rounded-2xl transition-all hover:shadow-sm"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-accent)',
                    }}
                  >
                    <div className="flex flex-col gap-1 z-10">
                      <span className="text-sm font-bold font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">
                        {formatCurrency(invoice.amount)}
                      </span>
                      <span className="text-xs font-medium font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)]">
                        {formatDate(invoice.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 z-10">
                      {invoice.status && (
                        <span
                          className="text-[10px] uppercase font-bold tracking-wider rounded-md px-2 py-1"
                          style={{
                            color: invoice.status === 'paid' ? BRAND.GREEN : 'var(--text-muted)',
                            background: invoice.status === 'paid' ? `${BRAND.GREEN}15` : 'var(--surface-elevated)',
                          }}
                        >
                          {invoice.status}
                        </span>
                      )}
                      
                      {invoice.url && (
                        <a
                          href={invoice.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-brand-orange hover:border-brand-orange transition-colors"
                          title="View Receipt"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
