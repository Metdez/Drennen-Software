import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioLanding } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]
 *
 * Public entry point for a portfolio share. Resolves the share token, verifies
 * that the portfolio is enabled, and returns the landing-page summary data
 * (semester list, session list, aggregate counts, date range, and section
 * visibility flags).
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Portfolio share token from the URL path.
 * @returns Landing page payload:
 *   ```json
 *   {
 *     "semesters": [...],
 *     "sessions": [...],
 *     "totalStudents": 42,
 *     "totalSubmissions": 187,
 *     "dateRange": { "start": "2025-01-15", "end": "2025-12-10" },
 *     "sections": { "includeAnalytics": true, "includeReports": false, ... }
 *   }
 *   ```
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential. Returns 404 for invalid or disabled tokens.
 *   - `getPortfolioByToken` checks both token validity and the `enabled` flag.
 *   - `sections` mirrors the `PortfolioConfig` stored with the share and drives
 *     which navigation links are shown on the public portfolio.
 * @see {@link lib/db/portfolioShares.ts} — `getPortfolioByToken()`, `getPortfolioLanding()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Validate token and check that the portfolio is enabled
    const share = await getPortfolioByToken(params.token)
    if (!share) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })
    }

    const landing = await getPortfolioLanding(share)

    return NextResponse.json({
      semesters: landing.semesters,
      sessions: landing.sessions,
      totalStudents: landing.totalStudents,
      totalSubmissions: landing.totalSubmissions,
      dateRange: landing.dateRange,
      sections: landing.sections,
    })
  } catch (err) {
    console.error('[/api/portfolio/[token] GET]', err)
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}
