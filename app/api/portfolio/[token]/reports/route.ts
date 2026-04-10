/**
 * GET /api/portfolio/[token]/reports
 *
 * Public endpoint that returns the list of semester reports for a portfolio.
 * No authentication required — the share token acts as the credential.
 *
 * Auth: NONE — this is a fully public route
 *
 * Access gate: returns 404 if share.config.includeReports is false,
 *   respecting the professor's choice to keep reports private in this portfolio.
 *
 * Route params:
 *   - token (string) — the portfolio share token
 *
 * Response (200): { reports: SemesterReport[] }
 * Error responses:
 *   404 — token not found, portfolio disabled, or reports not included in config
 *   500 — unexpected error
 *
 * DB functions: getPortfolioByToken(), getPortfolioReports() in lib/db/portfolioShares.ts
 */
import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioReports } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/reports
 *
 * Returns the list of semester reports visible in a public portfolio share.
 * Only accessible when `config.includeReports = true` on the portfolio.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Portfolio share token.
 * @returns `{ reports: SemesterReport[] }` array of semester report summaries.
 * @remarks
 *   - **Auth**: Public route. Token acts as the access credential.
 *   - Returns 404 when token is invalid, portfolio disabled, or `includeReports` is false.
 *   - Full content fetched separately via `GET /api/portfolio/[token]/reports/[reportId]`.
 * @see {@link lib/db/portfolioShares.ts} - `getPortfolioByToken()`, `getPortfolioReports()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    if (!share.config.includeReports) {
      return NextResponse.json({ error: 'Reports not included in this portfolio' }, { status: 404 })
    }

    const reports = await getPortfolioReports(share)
    return NextResponse.json({ reports })
  } catch (err) {
    console.error('[/api/portfolio/[token]/reports GET]', err)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
