import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getClassInsights } from '@/lib/db/classInsights'
import { generateSpeakerRecommendations } from '@/lib/ai/speakerRecommendations'

/**
 * Controls Next.js caching behavior for this API route.
 *
 * It is used to ensure that this route is always executed dynamically at request time, preventing caching of potentially stale recommendations or user-specific data.
 *
 * Set to 'force-dynamic' to opt out of static rendering and data caching. This is crucial for real-time analytics and user-specific recommendations that should not be cached or pre-rendered.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/recommendations
 *
 * Returns AI-generated speaker recommendations for the authenticated professor
 * based on their class's engagement patterns and recurring themes.
 *
 * Recommendations are stored as a field on the `class_insights` row. If they
 * are absent — e.g. after an older `generateClassInsights` run that predates
 * the recommendations feature — this handler regenerates them synchronously as
 * a one-time recovery before responding.
 *
 * @param request - GET request. Optional query param:
 *   - `semester` (string UUID) — scope recommendations to a specific semester.
 * @returns 200 `{ recommendations: SpeakerRecommendations | null }`.
 *   `null` is returned when no sessions exist or generation fails.
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - Reads from `class_insights` via `getClassInsights()`; regenerates via
 *   `generateSpeakerRecommendations()` only when `speakerRecommendations` is
 *   absent. This avoids unnecessary Gemini calls on every request.
 * - Fallback generation errors are caught and logged; the route still returns
 *   `{ recommendations: null }` rather than a 500.
 * @see {@link lib/db/classInsights.ts} getClassInsights
 * @see {@link lib/ai/speakerRecommendations.ts} generateSpeakerRecommendations
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const semesterId = searchParams.get('semester') || undefined

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let insights = await getClassInsights(user.id, semesterId)

  // Fallback: regenerate only the recommendations field if it is absent.
  // This handles older class_insights rows written before this feature existed.
  if (!insights?.speakerRecommendations) {
    try {
      await generateSpeakerRecommendations(user.id, semesterId)
      insights = await getClassInsights(user.id, semesterId)
    } catch (e) {
      console.error('[/api/analytics/recommendations] fallback generation failed:', e)
    }
  }

  return NextResponse.json({ recommendations: insights?.speakerRecommendations ?? null })
}
