import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioRoster } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/roster
 *
 * Returns the student participation roster for a public portfolio share.
 * Only accessible when `config.includeStudentProfiles = true` on the portfolio.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Portfolio share token.
 * @returns `{ students: StudentParticipationSummary[] }` — array of students with
 *   participation metrics (session count, submission count, growth signal, etc.).
 *   Professor-authored notes and follow-up flags are NOT included in public roster
 *   data — those remain private.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - Returns 404 when the token is invalid, the portfolio is disabled, or
 *     `config.includeStudentProfiles` is `false`.
 *   - The roster is scoped to sessions belonging to the portfolio owner; other
 *     professors' students are never exposed.
 * @see {@link lib/db/portfolioShares.ts} — `getPortfolioByToken()`, `getPortfolioRoster()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    // Guard: student profiles section must be explicitly enabled in the config
    if (!share.config.includeStudentProfiles) {
      return NextResponse.json({ error: 'Student profiles not included in this portfolio' }, { status: 404 })
    }

    const roster = await getPortfolioRoster(share)
    return NextResponse.json({ students: roster })
  } catch (err) {
    console.error('[/api/portfolio/[token]/roster GET]', err)
    return NextResponse.json({ error: 'Failed to load roster' }, { status: 500 })
  }
}
