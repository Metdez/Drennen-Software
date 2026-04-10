import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubscriptionProfile } from '@/lib/db/subscription'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stripe/invoices
 *
 * Returns the authenticated professor's billing history from Stripe (up to the
 * most recent 24 invoices). Displayed on the `/account` page billing history section.
 *
 * @returns `{ invoices: Invoice[] }` — each invoice contains:
 *   - `date` (ISO string) — converted from Stripe's Unix timestamp
 *   - `amount` (number, in dollars) — converted from Stripe cents
 *   - `status` — Stripe invoice status (`paid`, `open`, `void`, etc.)
 *   - `url` — Stripe-hosted invoice page URL for view/print
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Returns 400 if the professor has no `stripeCustomerId` (has never checked out).
 *   - On Stripe API error, returns `{ error, invoices: [] }` with status 500 so the
 *     UI can still render with an empty list rather than crashing.
 *   - Amounts are converted from cents to dollars client-side (divide by 100).
 * @see {@link lib/db/subscription.ts} — `getSubscriptionProfile()`
 * @see {@link lib/stripe/index.ts} — `getStripe()`
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getSubscriptionProfile(user.id)
  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  try {
    // Fetch the most recent 24 invoices — sufficient for the account page history view
    const stripeInvoices = await getStripe().invoices.list({
      customer: profile.stripeCustomerId,
      limit: 24,
    })

    // Transform to a simplified shape for the client (no raw Stripe objects)
    const invoices = stripeInvoices.data.map((invoice) => ({
      // Convert Unix timestamp (seconds) to ISO string
      date: new Date(invoice.created * 1000).toISOString(),
      // Stripe amounts are in cents — convert to dollars
      amount: (invoice.amount_paid ?? 0) / 100,
      status: invoice.status,
      url: invoice.hosted_invoice_url,
    }))

    return NextResponse.json({ invoices })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch invoices'
    console.error('Stripe invoices error:', message)
    // Return invoices: [] so the UI can still render gracefully on error
    return NextResponse.json({ error: message, invoices: [] }, { status: 500 })
  }
}
