import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioRoster } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

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
