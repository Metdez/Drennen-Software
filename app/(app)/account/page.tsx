'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSubscription } from '@/components/SubscriptionContext'
import { PaywallModal } from '@/components/PaywallModal'
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
    canGenerate,
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
        label: 'Active',
        bg: BRAND.GREEN,
      }
    }
    if (isTrial) {
      return {
        label: `Trial${trialDaysRemaining !== null ? ` — ${trialDaysRemaining} days remaining` : ''}`,
        bg: BRAND.PURPLE,
      }
    }
    if (isInactive) {
      return {
        label: 'Inactive',
        bg: BRAND.ORANGE,
      }
    }
    return {
      label: subscriptionStatus || 'Unknown',
      bg: BRAND.ORANGE,
    }
  }

  const badge = getStatusBadge()
  const isSubscribed =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

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

  if (showPaywall) {
    return <PaywallModal reason={reason} />
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Page header */}
      <div className="animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          Account
        </h1>
        <div className="h-0.5 w-12 bg-brand-orange mb-3" />
      </div>

      {/* Subscription Status Card */}
      <div
        className="animate-fade-up-delay-1 rounded-xl p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-accent)',
        }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
          Subscription
        </h2>

        {subscriptionLoading ? (
          <p
            className="text-sm font-[family-name:var(--font-dm-sans)]"
            style={{ color: 'var(--text-muted)' }}
          >
            Loading...
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-semibold rounded-full px-3 py-1"
                style={{ backgroundColor: badge.bg, color: '#fff' }}
              >
                {badge.label}
              </span>
            </div>

            {/* Actions */}
            <div>
              {isSubscribed ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="text-sm font-medium rounded-xl px-5 py-2.5 transition-opacity hover:opacity-80 disabled:opacity-50 font-[family-name:var(--font-dm-sans)]"
                  style={{
                    color: BRAND.ORANGE,
                    border: `1px solid ${BRAND.ORANGE}44`,
                  }}
                >
                  {portalLoading ? 'Loading...' : 'Manage Billing'}
                </button>
              ) : (
                <button
                  onClick={() => setShowPaywall(true)}
                  className="text-sm font-semibold rounded-xl px-5 py-2.5 text-white transition-all duration-200 hover:bg-[#d85e18] font-[family-name:var(--font-dm-sans)]"
                  style={{ backgroundColor: BRAND.ORANGE }}
                >
                  Subscribe
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div
        className="animate-fade-up-delay-2 rounded-xl p-6"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-accent)',
        }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
          Billing History
        </h2>

        {invoicesLoading ? (
          <p
            className="text-sm font-[family-name:var(--font-dm-sans)]"
            style={{ color: 'var(--text-muted)' }}
          >
            Loading...
          </p>
        ) : invoices.length === 0 ? (
          <p
            className="text-sm font-[family-name:var(--font-dm-sans)]"
            style={{ color: 'var(--text-muted)' }}
          >
            No billing history yet.
          </p>
        ) : (
          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            {invoices.map((invoice, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-sm font-[family-name:var(--font-dm-sans)]"
                style={{
                  borderBottom:
                    i < invoices.length - 1 ? '1px solid var(--border)' : undefined,
                }}
              >
                <div className="flex items-center gap-4">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(invoice.date)}
                  </span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(invoice.amount)}
                  </span>
                  {invoice.status && (
                    <span
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{
                        color: invoice.status === 'paid' ? BRAND.GREEN : 'var(--text-muted)',
                        background:
                          invoice.status === 'paid'
                            ? `${BRAND.GREEN}15`
                            : 'var(--surface-elevated)',
                      }}
                    >
                      {invoice.status}
                    </span>
                  )}
                </div>
                {invoice.url && (
                  <a
                    href={invoice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline"
                    style={{ color: BRAND.ORANGE }}
                  >
                    View Receipt
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
