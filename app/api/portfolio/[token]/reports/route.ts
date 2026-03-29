import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioReports } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

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
