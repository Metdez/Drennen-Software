/**
 * GET /api/portfolio/[token]/roster/[studentName]
 *
 * Public endpoint for fetching a single student's detail within a portfolio.
 * No authentication required — the share token acts as the credential.
 *
 * Auth: NONE — this is a fully public route
 *
 * Access gate: returns 404 if share.config.includeStudentProfiles is false.
 *
 * Route params:
 *   - token (string) — the portfolio share token
 *   - studentName (string) — URL-encoded student name (e.g. "Jane%20S.")
 *
 * Response (200): student detail object with profile, submissions, and growth data
 * Error responses:
 *   404 — token/portfolio not found, student profiles not in config,
 *          or student not found within this portfolio
 *   500 — unexpected error
 *
 * DB functions: getPortfolioByToken(), getPortfolioStudentDetail()
 *   in lib/db/portfolioShares.ts
 */
import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioStudentDetail } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/roster/[studentName]
 *
 * Returns the detailed profile for a single student within a public portfolio share.
 * Only accessible when `config.includeStudentProfiles = true` on the portfolio.
 *
 * @param _request - Not used; parameters come from the route segment.
 * @param params.token - Portfolio share token.
 * @param params.studentName - URL-encoded student name (e.g. `Jane%20S.`).
 * @returns Student detail object including AI profile, submissions, and growth data.
 *   Professor-authored private notes are excluded.
 * @remarks
 *   - **Auth**: Public route. Token acts as the access credential.
 *   - Returns 404 for invalid token, disabled portfolio, disabled profiles section,
 *     or a student that does not belong to this portfolio.
 * @see {@link lib/db/portfolioShares.ts} - `getPortfolioByToken()`, `getPortfolioStudentDetail()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string; studentName: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    if (!share.config.includeStudentProfiles) {
      return NextResponse.json({ error: 'Student profiles not included' }, { status: 404 })
    }

    // Decode the URL-encoded student name before passing to the DB query
    const studentName = decodeURIComponent(params.studentName)
    const detail = await getPortfolioStudentDetail(share, studentName)
    if (!detail) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    return NextResponse.json(detail)
  } catch (err) {
    console.error('[/api/portfolio/[token]/roster/[studentName] GET]', err)
    return NextResponse.json({ error: 'Failed to load student detail' }, { status: 500 })
  }
}
