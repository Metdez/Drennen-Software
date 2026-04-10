/**
 * GET /api/analytics/themes
 *
 * Provides theme frequency counts for the authenticated professor, optionally
 * filtered to a semester. Returns `{ themes: ThemeFrequencyRow[] }` sorted by
 * occurrence so the UI can highlight recurring topics.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getThemeFrequency } from '@/lib/db/themes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/themes
 *
 * Returns theme frequency data across all (or a filtered subset of) sessions
 * for the authenticated professor. Used by the cross-session theme analysis
 * page to visualise which topics recur most often.
 *
 * @param request - GET request. Optional query param:
 *   - `semester` (string UUID) — filter to sessions in a specific semester.
 *     Omit to aggregate across all sessions.
 * @returns 200 `{ themes: ThemeFrequencyRow[] }` — each row has a theme title
 *   and a count of how many sessions it appeared in, sorted by frequency
 *   descending (ordering determined by `getThemeFrequency()`).
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - Data comes from the `session_themes` table, populated during session
 *   creation in `/api/process`.
 * @see {@link lib/db/themes.ts} getThemeFrequency
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const semesterId = searchParams.get('semester') || undefined

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // getThemeFrequency() enforces RLS, so professors only see their own sessions.
  const themes = await getThemeFrequency(user.id, semesterId)
  return NextResponse.json({ themes })
}
