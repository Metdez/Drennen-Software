import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubscriptionProfile } from '@/lib/db/subscription'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getSubscriptionProfile(user.id)
  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/account`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe portal session failed'
    console.error('Stripe portal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
