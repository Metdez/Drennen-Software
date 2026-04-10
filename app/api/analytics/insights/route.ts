/**
 * GET /api/analytics/insights
 *
 * Serves the cached Gemini-generated class insights (strengths, tension points,
 * engagement signals, speaker recommendations) scoped to the requesting professor.
 * The handler regenerates insights synchronously if they are missing so the UI
 * never has to show an empty state, then returns `{ insights: ClassInsights | null }`.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getClassInsights } from '@/lib/db/classInsights'
import { generateClassInsights } from '@/lib/ai/classInsights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/insights
 *
 * Returns the cached Gemini-generated class insights for the authenticated
 * professor (cross-session analysis: class strengths, growth areas, engagement
 * patterns, curriculum suggestions, speaker recommendations).
 *
 * If no cached insights exist — which can happen when the fire-and-forget job
 * after session upload failed — this handler synchronously generates them as a
 * one-time fallback before responding.
 *
 * @param request - GET request. Optional query param:
 *   - `semester` (string UUID) — scope insights to a specific semester.
 * @returns 200 `{ insights: ClassInsights | null }`. `null` is returned when
 *   insights cannot be generated (e.g. no sessions exist yet).
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - Normally populated by the fire-and-forget `generateClassInsights()` call in
 *   `/api/process`. This route only regenerates synchronously as a recovery path.
 * - Fallback generation errors are caught and logged; the route still returns
 *   `{ insights: null }` rather than a 500, so the UI degrades gracefully.
 * @see {@link lib/db/classInsights.ts} getClassInsights
 * @see {@link lib/ai/classInsights.ts} generateClassInsights
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const semesterId = searchParams.get('semester') || undefined

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS in getClassInsights() already limits rows to the authenticated professor.
  let insights = await getClassInsights(user.id, semesterId)

  // Fallback: if the fire-and-forget job after /api/process failed or has not
  // run yet, generate insights synchronously so this request still returns data.
  if (!insights) {
    try {
      await generateClassInsights(user.id, semesterId)
      insights = await getClassInsights(user.id, semesterId)
    } catch (e) {
      console.error('[/api/analytics/insights] fallback generation failed:', e)
    }
  }

  return NextResponse.json({ insights })
}
