import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSubscriptionProfile, updateStripeCustomerId, updateSubscriptionFromWebhook } from '@/lib/db/subscription'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stripe/checkout?session_id=cs_xxx
 *
 * Verifies a completed Stripe Checkout session and syncs subscription status to the
 * `profiles` table. Called client-side after the professor returns from the Stripe
 * hosted checkout page. Acts as a fast-path sync so the UI shows subscribed state
 * immediately, particularly in local dev where webhooks cannot reach localhost.
 *
 * @param request - Query param: `?session_id=cs_xxx` — Stripe Checkout Session ID.
 * @returns
 *   - `{ status: "synced", subscriptionStatus: string }` — paid and DB updated.
 *   - `{ status: "not_paid", paymentStatus: string }` — payment not confirmed.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Ownership check: the Stripe session customer must match the user's stored
 *     `stripeCustomerId`. Returns 403 on mismatch.
 *   - Only writes to the DB when `payment_status === 'paid'` and a subscription ID
 *     is present on the checkout session.
 * @see {@link lib/db/subscription.ts} - `getSubscriptionProfile()`, `updateSubscriptionFromWebhook()`
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)

    // Verify this session belongs to the requesting user
    const profile = await getSubscriptionProfile(user.id)
    if (session.customer !== profile?.stripeCustomerId) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    if (session.payment_status === 'paid' && session.subscription) {
      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string)
      const firstItem = subscription.items.data[0]

      await updateSubscriptionFromWebhook(session.customer as string, {
        subscriptionStatus: subscription.status === 'active' || subscription.status === 'trialing' ? subscription.status : 'active',
        stripeSubscriptionId: subscription.id,
        subscriptionPriceId: firstItem?.price?.id ?? undefined,
        subscriptionCurrentPeriodEnd: firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : undefined,
      })

      return NextResponse.json({ status: 'synced', subscriptionStatus: subscription.status })
    }

    return NextResponse.json({ status: 'not_paid', paymentStatus: session.payment_status })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed'
    console.error('Checkout verification error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const plan: string | undefined = body.plan
  const rawPriceId: string | undefined = body.priceId

  const priceId = plan
    ? plan === 'annual'
      ? process.env.STRIPE_PRICE_ANNUAL
      : process.env.STRIPE_PRICE_MONTHLY
    : rawPriceId

  if (!priceId) {
    return NextResponse.json({ error: 'Missing plan or priceId' }, { status: 400 })
  }

  const profile = await getSubscriptionProfile(user.id)

  let customerId = profile?.stripeCustomerId
  try {
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await updateStripeCustomerId(user.id, customerId)
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?checkout=canceled`,
      metadata: { supabase_user_id: user.id },
    })

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL' }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stripe checkout failed'
    console.error('Stripe checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
