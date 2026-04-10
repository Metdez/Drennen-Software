import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioAnalytics } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio/[token]/analytics
 *
 * Returns aggregated analytics data (session trends, student participation,
 * question quality metrics) for a public portfolio share. Only accessible
 * when the portfolio has `config.includeAnalytics = true`.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Portfolio share token.
 * @returns Analytics payload (shape mirrors `GET /api/analytics` but scoped to
 *   the portfolio owner's data). Exact structure is determined by
 *   `getPortfolioAnalytics`.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - `getPortfolioByToken` checks the `enabled` flag; disabled portfolios
 *     return 404.
 *   - `getPortfolioAnalytics` internally checks `share.config.includeAnalytics`
 *     and may return restricted data or throw if the section is disabled.
 * @see {@link lib/db/portfolioShares.ts} — `getPortfolioByToken()`, `getPortfolioAnalytics()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    // Resolve and validate the share token (also checks enabled flag)
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    const analytics = await getPortfolioAnalytics(share)
    return NextResponse.json(analytics)
  } catch (err) {
    console.error('[/api/portfolio/[token]/analytics GET]', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
