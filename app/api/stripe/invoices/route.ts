import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubscriptionProfile } from '@/lib/db/subscription'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

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
    const stripeInvoices = await getStripe().invoices.list({
      customer: profile.stripeCustomerId,
      limit: 24,
    })

    const invoices = stripeInvoices.data.map((invoice) => ({
      date: new Date(invoice.created * 1000).toISOString(),
      amount: (invoice.amount_paid ?? 0) / 100,
      status: invoice.status,
      url: invoice.hosted_invoice_url,
    }))

    return NextResponse.json({ invoices })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch invoices'
    console.error('Stripe invoices error:', message)
    return NextResponse.json({ error: message, invoices: [] }, { status: 500 })
  }
}
