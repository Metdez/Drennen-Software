/**
 * GET /api/portfolio/[token]/sessions/[sessionId]
 *
 * Public endpoint that returns the full detail for a single session within
 * a portfolio share. No authentication required — the share token acts as
 * the credential. Used by the public portfolio session detail page.
 *
 * Auth: NONE — this is a fully public route
 *
 * Route params:
 *   - token (string) — the portfolio share token
 *   - sessionId (string) — UUID of the session to fetch
 *
 * Response (200): session detail object including the full AI output,
 *   themes, analysis, and other data as returned by getPortfolioSessionDetail()
 * Error responses:
 *   404 — token/portfolio not found, or session not found within this portfolio
 *   500 — unexpected error
 *
 * DB functions: getPortfolioByToken(), getPortfolioSessionDetail()
 *   in lib/db/portfolioShares.ts
 */
import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioSessionDetail } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/sessions/[sessionId]
 *
 * Returns the full detail of a single session within a public portfolio share,
 * including the AI-generated output, themes, and analysis data.
 *
 * @param _request - Not used; parameters come from the route segment.
 * @param params.token - Portfolio share token.
 * @param params.sessionId - UUID of the session to fetch.
 * @returns Full session detail object including the AI interview-sheet output,
 *   parsed themes, and any cached analysis. Similar to `GET /api/sessions/[id]`
 *   but stripped of professor-private fields.
 * @remarks
 *   - **Auth**: Public route. Token acts as the access credential.
 *   - Returns 404 for invalid token, disabled portfolio, or session not owned
 *     by the portfolio owner.
 * @see {@link lib/db/portfolioShares.ts} - `getPortfolioByToken()`, `getPortfolioSessionDetail()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string; sessionId: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    const detail = await getPortfolioSessionDetail(share, params.sessionId)
    if (!detail) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    return NextResponse.json(detail)
  } catch (err) {
    console.error('[/api/portfolio/[token]/sessions/[sessionId] GET]', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
