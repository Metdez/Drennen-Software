/**
 * @file app/api/analytics/route.ts
 *
 * Route: GET /api/analytics
 *
 * Returns aggregated analytics data for the authenticated professor's sessions.
 * Powers the Class Intelligence Report on `/analytics`.
 *
 * Data returned (all scoped to the requesting professor):
 *   - Submission trend over time (for the trend chart)
 *   - Student participation leaderboard (top submitters)
 *   - Drop-off analysis: students who submitted fewer times over sessions
 *
 * Auth:         Required — 401 if not logged in.
 * Query params: `?semester=<uuid>` — optional; filters results to a specific
 *               semester. Omit to aggregate across all semesters.
 * DB calls:     getCurrentUser(), getAnalytics() from lib/db/analytics.ts
 * AI calls:     None (AI class insights are at GET /api/analytics/insights)
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getAnalytics } from '@/lib/db/analytics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics
 *
 * Returns aggregated analytics data for the authenticated professor's sessions:
 * submission trends over time, a student participation leaderboard, and
 * drop-off analysis across sessions.
 *
 * @param request - GET request. Optional query param:
 *   - `semester` (string UUID) — filter results to a specific semester.
 *     Omit to aggregate across all semesters.
 * @returns 200 `{ sessions, leaderboard, dropOff, ... }` — shape defined by
 *   `getAnalytics()` in `lib/db/analytics.ts`.
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - All data is scoped to `user.id` — professors only see their own data.
 * @see {@link lib/db/analytics.ts} getAnalytics
 * @see {@link lib/db/users.ts} getCurrentUser
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    // Optional: scope results to a single semester by UUID
    const semesterId = searchParams.get('semester') || undefined

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getAnalytics(user.id, semesterId)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[/api/analytics]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
