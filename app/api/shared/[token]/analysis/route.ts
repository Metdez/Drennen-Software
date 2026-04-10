import { NextResponse } from 'next/server'
import { getSessionAnalysisByShareToken } from '@/lib/db/sessionShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shared/[token]/analysis
 *
 * Public endpoint that returns the Gemini analysis data (theme clusters,
 * tensions, suggestions, blind spots, sentiment) for a shared session.
 * Displayed on the Analysis tab of the `(public)/shared/[token]` page.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Session share token.
 * @returns The full `SessionAnalysis` object (same shape as `GET /api/sessions/[id]/analysis`),
 *   or `{ empty: true }` when no analysis has been generated yet for this session.
 *   Never returns a 404 for a missing analysis — `{ empty: true }` allows the UI to
 *   render a graceful "analysis not available" state.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - If the share token is invalid, `getSessionAnalysisByShareToken` returns `null`
 *     and the route returns `{ empty: true }` (same as "no analysis") — this avoids
 *     leaking whether a token is valid or simply has no analysis yet.
 * @see {@link lib/db/sessionShares.ts} — `getSessionAnalysisByShareToken()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const analysis = await getSessionAnalysisByShareToken(params.token)
    if (!analysis) {
      return NextResponse.json({ empty: true })
    }

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[/api/shared/[token]/analysis]', err)
    return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 })
  }
}
