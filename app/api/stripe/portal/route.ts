import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubscriptionProfile } from '@/lib/db/subscription'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * POST /api/stripe/portal
 *
 * Creates a Stripe Billing Portal session and returns the hosted URL. The professor
 * is redirected to Stripe's self-service portal where they can update payment methods,
 * view invoices, change plans, or cancel their subscription. After portal actions,
 * Stripe redirects back to `/account`.
 *
 * @param request - No body required; origin header is read to construct the return URL.
 * @returns `{ url: string }` — the Stripe-hosted billing portal URL. The client should
 *   redirect the browser to this URL (not open it in an iframe).
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Returns 400 if the professor has no `stripeCustomerId` (has never checked out;
 *     the portal cannot be opened without an existing Stripe Customer).
 *   - The `return_url` is constructed from the `Origin` header, falling back to
 *     `NEXT_PUBLIC_SITE_URL` then `localhost:3000`.
 * @see {@link lib/db/subscription.ts} — `getSubscriptionProfile()`
 * @see {@link lib/stripe/index.ts} — `getStripe()`
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await getSubscriptionProfile(user.id)
  // A customer ID is required to open the portal — it's only set after checkout
  if (!profile?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  // Build the return URL dynamically so it works in dev and production
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      // After portal actions, Stripe returns the user to /account
      return_url: `${origin}/account`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe portal session failed'
    console.error('Stripe portal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
