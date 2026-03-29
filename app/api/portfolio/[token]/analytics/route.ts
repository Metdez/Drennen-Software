import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioAnalytics } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    const analytics = await getPortfolioAnalytics(share)
    return NextResponse.json(analytics)
  } catch (err) {
    console.error('[/api/portfolio/[token]/analytics GET]', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}
