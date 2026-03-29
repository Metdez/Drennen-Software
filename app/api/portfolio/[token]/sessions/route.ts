import { NextResponse } from 'next/server'
import { getPortfolioByToken, getPortfolioSessions } from '@/lib/db/portfolioShares'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const share = await getPortfolioByToken(params.token)
    if (!share) return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 })

    const url = new URL(request.url)
    const semesterId = url.searchParams.get('semesterId') ?? undefined

    const sessions = await getPortfolioSessions(share, semesterId)
    return NextResponse.json({ sessions })
  } catch (err) {
    console.error('[/api/portfolio/[token]/sessions GET]', err)
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 })
  }
}
