import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioSessions } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/sessions
 *
 * Returns the list of sessions visible in a public portfolio share, optionally
 * filtered to a specific semester. Only accessible when
 * `config.includeSessions = true` on the portfolio.
 *
 * @param request - Accepts optional `?semesterId=<uuid>` query parameter to
 *   filter sessions to a single semester. Omit for all sessions.
 * @param params.token - Portfolio share token.
 * @returns `{ sessions: SessionSummary[] }` — array of session summaries
 *   (speaker name, date, file count) ordered by creation date descending.
 *   The full AI output is NOT included in the list view; use the
 *   `[sessionId]` sub-route for full session detail.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - Returns 404 when the token is invalid or the portfolio is disabled.
 *   - `getPortfolioSessions` internally enforces `config.includeSessions`;
 *     it may return an empty array or throw if the section is disabled,
 *     depending on implementation.
 * @see {@link lib/db/portfolioShares.ts} — `getPortfolioByToken()`, `getPortfolioSessions()`
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    // Optional semester filter — undefined fetches sessions across all semesters
    const url = new URL(request.url)
    const semesterId = url.searchParams.get('semesterId') ?? undefined

    const sessions = await getPortfolioSessions(share, semesterId)
    return NextResponse.json({ sessions })
  } catch (err) {
    console.error('[/api/portfolio/[token]/sessions GET]', err)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}
