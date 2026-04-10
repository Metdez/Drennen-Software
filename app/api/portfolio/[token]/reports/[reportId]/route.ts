/**
 * GET /api/portfolio/[token]/reports/[reportId]
 *
 * Public endpoint that returns a single semester report within a portfolio.
 * No authentication required — the share token acts as the credential.
 *
 * Auth: NONE — this is a fully public route
 *
 * Access gate: returns 404 if share.config.includeReports is false.
 *
 * Route params:
 *   - token (string) — the portfolio share token
 *   - reportId (string) — UUID of the semester_reports row to fetch
 *
 * Response (200): the report object (SemesterReport)
 * Error responses:
 *   404 — token/portfolio not found, reports not included in config,
 *          or reportId not found within this portfolio
 *   500 — unexpected error
 *
 * DB functions: getPortfolioByToken(), getPortfolioReportById()
 *   in lib/db/portfolioShares.ts
 */
import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioReportById } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/reports/[reportId]
 *
 * Returns the full content of a single semester report within a public portfolio share.
 * Both token and reportId must be valid, and `config.includeReports` must be `true`.
 *
 * @param _request - Not used; parameters come from the route segment.
 * @param params.token - Portfolio share token.
 * @param params.reportId - UUID of the semester report to fetch.
 * @returns The full `SemesterReport` object including JSONB content sections.
 * @remarks
 *   - **Auth**: Public route. Token acts as the access credential.
 *   - Returns 404 for invalid token, disabled portfolio, disabled reports section,
 *     or a report that does not belong to this portfolio.
 * @see {@link lib/db/portfolioShares.ts} - `getPortfolioByToken()`, `getPortfolioReportById()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string; reportId: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    if (!share.config.includeReports) {
      return NextResponse.json({ error: 'Reports not included' }, { status: 404 })
    }

    const report = await getPortfolioReportById(share, params.reportId)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    return NextResponse.json(report)
  } catch (err) {
    console.error('[/api/portfolio/[token]/reports/[reportId] GET]', err)
    return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
  }
}
