import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { checkSubscriptionAccess } from '@/lib/db/subscription'

export const dynamic = 'force-dynamic'

/**
 * GET /api/subscription
 *
 * Returns the authenticated professor's subscription access state. Used by the
 * `SubscriptionContext` and by the dashboard upload form to determine whether the
 * professor can generate a new session.
 *
 * @returns `{ ...SubscriptionAccess }` — the shape returned by `checkSubscriptionAccess()`,
 *   which includes:
 *   - `canGenerate` (boolean) — whether the professor can process a new upload
 *   - `reason` (string) — human-readable explanation when `canGenerate` is false
 *   - `freeSessionsRemaining` (number | null) — remaining free sessions (during trial)
 *   - `subscriptionStatus` (string) — `active`, `past_due`, `canceled`, `trialing`, etc.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Read-only — no side effects. Subscription status changes are driven by Stripe
 *     webhooks, not by this endpoint.
 *   - RLS: `checkSubscriptionAccess` reads only rows owned by `user.id`; a professor
 *     cannot observe another professor's subscription state.
 * @see {@link lib/db/subscription.ts} — `checkSubscriptionAccess()`
 */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await checkSubscriptionAccess(user.id)
  return NextResponse.json(access)
}
